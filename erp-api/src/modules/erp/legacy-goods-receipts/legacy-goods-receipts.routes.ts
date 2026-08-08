import { Router } from "express";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { sendApiError } from "@/lib/api-i18n";
import { db } from "@/db/setup";
import { auth } from "@/lib/better-auth/auth";
import { auditLogs, billOfMaterials, businessPartners, goodsReceipts, materials, roles, user, userRoles } from "@/db/schema";
import { allocateFifoForProduction, FifoAllocationError, fifoRequestInput } from "@/app/api/erp/fifoService";
import { getCurrentPermissions, requireAnyPermission } from "@/middleware/auth/authorizationMiddleware";

const router = Router();
const code = z.string().trim().min(1).max(50);
const text = z.string().trim().min(1).max(255);
const unit = z.string().trim().min(1).max(30);
const isoDate = z.string().date();
const quantity = z.coerce.number().positive().max(99_999_999_999);

const materialInput = z.object({ code, name: text, category: text, unit });
const partnerInput = z.object({ code, type: z.enum(["supplier", "customer"]), name: text });
const receiptInput = z.object({
  receivedAt: isoDate,
  receiptCode: code,
  materialCode: code,
  batchNumber: z.string().trim().min(1).max(100),
  expiryDate: isoDate.nullable().optional(),
  quantity,
  unit,
});
const bomInput = z.object({ materialCode: code, requiredQuantity: quantity, unit });
const roleAssignmentInput = z.object({ roleCodes: z.array(z.string().trim().min(1).max(100)).max(10) });
const softDeleteInput = z.object({ reason: z.string().trim().min(3).max(500).optional() });

type DbExecutor = Pick<typeof db, "insert">;

async function audit(executor: DbExecutor, res: any, action: string, entityType: string, entityId: string, beforeData?: unknown, afterData?: unknown) {
  try {
    await executor.insert(auditLogs).values({ actorUserId: res.locals.user?.id ?? null, action, entityType, entityId, beforeData, afterData, ipAddress: res.req?.ip });
  } catch (error) {
    // Audit failures must be visible in server logs, but must not turn an already
    // successful business operation into a misleading validation error response.
    console.error("[ERP audit] Failed to write audit log", { action, entityType, entityId, error });
  }
}

router.get("/goods-receipts", requireAnyPermission("goods_receipt.view"), async (_req, res) => res.json(await db.select().from(goodsReceipts).where(isNull(goodsReceipts.deletedAt)).orderBy(asc(goodsReceipts.receivedAt), asc(goodsReceipts.receiptCode))));
router.post("/goods-receipts", requireAnyPermission("goods_receipt.create"), async (req, res) => {
  try { const data = receiptInput.parse(req.body); const row = (await db.insert(goodsReceipts).values({ ...data, quantity: String(data.quantity), expiryDate: data.expiryDate ?? null }).returning())[0]; if (!row) throw new Error("Goods receipt was not created"); await audit(db, res, "create", "legacy_goods_receipt", row.id, undefined, row); return res.status(201).json(row); } catch (error) { return sendApiError(req, res, error); }
});
router.put("/goods-receipts/:id", requireAnyPermission("transaction.review"), async (req, res) => {
  try { const key = String(req.params.id); const data = receiptInput.parse(req.body); const before = (await db.select().from(goodsReceipts).where(and(eq(goodsReceipts.id, key), isNull(goodsReceipts.deletedAt))))[0]; const row = (await db.update(goodsReceipts).set({ ...data, quantity: String(data.quantity), expiryDate: data.expiryDate ?? null, updatedAt: new Date() }).where(and(eq(goodsReceipts.id, key), isNull(goodsReceipts.deletedAt))).returning())[0]; if (row) await audit(db, res, "update", "legacy_goods_receipt", row.id, before, row); return row ? res.json(row) : res.status(404).json({ message: "Goods receipt tidak ditemukan" }); } catch (error) { return sendApiError(req, res, error); }
});
router.delete("/goods-receipts/:id", requireAnyPermission("transaction.reverse"), async (_req, res) => {
  return res.status(405).json({ message: "Posted transactions cannot be deleted. Create a reversal with a recorded reason." });
});

export default router;
