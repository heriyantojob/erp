import { Router } from "express";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/setup";
import { sendApiError } from "@/lib/api-i18n";
import { requireAnyPermission } from "@/middleware/auth/authorizationMiddleware";
import {
  auditLogs,
  batchLots,
  customers,
  deliveryHeaders,
  deliveryLines,
  finishedGoodsReceipts,
  goodsReceiptHeaders,
  goodsReceiptLines,
  locations,
  materials,
  productionOrders,
  purchaseOrders,
  purchaseRequisitions,
  qualityInspections,
  salesOrders,
  stockBalances,
  stockReservations,
  stockTransactions,
  warehouses,
} from "@/db/schema";

const router = Router();
const code = z.string().trim().min(1).max(50);
const qty = z.coerce
  .string()
  .regex(/^\d+(?:\.\d{1,3})?$/)
  .refine((v) => Number(v) > 0, "Quantity must be greater than zero");
const date = z.string().date().nullable().optional();
const reason = z.string().trim().min(3).max(500);
const prInput = z.object({
  requisitionNumber: code,
  materialCode: code,
  quantity: qty,
  unit: z.string().trim().min(1).max(30),
  neededAt: date,
  notes: z.string().trim().max(1000).nullable().optional(),
});
const poInput = z.object({
  orderNumber: code,
  requisitionId: z.string().uuid().nullable().optional(),
  supplierCode: code.nullable().optional(),
  materialCode: code,
  quantity: qty,
  unit: z.string().trim().min(1).max(30),
  expectedAt: date,
});
const poStatus = z.object({
  status: z.enum(["approved", "cancelled"]),
  reason: reason.optional(),
});
const qaInput = z.object({
  status: z.enum(["released", "rejected"]),
  result: reason,
});
const productionInput = z.object({
  orderNumber: code,
  finishedMaterialCode: code,
  plannedQuantity: qty,
  unit: z.string().trim().min(1).max(30),
  plannedAt: date,
});
const fgInput = z.object({
  productionOrderId: z.string().uuid(),
  batchNumber: z.string().trim().min(1).max(100),
  quantity: qty,
  unit: z.string().trim().min(1).max(30),
});
const salesInput = z.object({
  orderNumber: code,
  customerCode: code.nullable().optional(),
  materialCode: code,
  quantity: qty,
  unit: z.string().trim().min(1).max(30),
  requestedAt: date,
  stockBalanceId: z.string().uuid(),
});
const deliveryInput = z.object({
  deliveryNumber: code,
  salesOrderId: z.string().uuid(),
  deliveredAt: z.string().date(),
});
function milli(v: string) {
  const [w = "0", f = ""] = String(v).split(".");
  return BigInt(w) * 1000n + BigInt(f.padEnd(3, "0"));
}
function dec(v: bigint) {
  const w = v / 1000n,
    f = (v % 1000n).toString().padStart(3, "0").replace(/0+$/, "");
  return f ? `${w}.${f}` : String(w);
}
async function storage(tx: any, codeValue: string, name: string) {
  let w = (
    await tx.select().from(warehouses).where(eq(warehouses.code, codeValue))
  )[0];
  if (!w)
    w = (
      await tx.insert(warehouses).values({ code: codeValue, name }).returning()
    )[0];
  let l = (
    await tx
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.warehouseId, w.id),
          eq(locations.code, `${codeValue}-01`),
        ),
      )
  )[0];
  if (!l)
    l = (
      await tx
        .insert(locations)
        .values({
          warehouseId: w.id,
          code: `${codeValue}-01`,
          name: `${name} Storage`,
        })
        .returning()
    )[0];
  return { w, l };
}
async function audit(
  tx: any,
  res: any,
  action: string,
  type: string,
  id: string,
  data: any,
) {
  await tx.insert(auditLogs).values({
    actorUserId: res.locals.user?.id,
    action,
    entityType: type,
    entityId: id,
    afterData: data,
  });
}

router.get(
  "/process/sales-orders",
  requireAnyPermission("sales_order.manage", "stock.view"),
  async (_req, res) =>
    res.json(
      await db
        .select()
        .from(salesOrders)
        .where(isNull(salesOrders.deletedAt))
        .orderBy(desc(salesOrders.createdAt)),
    ),
);
router.post(
  "/process/sales-orders",
  requireAnyPermission("sales_order.manage"),
  async (req, res) => {
    try {
      const x = salesInput.parse(req.body);
      const row = await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT id FROM stock_balances WHERE id=${x.stockBalanceId} FOR UPDATE`,
        );
        const bal = (
          await tx
            .select()
            .from(stockBalances)
            .where(eq(stockBalances.id, x.stockBalanceId))
        )[0];
        if (!bal) throw new Error("Stock balance not found");
        const batch = (
          await tx
            .select()
            .from(batchLots)
            .where(eq(batchLots.id, bal.batchLotId))
        )[0];
        if (batch?.qualityStatus !== "released")
          throw new Error("Only released stock can be reserved for sales");
        const active = await tx
          .select({ q: stockReservations.quantity })
          .from(stockReservations)
          .where(
            and(
              eq(stockReservations.stockBalanceId, bal.id),
              eq(stockReservations.status, "active"),
            ),
          );
        const reserved = active.reduce((a, b) => a + milli(String(b.q)), 0n);
        const requested = milli(x.quantity);
        const onhand = milli(String(bal.quantityOnHand));
        if (onhand - reserved < requested)
          throw new Error(
            `Insufficient available stock. Available ${dec(onhand - reserved)} ${bal.unit}.`,
          );
        const reservation = (
          await tx
            .insert(stockReservations)
            .values({
              reservationNumber: `SO-RSV-${crypto.randomUUID()}`,
              stockBalanceId: bal.id,
              quantity: x.quantity,
              unit: bal.unit,
              referenceType: "sales_order",
              referenceId: x.orderNumber,
              status: "active",
              createdByUserId: res.locals.user?.id,
            })
            .returning()
        )[0];
        if (!reservation) throw new Error("Stock reservation was not created.");
        const so = (
          await tx
            .insert(salesOrders)
            .values({
              ...x,
              requestedAt: x.requestedAt ?? null,
              customerCode: x.customerCode ?? null,
              reservationId: reservation.id,
              status: "confirmed",
              createdByUserId: res.locals.user?.id,
            })
            .returning()
        )[0];
        if (!so) throw new Error("Sales order was not created.");
        await audit(tx, res, "sales_order_confirm", "sales_order", so.id, so);
        return so;
      });
      return res.status(201).json(row);
    } catch (e) {
      return sendApiError(req, res, e);
    }
  },
);

export default router;
