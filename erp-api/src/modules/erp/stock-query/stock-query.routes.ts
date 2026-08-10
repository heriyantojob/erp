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
  "/stock/availability",
  requireAnyPermission("stock.view"),
  async (req, res) => {
    const materialCode =
      typeof req.query.materialCode === "string"
        ? req.query.materialCode
        : undefined;
    const rows = await balanceQuery()
      .where(
        materialCode
          ? and(
              eq(stockBalances.materialCode, materialCode),
              eq(batchLots.qualityStatus, "released"),
            )
          : eq(batchLots.qualityStatus, "released"),
      )
      .orderBy(asc(batchLots.receivedAt), asc(batchLots.batchNumber));
    const activeReservations = await db
      .select({
        stockBalanceId: stockReservations.stockBalanceId,
        quantity: stockReservations.quantity,
      })
      .from(stockReservations)
      .where(eq(stockReservations.status, "active"));
    const reservedByBalance = new Map<string, bigint>();
    for (const reservation of activeReservations) {
      const current = reservedByBalance.get(reservation.stockBalanceId) ?? 0n;
      reservedByBalance.set(
        reservation.stockBalanceId,
        current + toMilli(String(reservation.quantity)),
      );
    }
    return res.json(
      rows
        .map((row) => {
          const onHand = toMilli(String(row.quantityOnHand));
          const reserved = reservedByBalance.get(row.id) ?? 0n;
          const available = onHand > reserved ? onHand - reserved : 0n;
          return {
            ...row,
            reservedQuantity: fromMilli(reserved),
            availableQuantity: fromMilli(available),
          };
        })
        .filter(
          (row) =>
            Number(row.availableQuantity) > 0 ||
            Number(row.reservedQuantity) > 0,
        ),
    );
  },
);
router.get(
  "/stock/current-stock",
  requireAnyPermission("stock.view"),
  async (_req, res) =>
    res.json(
      await balanceQuery().orderBy(
        asc(materials.code),
        asc(batchLots.receivedAt),
        asc(batchLots.batchNumber),
      ),
    ),
);
router.get(
  "/stock/ledger",
  requireAnyPermission("stock_ledger.view"),
  async (_req, res) => {
    const rows = await db
      .select({
        transactionNumber: stockTransactions.transactionNumber,
        transactionType: stockTransactions.transactionType,
        transactionAt: stockTransactions.transactionAt,
        materialCode: stockTransactions.materialCode,
        materialName: materials.name,
        batchNumber: batchLots.batchNumber,
        quantityIn: stockTransactions.quantityIn,
        quantityOut: stockTransactions.quantityOut,
        unit: stockTransactions.unit,
        referenceType: stockTransactions.referenceType,
      })
      .from(stockTransactions)
      .innerJoin(materials, eq(stockTransactions.materialCode, materials.code))
      .leftJoin(batchLots, eq(stockTransactions.batchLotId, batchLots.id))
      .orderBy(desc(stockTransactions.transactionAt));
    return res.json(rows);
  },
);

export default router;
