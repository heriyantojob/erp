import { Router } from "express";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { sendApiError } from "@/lib/api-i18n";
import { db } from "@/db/setup";
import {
  auditLogs,
  batchLots,
  businessPartners,
  goodsReceiptHeaders,
  goodsReceiptLines,
  locations,
  materials,
  qualityInspections,
  purchaseOrders,
  productionMaterialIssues,
  productionOrders,
  stockBalances,
  stockReservations,
  stockTransactions,
  suppliers,
  warehouses,
} from "@/db/schema";
import { requireAnyPermission } from "@/middleware/auth/authorizationMiddleware";

const router = Router();
const quantity = z.coerce
  .string()
  .regex(/^\d+(?:\.\d{1,3})?$/)
  .refine((value) => Number(value) > 0, "Quantity must be greater than zero");
const receiptInput = z.object({
  receivedAt: z.string().date(),
  receiptNumber: z.string().trim().min(1).max(50),
  materialCode: z.string().trim().min(1).max(50),
  batchNumber: z.string().trim().min(1).max(100),
  expiryDate: z.string().date().nullable().optional(),
  quantity,
  unit: z.string().trim().min(1).max(30),
  purchaseOrderId: z.string().uuid().nullable().optional(),
});
const issueInput = z.object({
  stockBalanceId: z.string().uuid(),
  quantity,
  productionOrderId: z.string().uuid().nullable().optional(),
});
const reversalInput = z.object({ reason: z.string().trim().min(3).max(500) });
const reservationInput = z.object({
  stockBalanceId: z.string().uuid(),
  quantity,
  reservationNumber: z.string().trim().min(1).max(80).optional(),
  referenceType: z.string().trim().min(1).max(50).default("manual"),
  referenceId: z.string().trim().max(100).nullable().optional(),
});
const releaseReservationInput = z.object({
  reason: z.string().trim().min(3).max(500),
});

function toMilli(value: string) {
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, "0"));
}
function fromMilli(value: bigint) {
  const whole = value / 1000n;
  const fraction = (value % 1000n)
    .toString()
    .padStart(3, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

async function defaultStorage(tx: any) {
  let warehouse = (
    await tx.select().from(warehouses).where(eq(warehouses.code, "MAIN"))
  )[0];
  if (!warehouse)
    warehouse = (
      await tx
        .insert(warehouses)
        .values({ code: "MAIN", name: "Main Warehouse" })
        .returning()
    )[0];
  let location = (
    await tx
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.warehouseId, warehouse.id),
          eq(locations.code, "MAIN-01"),
        ),
      )
  )[0];
  if (!location)
    location = (
      await tx
        .insert(locations)
        .values({
          warehouseId: warehouse.id,
          code: "MAIN-01",
          name: "Main Storage",
        })
        .returning()
    )[0];
  return { warehouse, location };
}

const balanceQuery = () =>
  db
    .select({
      id: stockBalances.id,
      materialCode: stockBalances.materialCode,
      materialName: materials.name,
      batchLotId: batchLots.id,
      batchNumber: batchLots.batchNumber,
      receivedAt: batchLots.receivedAt,
      expiryDate: batchLots.expiryDate,
      qualityStatus: batchLots.qualityStatus,
      warehouseCode: warehouses.code,
      warehouseName: warehouses.name,
      locationCode: locations.code,
      locationName: locations.name,
      quantityOnHand: stockBalances.quantityOnHand,
      unit: stockBalances.unit,
    })
    .from(stockBalances)
    .innerJoin(materials, eq(stockBalances.materialCode, materials.code))
    .innerJoin(batchLots, eq(stockBalances.batchLotId, batchLots.id))
    .innerJoin(warehouses, eq(stockBalances.warehouseId, warehouses.id))
    .leftJoin(locations, eq(stockBalances.locationId, locations.id));

