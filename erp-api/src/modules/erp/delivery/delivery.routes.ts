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
  "/process/deliveries",
  requireAnyPermission("delivery.create", "stock.view"),
  async (_req, res) =>
    res.json(
      await db
        .select({
          id: deliveryHeaders.id,
          deliveryNumber: deliveryHeaders.deliveryNumber,
          deliveredAt: deliveryHeaders.deliveredAt,
          status: deliveryHeaders.status,
          salesOrderNumber: deliveryHeaders.salesOrderNumber,
          materialCode: deliveryLines.materialCode,
          quantity: deliveryLines.quantity,
          unit: deliveryLines.unit,
        })
        .from(deliveryHeaders)
        .leftJoin(
          deliveryLines,
          eq(deliveryLines.deliveryId, deliveryHeaders.id),
        )
        .where(isNull(deliveryHeaders.deletedAt))
        .orderBy(desc(deliveryHeaders.createdAt)),
    ),
);
router.post(
  "/process/deliveries",
  requireAnyPermission("delivery.create"),
  async (req, res) => {
    try {
      const x = deliveryInput.parse(req.body);
      const row = await db.transaction(async (tx) => {
        const so = (
          await tx
            .select()
            .from(salesOrders)
            .where(eq(salesOrders.id, x.salesOrderId))
        )[0];
        if (!so || !so.stockBalanceId || !so.reservationId)
          throw new Error("Confirmed sales order with reservation not found");
        if (so.status === "delivered")
          throw new Error("Sales order is already delivered");
        await tx.execute(
          sql`SELECT id FROM stock_balances WHERE id=${so.stockBalanceId} FOR UPDATE`,
        );
        const bal = (
          await tx
            .select()
            .from(stockBalances)
            .where(eq(stockBalances.id, so.stockBalanceId))
        )[0];
        if (!bal) throw new Error("Stock balance not found");
        const customerCode = so.customerCode ?? "WALK-IN";
        const existingCustomer = (
          await tx
            .select()
            .from(customers)
            .where(eq(customers.code, customerCode))
        )[0];
        if (!existingCustomer)
          await tx
            .insert(customers)
            .values({ code: customerCode, name: customerCode });
        const q = milli(String(so.quantity));
        const on = milli(String(bal.quantityOnHand));
        if (on < q) throw new Error("Insufficient physical stock for delivery");
        const header = (
          await tx
            .insert(deliveryHeaders)
            .values({
              deliveryNumber: x.deliveryNumber,
              deliveredAt: x.deliveredAt,
              customerCode,
              warehouseId: bal.warehouseId,
              status: "posted",
              salesOrderNumber: so.orderNumber,
              createdByUserId: res.locals.user?.id,
            })
            .returning()
        )[0];
        if (!header) throw new Error("Delivery header was not created.");
        await tx.insert(deliveryLines).values({
          deliveryId: header.id,
          lineNumber: 1,
          materialCode: so.materialCode,
          batchLotId: bal.batchLotId,
          locationId: bal.locationId,
          quantity: String(so.quantity),
          unit: so.unit,
        });
        await tx
          .update(stockBalances)
          .set({ quantityOnHand: dec(on - q), updatedAt: new Date() })
          .where(eq(stockBalances.id, bal.id));
        await tx
          .update(stockReservations)
          .set({
            status: "consumed",
            releasedAt: new Date(),
            releasedByUserId: res.locals.user?.id,
            releaseReason: "Consumed by customer delivery",
            updatedAt: new Date(),
          })
          .where(eq(stockReservations.id, so.reservationId));
        await tx
          .update(salesOrders)
          .set({ status: "delivered", updatedAt: new Date() })
          .where(eq(salesOrders.id, so.id));
        await tx.insert(stockTransactions).values({
          transactionNumber: `DL-${crypto.randomUUID()}`,
          transactionType: "customer_delivery",
          materialCode: so.materialCode,
          batchLotId: bal.batchLotId,
          warehouseId: bal.warehouseId,
          locationId: bal.locationId,
          quantityIn: "0",
          quantityOut: String(so.quantity),
          unit: so.unit,
          referenceType: "customer_delivery",
          referenceId: header.id,
          createdByUserId: res.locals.user?.id,
        });
        await audit(
          tx,
          res,
          "customer_delivery_post",
          "delivery",
          header.id,
          header,
        );
        return header;
      });
      return res.status(201).json(row);
    } catch (e) {
      return sendApiError(req, res, e);
    }
  },
);

export default router;
