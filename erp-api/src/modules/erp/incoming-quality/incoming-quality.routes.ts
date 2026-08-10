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
  "/process/incoming-quality",
  requireAnyPermission("quality.manage", "goods_receipt.view"),
  async (_req, res) => {
    const rows = await db
      .select({
        id: qualityInspections.id,
        receiptId: qualityInspections.receiptId,
        receiptNumber: goodsReceiptHeaders.receiptNumber,
        batchLotId: qualityInspections.batchLotId,
        batchNumber: batchLots.batchNumber,
        materialCode: batchLots.materialCode,
        quantity: goodsReceiptLines.quantity,
        unit: goodsReceiptLines.unit,
        status: qualityInspections.status,
        result: qualityInspections.result,
        inspectedAt: qualityInspections.inspectedAt,
      })
      .from(qualityInspections)
      .innerJoin(
        goodsReceiptHeaders,
        eq(qualityInspections.receiptId, goodsReceiptHeaders.id),
      )
      .innerJoin(batchLots, eq(qualityInspections.batchLotId, batchLots.id))
      .innerJoin(
        goodsReceiptLines,
        and(
          eq(goodsReceiptLines.receiptId, qualityInspections.receiptId),
          eq(goodsReceiptLines.batchLotId, qualityInspections.batchLotId),
        ),
      )
      .orderBy(desc(qualityInspections.createdAt));
    res.json(rows);
  },
);
router.post(
  "/process/incoming-quality/:id/inspect",
  requireAnyPermission("quality.manage", "transaction.approve"),
  async (req, res) => {
    try {
      const x = qaInput.parse(req.body);
      const result = await db.transaction(async (tx) => {
        const before = (
          await tx
            .select()
            .from(qualityInspections)
            .where(eq(qualityInspections.id, String(req.params.id)))
        )[0];
        if (!before) return null;
        const row = (
          await tx
            .update(qualityInspections)
            .set({
              status: x.status,
              result: x.result,
              inspectedByUserId: res.locals.user?.id,
              inspectedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(qualityInspections.id, before.id))
            .returning()
        )[0];
        if (!row) throw new Error("Quality inspection update failed.");
        await tx
          .update(batchLots)
          .set({ qualityStatus: x.status, updatedAt: new Date() })
          .where(eq(batchLots.id, before.batchLotId));
        await tx
          .update(goodsReceiptLines)
          .set({ qualityStatus: x.status })
          .where(
            and(
              eq(goodsReceiptLines.receiptId, before.receiptId),
              eq(goodsReceiptLines.batchLotId, before.batchLotId),
            ),
          );
        await audit(
          tx,
          res,
          "incoming_quality_inspect",
          "quality_inspection",
          row.id,
          row,
        );
        return row;
      });
      if (!result)
        return res
          .status(404)
          .json({ message: "Quality inspection not found" });
      return res.json(result);
    } catch (e) {
      return sendApiError(req, res, e);
    }
  },
);

export default router;
