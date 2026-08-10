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

router.get(
  "/stock/reservations",
  requireAnyPermission("stock.view"),
  async (req, res) => {
    const status =
      typeof req.query.status === "string" ? req.query.status : "active";
    const rows = await db
      .select({
        id: stockReservations.id,
        reservationNumber: stockReservations.reservationNumber,
        stockBalanceId: stockReservations.stockBalanceId,
        quantity: stockReservations.quantity,
        unit: stockReservations.unit,
        referenceType: stockReservations.referenceType,
        referenceId: stockReservations.referenceId,
        status: stockReservations.status,
        createdAt: stockReservations.createdAt,
        materialCode: stockBalances.materialCode,
        batchNumber: batchLots.batchNumber,
        warehouseCode: warehouses.code,
        locationCode: locations.code,
      })
      .from(stockReservations)
      .innerJoin(
        stockBalances,
        eq(stockReservations.stockBalanceId, stockBalances.id),
      )
      .innerJoin(batchLots, eq(stockBalances.batchLotId, batchLots.id))
      .innerJoin(warehouses, eq(stockBalances.warehouseId, warehouses.id))
      .leftJoin(locations, eq(stockBalances.locationId, locations.id))
      .where(eq(stockReservations.status, status))
      .orderBy(desc(stockReservations.createdAt));
    return res.json(rows);
  },
);
router.post(
  "/stock/reservations",
  requireAnyPermission("stock.reserve"),
  async (req, res) => {
    try {
      const input = reservationInput.parse(req.body);
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
        const active = await tx
          .select({ quantity: stockReservations.quantity })
          .from(stockReservations)
          .where(
            and(
              eq(stockReservations.stockBalanceId, balance.id),
              eq(stockReservations.status, "active"),
            ),
          );
        const reserved = active.reduce(
          (sum, item) => sum + toMilli(String(item.quantity)),
          0n,
        );
        const onHand = toMilli(String(balance.quantityOnHand));
        const requested = toMilli(input.quantity);
        const available = onHand > reserved ? onHand - reserved : 0n;
        if (requested > available)
          throw new Error(
            `Insufficient available stock. Available ${fromMilli(available)} ${balance.unit}.`,
          );
        const row = (
          await tx
            .insert(stockReservations)
            .values({
              reservationNumber:
                input.reservationNumber ?? `RSV-${crypto.randomUUID()}`,
              stockBalanceId: balance.id,
              quantity: input.quantity,
              unit: balance.unit,
              referenceType: input.referenceType,
              referenceId: input.referenceId ?? null,
              status: "active",
              createdByUserId: res.locals.user?.id,
            })
            .returning()
        )[0];
        if (!row) throw new Error("Reservation was not created");
        await tx.insert(auditLogs).values({
          actorUserId: res.locals.user?.id,
          action: "stock_reserve",
          entityType: "stock_reservation",
          entityId: row.id,
          afterData: row,
        });
        return {
          ...row,
          onHandQuantity: fromMilli(onHand),
          reservedQuantity: fromMilli(reserved + requested),
          availableQuantity: fromMilli(available - requested),
        };
      });
      return res.status(201).json(result);
    } catch (error) {
      return sendApiError(req, res, error);
    }
  },
);
router.post(
  "/stock/reservations/:id/release",
  requireAnyPermission("stock.reserve"),
  async (req, res) => {
    try {
      const { reason } = releaseReservationInput.parse(req.body);
      const id = String(req.params.id);
      const result = await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT id FROM stock_reservations WHERE id = ${id} FOR UPDATE`,
        );
        const before = (
          await tx
            .select()
            .from(stockReservations)
            .where(eq(stockReservations.id, id))
        )[0];
        if (!before) return null;
        if (before.status !== "active") return before;
        const row = (
          await tx
            .update(stockReservations)
            .set({
              status: "released",
              releasedAt: new Date(),
              releasedByUserId: res.locals.user?.id,
              releaseReason: reason,
              updatedAt: new Date(),
            })
            .where(eq(stockReservations.id, id))
            .returning()
        )[0];
        if (!row) return null;
        await tx.insert(auditLogs).values({
          actorUserId: res.locals.user?.id,
          action: "stock_reservation_release",
          entityType: "stock_reservation",
          entityId: row.id,
          beforeData: before,
          afterData: row,
        });
        return row;
      });
      return result
        ? res.json(result)
        : res.status(404).json({ message: "Reservation not found" });
    } catch (error) {
      return sendApiError(req, res, error);
    }
  },
);

export default router;
