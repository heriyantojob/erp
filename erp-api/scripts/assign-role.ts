import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db/setup.js";
import { roles, user, userRoles } from "../src/db/schema.js";

const args = process.argv.slice(2);
const valueFor = (flag: string) => args[args.indexOf(flag) + 1];
const email = valueFor("--email");
const roleCode = valueFor("--role");

if (!email || !roleCode) {
  console.error("Usage: npm run roles:assign -- --email admin@example.com --role system_administrator");
  process.exitCode = 1;
} else {
  const account = (await db.select().from(user).where(eq(user.email, email)))[0];
  const role = (await db.select().from(roles).where(eq(roles.code, roleCode)))[0];
  if (!account || !role) {
    console.error(!account ? "User email not found." : "Role code not found.");
    process.exitCode = 1;
  } else {
    const existing = (await db.select().from(userRoles).where(and(eq(userRoles.userId, account.id), eq(userRoles.roleId, role.id))))[0];
    if (!existing) await db.insert(userRoles).values({ userId: account.id, roleId: role.id });
    console.log(`${email} has role ${roleCode}.`);
  }
}
