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
  "/stock/material-issues",
  requireAnyPermission("material_issue.create"),
  async (req, res) => {
    try {
      const input = issueInput.parse(req.body);
      const result = await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT id FROM stock_balances WHERE id = ${input.stockBalanceId} FOR UPDATE`,
        );
        const balance = (
          await tx
            .select()
            .from(stockBalances)
            .where(eq(stockBalances.id, input.stockBalanceId))
        )[0];
        if (!balance) throw new Error("Stock balance not found");
        const batch = (
          await tx
            .select()
            .from(batchLots)
            .where(eq(batchLots.id, balance.batchLotId))
        )[0];
        if (!batch || batch.qualityStatus !== "released")
          throw new Error(
            "Stock is not released by Quality and cannot be issued.",
          );
        const production = input.productionOrderId
          ? (
              await tx
                .select()
                .from(productionOrders)
                .where(eq(productionOrders.id, input.productionOrderId))
            )[0]
          : undefined;
        if (input.productionOrderId && !production)
          throw new Error("Production order not found");
        if (
          production &&
          !["released", "in_progress"].includes(production.status)
        )
          throw new Error("Production order must be released or in progress");
        const requested = toMilli(input.quantity);
        const onHand = toMilli(balance.quantityOnHand);
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
        const available = onHand > reserved ? onHand - reserved : 0n;
        if (available < requested)
          throw new Error(
            `Insufficient available stock. Available ${fromMilli(available)} ${balance.unit}; reserved ${fromMilli(reserved)} ${balance.unit}.`,
          );
        const next = onHand - requested;
        await tx
          .update(stockBalances)
          .set({ quantityOnHand: fromMilli(next), updatedAt: new Date() })
          .where(eq(stockBalances.id, balance.id));
        await tx.insert(stockTransactions).values({
          transactionNumber: `MI-${crypto.randomUUID()}`,
          transactionType: "material_issue",
          materialCode: balance.materialCode,
          batchLotId: balance.batchLotId,
          warehouseId: balance.warehouseId,
          locationId: balance.locationId,
          quantityIn: "0",
          quantityOut: input.quantity,
          unit: balance.unit,
          referenceType: production ? "production_order" : "material_issue",
          referenceId: production?.id ?? null,
          createdByUserId: res.locals.user?.id,
        });
        if (production) {
          const existing = await tx
            .select()
            .from(productionMaterialIssues)
            .where(
              eq(productionMaterialIssues.productionOrderId, production.id),
            );
          await tx.insert(productionMaterialIssues).values({
            productionOrderId: production.id,
            lineNumber: existing.length + 1,
            materialCode: balance.materialCode,
            batchLotId: balance.batchLotId,
            locationId: balance.locationId,
            quantity: input.quantity,
            unit: balance.unit,
          });
          if (production.status === "released")
            await tx
              .update(productionOrders)
              .set({ status: "in_progress", updatedAt: new Date() })
              .where(eq(productionOrders.id, production.id));
        }
        await tx.insert(auditLogs).values({
          actorUserId: res.locals.user?.id,
          action: "material_issue_post",
          entityType: "stock_balance",
          entityId: balance.id,
          afterData: {
            requestedQuantity: input.quantity,
            remainingQuantity: fromMilli(next),
          },
        });
        return {
          stockBalanceId: balance.id,
          materialCode: balance.materialCode,
          batchLotId: balance.batchLotId,
          issuedQuantity: input.quantity,
          remainingQuantity: fromMilli(next),
          unit: balance.unit,
        };
      });
      return res.status(201).json(result);
    } catch (error) {
      return sendApiError(req, res, error);
    }
  },
);

// Posted stock movements are corrected through an immutable counter-entry,
// never through a delete. The original movement lock also makes this idempotent
// under concurrent reversal requests.

export default router;
