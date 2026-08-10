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
  "/process/production-orders",
  requireAnyPermission(
    "production_order.view",
    "production_order.create",
    "material_issue.create",
  ),
  async (_req, res) =>
    res.json(
      await db
        .select()
        .from(productionOrders)
        .where(isNull(productionOrders.deletedAt))
        .orderBy(desc(productionOrders.createdAt)),
    ),
);
router.post(
  "/process/production-orders",
  requireAnyPermission("production_order.create"),
  async (req, res) => {
    try {
      const x = productionInput.parse(req.body);
      const st = await db.transaction(async (tx) => {
        const { w } = await storage(tx, "PROD", "Production");
        const row = (
          await tx
            .insert(productionOrders)
            .values({
              ...x,
              plannedAt: x.plannedAt ?? null,
              warehouseId: w.id,
              status: "released",
              createdByUserId: res.locals.user?.id,
            })
            .returning()
        )[0];
        if (!row) throw new Error("Production order was not created.");
        await audit(
          tx,
          res,
          "production_order_create",
          "production_order",
          row.id,
          row,
        );
        return row;
      });
      return res.status(201).json(st);
    } catch (e) {
      return sendApiError(req, res, e);
    }
  },
);
router.post(
  "/process/production-orders/:id/start",
  requireAnyPermission("production.manage", "production_order.create"),
  async (req, res) => {
    try {
      const row = (
        await db
          .update(productionOrders)
          .set({ status: "in_progress", updatedAt: new Date() })
          .where(eq(productionOrders.id, String(req.params.id)))
          .returning()
      )[0];
      if (!row)
        return res.status(404).json({ message: "Production order not found" });
      await audit(db, res, "production_start", "production_order", row.id, row);
      res.json(row);
    } catch (e) {
      sendApiError(req, res, e);
    }
  },
);
router.post(
  "/process/production-orders/:id/complete",
  requireAnyPermission("production.manage", "production_order.create"),
  async (req, res) => {
    try {
      const row = (
        await db
          .update(productionOrders)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(productionOrders.id, String(req.params.id)))
          .returning()
      )[0];
      if (!row)
        return res.status(404).json({ message: "Production order not found" });
      await audit(
        db,
        res,
        "production_complete",
        "production_order",
        row.id,
        row,
      );
      res.json(row);
    } catch (e) {
      sendApiError(req, res, e);
    }
  },
);

export default router;
