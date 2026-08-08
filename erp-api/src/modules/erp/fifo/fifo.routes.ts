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

router.post("/fifo/allocate", requireAnyPermission("material_issue.create"), async (req, res) => {
  try {
    const input = fifoRequestInput.parse(req.body);
    const result = await allocateFifoForProduction(input, res.locals.user?.id);
    return res.status(result.idempotent ? 200 : 201).json(result);
  } catch (error) {
    if (error instanceof FifoAllocationError) return res.status(error.status).json({ message: error.message });
    return sendApiError(req, res, error);
  }
});

export default router;
