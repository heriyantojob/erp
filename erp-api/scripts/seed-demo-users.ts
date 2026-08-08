import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "../src/lib/better-auth/auth.js";
import { db } from "../src/db/setup.js";
import { roles, user, userRoles } from "../src/db/schema.js";

export const demoUsers = [
  { name: "ERP System Administrator", email: "admin@erp.test", password: "1234asdf", role: "system_administrator", fallbackRole: "admin" },
  { name: "ERP Warehouse User", email: "warehouse@erp.test", password: "asdf1234", role: "warehouse_user", fallbackRole: "user" },
  { name: "ERP Production User", email: "production@erp.test", password: "asdf1234", role: "production_user", fallbackRole: "user" },
  { name: "ERP Supervisor / Approver", email: "approver@erp.test", password: "asdf1234", role: "supervisor_approver", fallbackRole: "user" },
  { name: "ERP Management / Auditor", email: "auditor@erp.test", password: "asdf1234", role: "management_auditor", fallbackRole: "user" },
] as const;

const legacyDemoEmails = [
  "admin@fka-erp.local",
  "warehouse@fka-erp.local",
  "production@fka-erp.local",
  "approver@fka-erp.local",
  "auditor@fka-erp.local",
];

export async function seedDemoUsers() {
  // Retire demo accounts from older packages so only the new demo set appears
  // as active users. We use soft-delete to preserve audit references.
  await db
    .update(user)
    .set({
      deletedAt: new Date(),
      deleteReason: "Replaced by ERP demo accounts using @erp.test",
      updatedAt: new Date(),
    })
    .where(inArray(user.email, legacyDemoEmails));

  for (const demo of demoUsers) {
    let account = (await db.select().from(user).where(eq(user.email, demo.email)))[0];

    if (!account) {
      await auth.api.signUpEmail({
        body: {
          name: demo.name,
          email: demo.email,
          password: demo.password,
        },
      });
      account = (await db.select().from(user).where(eq(user.email, demo.email)))[0];
    }

    const role = (await db.select().from(roles).where(eq(roles.code, demo.role)))[0];
    if (!account || !role) {
      throw new Error(`Cannot provision ${demo.email}; seed RBAC roles first.`);
    }

    await db
      .update(user)
      .set({
        name: demo.name,
        role: demo.fallbackRole,
        banned: false,
        banReason: null,
        banExpires: null,
        deletedAt: null,
        deletedByUserId: null,
        deleteReason: null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, account.id));

    const assigned = (
      await db
        .select()
        .from(userRoles)
        .where(and(eq(userRoles.userId, account.id), eq(userRoles.roleId, role.id)))
    )[0];

    if (!assigned) {
      await db.insert(userRoles).values({ userId: account.id, roleId: role.id });
    }

    console.info(`Provisioned ${demo.email} as ${demo.role}.`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDemoUsers().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
