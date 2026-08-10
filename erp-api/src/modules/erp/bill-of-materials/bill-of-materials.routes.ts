import { Router } from "express";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { sendApiError } from "@/lib/api-i18n";
import { db } from "@/db/setup";
import { auth } from "@/lib/better-auth/auth";
import {
  auditLogs,
  billOfMaterials,
  businessPartners,
  goodsReceipts,
  materials,
  roles,
  user,
  userRoles,
} from "@/db/schema";
import {
  allocateFifoForProduction,
  FifoAllocationError,
  fifoRequestInput,
} from "@/app/api/erp/fifoService";
import {
  getCurrentPermissions,
  requireAnyPermission,
} from "@/middleware/auth/authorizationMiddleware";

const router = Router();
const code = z.string().trim().min(1).max(50);
const text = z.string().trim().min(1).max(255);
const unit = z.string().trim().min(1).max(30);
const isoDate = z.string().date();
const quantity = z.coerce.number().positive().max(99_999_999_999);

const materialInput = z.object({ code, name: text, category: text, unit });
const partnerInput = z.object({
  code,
  type: z.enum(["supplier", "customer"]),
  name: text,
});
const receiptInput = z.object({
  receivedAt: isoDate,
  receiptCode: code,
  materialCode: code,
  batchNumber: z.string().trim().min(1).max(100),
  expiryDate: isoDate.nullable().optional(),
  quantity,
  unit,
});
const bomInput = z.object({
  materialCode: code,
  requiredQuantity: quantity,
  unit,
});
const roleAssignmentInput = z.object({
  roleCodes: z.array(z.string().trim().min(1).max(100)).max(10),
});
const softDeleteInput = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
});

type DbExecutor = Pick<typeof db, "insert">;

async function audit(
  executor: DbExecutor,
  res: any,
  action: string,
  entityType: string,
  entityId: string,
  beforeData?: unknown,
  afterData?: unknown,
) {
  try {
    await executor.insert(auditLogs).values({
      actorUserId: res.locals.user?.id ?? null,
      action,
      entityType,
      entityId,
      beforeData,
      afterData,
      ipAddress: res.req?.ip,
    });
  } catch (error) {
    // Audit failures must be visible in server logs, but must not turn an already
    // successful business operation into a misleading validation error response.
    console.error("[ERP audit] Failed to write audit log", {
      action,
      entityType,
      entityId,
      error,
    });
  }
}

router.get(
  "/bill-of-materials",
  requireAnyPermission("bom.view"),
  async (_req, res) =>
    res.json(
      await db
        .select()
        .from(billOfMaterials)
        .where(isNull(billOfMaterials.deletedAt))
        .orderBy(asc(billOfMaterials.materialCode)),
    ),
);
router.post(
  "/bill-of-materials",
  requireAnyPermission("bom.manage"),
  async (req, res) => {
    try {
      const data = bomInput.parse(req.body);
      const row = (
        await db
          .insert(billOfMaterials)
          .values({ ...data, requiredQuantity: String(data.requiredQuantity) })
          .returning()
      )[0];
      if (!row) throw new Error("Bill of materials was not created");
      await audit(
        db,
        res,
        "create",
        "bill_of_material",
        row.id,
        undefined,
        row,
      );
      return res.status(201).json(row);
    } catch (error) {
      return sendApiError(req, res, error);
    }
  },
);
router.put(
  "/bill-of-materials/:id",
  requireAnyPermission("bom.manage"),
  async (req, res) => {
    try {
      const key = String(req.params.id);
      const data = bomInput.parse(req.body);
      const before = (
        await db
          .select()
          .from(billOfMaterials)
          .where(
            and(eq(billOfMaterials.id, key), isNull(billOfMaterials.deletedAt)),
          )
      )[0];
      const row = (
        await db
          .update(billOfMaterials)
          .set({
            ...data,
            requiredQuantity: String(data.requiredQuantity),
            updatedAt: new Date(),
          })
          .where(
            and(eq(billOfMaterials.id, key), isNull(billOfMaterials.deletedAt)),
          )
          .returning()
      )[0];
      if (row)
        await audit(db, res, "update", "bill_of_material", row.id, before, row);
      return row
        ? res.json(row)
        : res
            .status(404)
            .json({ message: "Bill of materials tidak ditemukan" });
    } catch (error) {
      return sendApiError(req, res, error);
    }
  },
);
router.delete(
  "/bill-of-materials/:id",
  requireAnyPermission("bom.manage"),
  async (req, res) => {
    try {
      const { reason } = softDeleteInput.parse(req.body ?? {});
      const key = String(req.params.id);
      const before = (
        await db
          .select()
          .from(billOfMaterials)
          .where(
            and(eq(billOfMaterials.id, key), isNull(billOfMaterials.deletedAt)),
          )
      )[0];
      if (!before)
        return res
          .status(404)
          .json({ message: "Bill of materials tidak ditemukan" });
      const row = (
        await db
          .update(billOfMaterials)
          .set({
            deletedAt: new Date(),
            deletedByUserId: res.locals.user?.id,
            deleteReason: reason ?? "Deleted from ERP",
            updatedAt: new Date(),
          })
          .where(
            and(eq(billOfMaterials.id, key), isNull(billOfMaterials.deletedAt)),
          )
          .returning()
      )[0];
      await audit(db, res, "soft_delete", "bill_of_material", key, before, row);
      return res.status(204).send();
    } catch (error) {
      return sendApiError(req, res, error);
    }
  },
);

export default router;