router.post(
  "/stock/transactions/:transactionNumber/reverse",
  requireAnyPermission("transaction.reverse"),
  async (req, res) => {
    try {
      const { reason } = reversalInput.parse(req.body);
      const transactionNumber = String(req.params.transactionNumber);
      const result = await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT id FROM stock_transactions WHERE transaction_number = ${transactionNumber} FOR UPDATE`,
        );
        const original = (
          await tx
            .select()
            .from(stockTransactions)
            .where(eq(stockTransactions.transactionNumber, transactionNumber))
        )[0];
        if (!original) throw new Error("Stock transaction not found");
        if (original.referenceType === "reversal")
          throw new Error("A reversal cannot be reversed");
        const existing = (
          await tx
            .select()
            .from(stockTransactions)
            .where(
              and(
                eq(stockTransactions.referenceType, "reversal"),
                eq(stockTransactions.referenceId, original.id),
              ),
            )
        )[0];
        if (existing)
          return {
            idempotent: true,
            transactionNumber: existing.transactionNumber,
          };
        if (!original.batchLotId)
          throw new Error(
            "Only batch-traceable stock transactions can be reversed",
          );

        await tx.execute(
          sql`SELECT id FROM stock_balances WHERE material_code = ${original.materialCode} AND batch_lot_id = ${original.batchLotId} AND warehouse_id = ${original.warehouseId} AND location_id IS NOT DISTINCT FROM ${original.locationId} FOR UPDATE`,
        );
        const balance = (
          await tx
            .select()
            .from(stockBalances)
            .where(
              and(
                eq(stockBalances.materialCode, original.materialCode),
                eq(stockBalances.batchLotId, original.batchLotId),
                eq(stockBalances.warehouseId, original.warehouseId),
                original.locationId
                  ? eq(stockBalances.locationId, original.locationId)
                  : sql`${stockBalances.locationId} IS NULL`,
              ),
            )
        )[0];
        if (!balance) throw new Error("Stock balance not found");

        const inbound = toMilli(original.quantityOut);
        const outbound = toMilli(original.quantityIn);
        const current = toMilli(balance.quantityOnHand);
        if (current < outbound)
          throw new Error(
            `Cannot reverse receipt: only ${fromMilli(current)} ${balance.unit} remains.`,
          );
        const next = current + inbound - outbound;
        const activeReservations = await tx
          .select({ quantity: stockReservations.quantity })
          .from(stockReservations)
          .where(
            and(
              eq(stockReservations.stockBalanceId, balance.id),
              eq(stockReservations.status, "active"),
            ),
          );
        const reserved = activeReservations.reduce(
          (sum, item) => sum + toMilli(String(item.quantity)),
          0n,
        );
        if (next < reserved)
          throw new Error(
            `Cannot reverse transaction while ${fromMilli(reserved)} ${balance.unit} is reserved. Release reservations first.`,
          );
        await tx
          .update(stockBalances)
          .set({ quantityOnHand: fromMilli(next), updatedAt: new Date() })
          .where(eq(stockBalances.id, balance.id));
        const reversal = (
          await tx
            .insert(stockTransactions)
            .values({
              transactionNumber: `RV-${crypto.randomUUID()}`,
              transactionType: "reversal",
              materialCode: original.materialCode,
              batchLotId: original.batchLotId,
              warehouseId: original.warehouseId,
              locationId: original.locationId,
              quantityIn: original.quantityOut,
              quantityOut: original.quantityIn,
              unit: original.unit,
              referenceType: "reversal",
              referenceId: original.id,
              createdByUserId: res.locals.user?.id,
            })
            .returning()
        )[0];
        if (!reversal) throw new Error("Failed to create reversal");
        await tx.insert(auditLogs).values({
          actorUserId: res.locals.user?.id,
          action: "stock_transaction_reverse",
          entityType: "stock_transaction",
          entityId: original.id,
          beforeData: original,
          afterData: {
            reversalTransactionNumber: reversal.transactionNumber,
            reason,
            resultingQuantity: fromMilli(next),
          },
        });
        return {
          idempotent: false,
          transactionNumber: reversal.transactionNumber,
          reversedTransactionNumber: original.transactionNumber,
          reason,
          resultingQuantity: fromMilli(next),
          unit: balance.unit,
        };
      });
      return res.status(result.idempotent ? 200 : 201).json(result);
    } catch (error) {
      return sendApiError(req, res, error);
    }
  },
);

export default router;
