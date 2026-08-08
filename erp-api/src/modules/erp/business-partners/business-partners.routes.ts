import { Router } from "express";
import { and, asc, eq, ilike, isNull, or } from "drizzle-orm";
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

router.get(
  "/business-partners/suppliers/options",
  requireAnyPermission("business_partners.view", "business_partners.manage", "purchase_order.manage", "goods_receipt.create"),
  async (req, res) => {
    try {
      const q = String(req.query.q ?? "").trim();
      const conditions = [
        eq(businessPartners.type, "supplier"),
        isNull(businessPartners.deletedAt),
      ];

      if (q) {
        conditions.push(
          or(
            ilike(businessPartners.code, `%${q}%`),
            ilike(businessPartners.name, `%${q}%`),
          )!,
        );
      }

      const rows = await db
        .select({
          code: businessPartners.code,
          name: businessPartners.name,
        })
        .from(businessPartners)
        .where(and(...conditions))
        .orderBy(asc(businessPartners.code))
        .limit(30);

      return res.json(rows.map((supplier) => ({
        value: supplier.code,
        label: `${supplier.code} - ${supplier.name}`,
        code: supplier.code,
        name: supplier.name,
      })));
    } catch (error) {
      return sendApiError(req, res, error);
    }
  },
);

router.get(
  "/business-partners/suppliers/:code/option",
  requireAnyPermission("business_partners.view", "business_partners.manage", "purchase_order.manage", "goods_receipt.create"),
  async (req, res) => {
    try {
      const codeValue = decodeURIComponent(String(req.params.code)).trim();
      const supplier = (await db
        .select({ code: businessPartners.code, name: businessPartners.name })
        .from(businessPartners)
        .where(and(
          eq(businessPartners.code, codeValue),
          eq(businessPartners.type, "supplier"),
          isNull(businessPartners.deletedAt),
        ))
        .limit(1))[0];

      if (!supplier) return res.status(404).json({ message: `Supplier "${codeValue}" not found.` });
      return res.json({
        value: supplier.code,
        label: `${supplier.code} - ${supplier.name}`,
        code: supplier.code,
        name: supplier.name,
      });
    } catch (error) {
      return sendApiError(req, res, error);
    }
  },
);

router.get("/business-partners", requireAnyPermission("business_partners.view"), async (_req, res) => res.json(await db.select().from(businessPartners).where(isNull(businessPartners.deletedAt)).orderBy(asc(businessPartners.code))));
router.post("/business-partners", requireAnyPermission("business_partners.manage"), async (req, res) => {
  try { const data = partnerInput.parse(req.body); const row = (await db.insert(businessPartners).values(data).returning())[0]; if (!row) throw new Error("Business partner was not created"); await audit(db, res, "create", "business_partner", row.code, undefined, row); return res.status(201).json(row); } catch (error) { return sendApiError(req, res, error); }
});
router.put("/business-partners/:code", requireAnyPermission("business_partners.manage"), async (req, res) => {
  try { const key = String(req.params.code); const data = partnerInput.omit({ code: true }).parse(req.body); const before = (await db.select().from(businessPartners).where(and(eq(businessPartners.code, key), isNull(businessPartners.deletedAt))))[0]; const row = (await db.update(businessPartners).set({ ...data, updatedAt: new Date() }).where(and(eq(businessPartners.code, key), isNull(businessPartners.deletedAt))).returning())[0]; if (row) await audit(db, res, "update", "business_partner", row.code, before, row); return row ? res.json(row) : res.status(404).json({ message: "Mitra bisnis tidak ditemukan" }); } catch (error) { return sendApiError(req, res, error); }
});
router.delete("/business-partners/:code", requireAnyPermission("business_partners.manage"), async (req, res) => {
  try {
    const { reason } = softDeleteInput.parse(req.body ?? {});
    const key = String(req.params.code);
    const before = (await db.select().from(businessPartners).where(and(eq(businessPartners.code, key), isNull(businessPartners.deletedAt))))[0];
    if (!before) return res.status(404).json({ message: "Mitra bisnis tidak ditemukan" });
    const row = (await db.update(businessPartners).set({ deletedAt: new Date(), deletedByUserId: res.locals.user?.id, deleteReason: reason ?? "Deleted from ERP", updatedAt: new Date() }).where(and(eq(businessPartners.code, key), isNull(businessPartners.deletedAt))).returning())[0];
    await audit(db, res, "soft_delete", "business_partner", key, before, row);
    return res.status(204).send();
  } catch (error) { return sendApiError(req, res, error); }
});

export default router;
