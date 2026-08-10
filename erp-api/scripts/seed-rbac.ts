import "dotenv/config";
import { eq } from "drizzle-orm";
import { permissions, rolePermissions, roles } from "../src/db/schema.js";

const permissionDefinitions = [
  ["users.manage", "Manage users", "security"],
  ["configuration.manage", "Manage configuration", "security"],
  ["roles.manage", "Manage roles", "security"],
  ["permissions.manage", "Manage permissions", "security"],
  ["audit.view", "View audit trail", "security"],
  ["materials.view", "View materials", "master-data"],
  ["materials.manage", "Manage materials", "master-data"],
  ["business_partners.view", "View business partners", "master-data"],
  ["business_partners.manage", "Manage business partners", "master-data"],
  ["bom.view", "View bill of materials", "production"],
  ["bom.manage", "Manage bill of materials", "production"],
  ["goods_receipt.create", "Create goods receipts", "warehouse"],
  ["goods_receipt.view", "View goods receipts", "warehouse"],
  ["material_issue.create", "Create material issues", "warehouse"],
  ["stock.view", "View current stock", "warehouse"],
  ["stock.reserve", "Create and release stock reservations", "warehouse"],
  ["stock_ledger.view", "View stock ledger", "warehouse"],
  ["purchase_requisition.manage", "Manage purchase requisitions", "purchasing"],
  ["purchase_order.manage", "Manage purchase orders", "purchasing"],
  ["quality.manage", "Perform incoming quality inspection", "quality"],
  ["production_order.create", "Create production orders", "production"],
  ["production.manage", "Run manufacturing process", "production"],
  ["finished_goods.create", "Receive finished goods", "production"],
  ["sales_order.manage", "Manage sales orders", "sales"],
  ["delivery.create", "Create customer deliveries", "logistics"],
  ["production_order.view", "View production orders", "production"],
  ["transaction.review", "Review transactions", "approval"],
  ["transaction.approve", "Approve transactions", "approval"],
  ["transaction.reverse", "Reverse transactions", "approval"],
  ["reports.view", "View reports", "reporting"],
  ["traceability.view", "View traceability", "reporting"],
] as const;

const roleDefinitions = {
  system_administrator: {
    name: "System Administrator",
    description:
      "Manage users, configuration, roles, and audited business data.",
    permissions: permissionDefinitions.map(([code]) => code),
  },
  warehouse_user: {
    name: "Warehouse User",
    description:
      "Create goods receipts/material issues and view stock. No direct deletion of posted transactions.",
    permissions: [
      "materials.view",
      "business_partners.view",
      "goods_receipt.create",
      "goods_receipt.view",
      "material_issue.create",
      "quality.manage",
      "finished_goods.create",
      "delivery.create",
      "stock.view",
      "stock.reserve",
      "stock_ledger.view",
    ],
  },
  production_user: {
    name: "Production User",
    description:
      "Create production requests and view BOM/status without directly changing warehouse balances.",
    permissions: [
      "materials.view",
      "bom.view",
      "production_order.create",
      "production_order.view",
      "production.manage",
      "finished_goods.create",
      "stock.view",
      "stock.reserve",
    ],
  },
  supervisor_approver: {
    name: "Supervisor / Approver",
    description:
      "Review, approve, or reverse transactions with a recorded reason.",
    permissions: [
      "materials.view",
      "business_partners.view",
      "bom.view",
      "goods_receipt.view",
      "stock.view",
      "stock.reserve",
      "stock_ledger.view",
      "purchase_requisition.manage",
      "purchase_order.manage",
      "quality.manage",
      "sales_order.manage",
      "transaction.review",
      "transaction.approve",
      "transaction.reverse",
      "audit.view",
    ],
  },
  management_auditor: {
    name: "Management / Auditor",
    description:
      "Read-only reports, traceability, current stock and audit trail.",
    permissions: [
      "materials.view",
      "business_partners.view",
      "bom.view",
      "goods_receipt.view",
      "stock.view",
      "stock_ledger.view",
      "reports.view",
      "traceability.view",
      "audit.view",
    ],
  },
} as const;

export async function seedRbac(database: any) {
  const ids = new Map<string, string>();
  for (const [code, name, module] of permissionDefinitions) {
    const existing = (
      await database
        .select()
        .from(permissions)
        .where(eq(permissions.code, code))
    )[0];
    const row =
      existing ??
      (
        await database
          .insert(permissions)
          .values({ code, name, module })
          .returning()
      )[0];
    ids.set(code, row.id);
  }
  for (const [code, definition] of Object.entries(roleDefinitions)) {
    const existing = (
      await database.select().from(roles).where(eq(roles.code, code))
    )[0];
    const role =
      existing ??
      (
        await database
          .insert(roles)
          .values({
            code,
            name: definition.name,
            description: definition.description,
            isSystem: true,
          })
          .returning()
      )[0];
    for (const permissionCode of definition.permissions) {
      const permissionId = ids.get(permissionCode);
      if (!permissionId) continue;
      const linked = (
        await database
          .select()
          .from(rolePermissions)
          .where(eq(rolePermissions.roleId, role.id))
      ).some((link) => link.permissionId === permissionId);
      if (!linked)
        await database
          .insert(rolePermissions)
          .values({ roleId: role.id, permissionId });
    }
  }
  console.log("RBAC roles and permissions seeded.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { db, poolConnection } = await import("../src/db/setup.js");
  seedRbac(db)
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => poolConnection.end());
}
