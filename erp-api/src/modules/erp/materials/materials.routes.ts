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

router.get("/materials", requireAnyPermission("materials.view"), async (_req, res) => res.json(await db.select().from(materials).where(isNull(materials.deletedAt)).orderBy(asc(materials.code))));
router.post("/materials", requireAnyPermission("materials.manage"), async (req, res) => {
  try {
    const data = materialInput.parse(req.body);
    const row = await db.transaction(async (tx) => {
      const created = (await tx.insert(materials).values(data).returning())[0];
      if (!created) throw new Error("Material was not created");
      await audit(tx, res, "create", "material", created.code, undefined, created);
      return created;
    });
    return res.status(201).json(row);
  } catch (error) { return sendApiError(req, res, error); }
});
router.put("/materials/:code", requireAnyPermission("materials.manage"), async (req, res) => {
  try {
    const key = String(req.params.code);
    const data = materialInput.omit({ code: true }).parse(req.body);
    const row = await db.transaction(async (tx) => {
      const before = (await tx.select().from(materials).where(and(eq(materials.code, key), isNull(materials.deletedAt))))[0];
      if (!before) return null;
      const updated = (await tx.update(materials).set({ ...data, updatedAt: new Date() }).where(and(eq(materials.code, key), isNull(materials.deletedAt))).returning())[0];
      if (!updated) return null;
      await audit(tx, res, "update", "material", updated.code, before, updated);
      return updated;
    });
    return row ? res.json(row) : res.status(404).json({ message: "Material not found" });
  } catch (error) { return sendApiError(req, res, error); }
});
router.delete("/materials/:code", requireAnyPermission("materials.manage"), async (req, res) => {
  try {
    const { reason } = softDeleteInput.parse(req.body ?? {});
    const key = String(req.params.code);
    const deleted = await db.transaction(async (tx) => {
      const before = (await tx.select().from(materials).where(and(eq(materials.code, key), isNull(materials.deletedAt))))[0];
      if (!before) return false;
      const row = (await tx.update(materials).set({ deletedAt: new Date(), deletedByUserId: res.locals.user?.id, deleteReason: reason ?? "Deleted from ERP", updatedAt: new Date() }).where(and(eq(materials.code, key), isNull(materials.deletedAt))).returning())[0];
      if (!row) return false;
      await audit(tx, res, "soft_delete", "material", key, before, row);
      return true;
    });
    return deleted ? res.status(204).send() : res.status(404).json({ message: "Material not found" });
  } catch (error) { return sendApiError(req, res, error); }
});

export default router;
