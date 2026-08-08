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

router.get("/security/access", async (_req, res) => {
  const current = res.locals.user as { id: string; role?: string };
  return res.json({ role: current.role ?? "user", permissions: await getCurrentPermissions(current.id, current.role) });
});
router.get("/audit-logs", requireAnyPermission("audit.view"), async (_req, res) => {
  const logs = await db.select().from(auditLogs).orderBy(asc(auditLogs.createdAt));
  return res.json(logs);
});
router.get("/security/users", requireAnyPermission("users.manage"), async (_req, res) => {
  const users = await db.select({ id: user.id, name: user.name, email: user.email, fallbackRole: user.role, banned: user.banned, createdAt: user.createdAt }).from(user).where(isNull(user.deletedAt)).orderBy(asc(user.email));
  const assignments = await db.select({ userId: userRoles.userId, code: roles.code, name: roles.name }).from(userRoles).innerJoin(roles, eq(roles.id, userRoles.roleId)).where(isNull(roles.deletedAt));
  return res.json(users.map((account) => ({ ...account, roles: assignments.filter((assignment) => assignment.userId === account.id).map(({ code, name }) => ({ code, name })) })));
});
router.get("/security/roles", requireAnyPermission("users.manage", "roles.manage"), async (_req, res) => {
  return res.json(await db.select({ id: roles.id, code: roles.code, name: roles.name, description: roles.description }).from(roles).where(isNull(roles.deletedAt)).orderBy(asc(roles.code)));
});
const userCreateInput = z.object({ name: text, email: z.string().trim().email().max(256), password: z.string().min(8).max(128), roleCodes: z.array(z.string().trim().min(1).max(100)).min(1).max(10) });
const userUpdateInput = z.object({ name: text, email: z.string().trim().email().max(256), banned: z.boolean().default(false), roleCodes: z.array(z.string().trim().min(1).max(100)).min(1).max(10) });
async function resolveRoles(roleCodes: string[]) {
  const selected = await Promise.all(roleCodes.map(async (roleCode) => (await db.select().from(roles).where(and(eq(roles.code, roleCode), isNull(roles.deletedAt))))[0]));
  if (selected.some((role) => !role)) throw new Error("One or more role codes are invalid");
  return selected as (typeof roles.$inferSelect)[];
}
router.post("/security/users", requireAnyPermission("users.manage"), async (req, res) => {
  try {
    const input = userCreateInput.parse(req.body);
    const existing = (await db.select().from(user).where(eq(user.email, input.email)))[0];
    if (existing) return res.status(409).json({ message: "Email is already registered" });
    const selectedRoles = await resolveRoles(input.roleCodes);
    await auth.api.signUpEmail({ body: { name: input.name, email: input.email, password: input.password } });
    const account = (await db.select().from(user).where(eq(user.email, input.email)))[0];
    if (!account) throw new Error("User account was not created");
    await db.transaction(async (tx) => {
      await tx.update(user).set({ role: input.roleCodes.includes("system_administrator") ? "admin" : "user", updatedAt: new Date() }).where(eq(user.id, account.id));
      await tx.insert(userRoles).values(selectedRoles.map((role) => ({ userId: account.id, roleId: role.id, assignedByUserId: res.locals.user?.id })));
    });
    await audit(db, res, "create", "user", account.id, undefined, { name: input.name, email: input.email, roleCodes: input.roleCodes });
    return res.status(201).json({ id: account.id, name: input.name, email: input.email, roleCodes: input.roleCodes });
  } catch (error) { return sendApiError(req, res, error); }
});
router.put("/security/users/:id", requireAnyPermission("users.manage"), async (req, res) => {
  try {
    const id = String(req.params.id); const input = userUpdateInput.parse(req.body);
    const before = (await db.select().from(user).where(and(eq(user.id, id), isNull(user.deletedAt))))[0];
    if (!before) return res.status(404).json({ message: "User not found" });
    const selectedRoles = await resolveRoles(input.roleCodes);
    await db.transaction(async (tx) => {
      await tx.update(user).set({ name: input.name, email: input.email, banned: input.banned, role: input.roleCodes.includes("system_administrator") ? "admin" : "user", updatedAt: new Date() }).where(eq(user.id, id));
      await tx.delete(userRoles).where(eq(userRoles.userId, id));
      await tx.insert(userRoles).values(selectedRoles.map((role) => ({ userId: id, roleId: role.id, assignedByUserId: res.locals.user?.id })));
    });
    await audit(db, res, "update", "user", id, before, { name: input.name, email: input.email, banned: input.banned, roleCodes: input.roleCodes });
    return res.json({ id, ...input });
  } catch (error) { return sendApiError(req, res, error); }
});
router.delete("/security/users/:id", requireAnyPermission("users.manage"), async (req, res) => {
  try {
    const id = String(req.params.id); const { reason } = softDeleteInput.parse(req.body ?? {});
    if (id === res.locals.user?.id) return res.status(400).json({ message: "You cannot delete your own account" });
    const before = (await db.select().from(user).where(and(eq(user.id, id), isNull(user.deletedAt))))[0];
    if (!before) return res.status(404).json({ message: "User not found" });
    const row = (await db.update(user).set({ deletedAt: new Date(), deletedByUserId: res.locals.user?.id, deleteReason: reason ?? "Deleted from user management", banned: true, banReason: reason ?? "Account deleted", updatedAt: new Date() }).where(and(eq(user.id, id), isNull(user.deletedAt))).returning())[0];
    await audit(db, res, "soft_delete", "user", id, before, row);
    return res.status(204).send();
  } catch (error) { return sendApiError(req, res, error); }
});

export default router;
