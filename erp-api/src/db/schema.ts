import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tableFileAttachments, tableFiles } from "./table/tableFiles";

// Better Auth tables. Keep these names/columns aligned with the Drizzle adapter.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  email: varchar("email", { length: 256 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: varchar("username", { length: 256 }).unique(),
  uid: varchar("uid", { length: 255 }).unique(),
  contributor: smallint("contributor").notNull().default(0),
  // Better Auth admin plugin fields. `role` is the default/fallback role;
  // user_roles below supports flexible many-to-many ERP roles.
  role: varchar("role", { length: 100 }).notNull().default("user"),
  banned: boolean("banned").notNull().default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { mode: "date" }),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  deletedByUserId: text("deleted_by_user_id"),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: varchar("account_id", { length: 255 }).notNull(),
  providerId: varchar("provider_id", { length: 255 }).notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: "date" }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    mode: "date",
  }),
  scope: text("scope"),
  password: varchar("password", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ERP master and transaction tables.
export const materials = pgTable("materials", {
  code: varchar("code", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  deletedByUserId: text("deleted_by_user_id"),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const businessPartners = pgTable("business_partners", {
  code: varchar("code", { length: 50 }).primaryKey(),
  type: varchar("type", { length: 30 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  deletedByUserId: text("deleted_by_user_id"),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// Explicit supplier/customer entities required by the ERP ERD.
export const suppliers = pgTable("suppliers", {
  code: varchar("code", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  active: boolean("active").notNull().default(true),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  deletedByUserId: text("deleted_by_user_id"),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  code: varchar("code", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  active: boolean("active").notNull().default(true),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  deletedByUserId: text("deleted_by_user_id"),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const warehouses = pgTable("warehouses", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  bonded: boolean("bonded").notNull().default(false),
  active: boolean("active").notNull().default(true),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  deletedByUserId: text("deleted_by_user_id"),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const locations = pgTable(
  "locations",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    locationType: varchar("location_type", { length: 50 })
      .notNull()
      .default("storage"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("locations_warehouse_code_unique").on(
      table.warehouseId,
      table.code,
    ),
  ],
);

// Flexible application RBAC layered on Better Auth's default role field.
export const roles = pgTable("roles", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  deletedByUserId: text("deleted_by_user_id"),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 150 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  module: varchar("module", { length: 100 }).notNull(),
  description: text("description"),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  deletedByUserId: text("deleted_by_user_id"),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    assignedByUserId: text("assigned_by_user_id").references(() => user.id),
  },
  (table) => [
    uniqueIndex("user_roles_user_role_unique").on(table.userId, table.roleId),
  ],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("role_permissions_role_permission_unique").on(
      table.roleId,
      table.permissionId,
    ),
  ],
);

export const batchLots = pgTable(
  "batch_lots",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    materialCode: varchar("material_code", { length: 50 })
      .notNull()
      .references(() => materials.code),
    batchNumber: varchar("batch_number", { length: 100 }).notNull(),
    supplierLotNumber: varchar("supplier_lot_number", { length: 100 }),
    // FIFO order is based on actual receipt date, then the creation timestamp.
    receivedAt: date("received_at", { mode: "string" })
      .notNull()
      .default(sql`CURRENT_DATE`),
    manufacturedAt: date("manufactured_at", { mode: "string" }),
    expiryDate: date("expiry_date", { mode: "string" }),
    qualityStatus: varchar("quality_status", { length: 30 })
      .notNull()
      .default("quarantine"),
    traceParentBatchId: uuid("trace_parent_batch_id").references(
      (): any => batchLots.id,
    ),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("batch_lots_material_batch_unique").on(
      table.materialCode,
      table.batchNumber,
    ),
  ],
);

// Header/detail transaction models preserve multiple lines and batches per transaction.
export const goodsReceiptHeaders = pgTable("goods_receipt_headers", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  receiptNumber: varchar("receipt_number", { length: 50 }).notNull().unique(),
  receivedAt: date("received_at", { mode: "string" }).notNull(),
  supplierCode: varchar("supplier_code", { length: 50 }).references(
    () => suppliers.code,
  ),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  externalDocumentNumber: varchar("external_document_number", { length: 100 }),
  createdByUserId: text("created_by_user_id").references(() => user.id),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  deletedByUserId: text("deleted_by_user_id"),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const goodsReceiptLines = pgTable(
  "goods_receipt_lines",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    receiptId: uuid("receipt_id")
      .notNull()
      .references(() => goodsReceiptHeaders.id, { onDelete: "cascade" }),
    lineNumber: smallint("line_number").notNull(),
    materialCode: varchar("material_code", { length: 50 })
      .notNull()
      .references(() => materials.code),
    batchLotId: uuid("batch_lot_id")
      .notNull()
      .references(() => batchLots.id),
    locationId: uuid("location_id").references(() => locations.id),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
    unit: varchar("unit", { length: 30 }).notNull(),
    qualityStatus: varchar("quality_status", { length: 30 })
      .notNull()
      .default("quarantine"),
  },
  (table) => [
    uniqueIndex("goods_receipt_lines_receipt_line_unique").on(
      table.receiptId,
      table.lineNumber,
    ),
  ],
);

export const purchaseRequisitions = pgTable("purchase_requisitions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  requisitionNumber: varchar("requisition_number", { length: 50 })
    .notNull()
    .unique(),
  materialCode: varchar("material_code", { length: 50 })
    .notNull()
    .references(() => materials.code),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  neededAt: date("needed_at", { mode: "string" }),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  notes: text("notes"),
  createdByUserId: text("created_by_user_id").references(() => user.id),
  approvedByUserId: text("approved_by_user_id").references(() => user.id),
  approvedAt: timestamp("approved_at", { mode: "date" }),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  deletedByUserId: text("deleted_by_user_id"),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  requisitionId: uuid("requisition_id").references(
    () => purchaseRequisitions.id,
  ),
  supplierCode: varchar("supplier_code", { length: 50 }),
  materialCode: varchar("material_code", { length: 50 })
    .notNull()
    .references(() => materials.code),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  expectedAt: date("expected_at", { mode: "string" }),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  createdByUserId: text("created_by_user_id").references(() => user.id),
  approvedByUserId: text("approved_by_user_id").references(() => user.id),
  approvedAt: timestamp("approved_at", { mode: "date" }),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  deletedByUserId: text("deleted_by_user_id"),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const qualityInspections = pgTable(
  "quality_inspections",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    receiptId: uuid("receipt_id")
      .notNull()
      .references(() => goodsReceiptHeaders.id),
    batchLotId: uuid("batch_lot_id")
      .notNull()
      .references(() => batchLots.id),
    status: varchar("status", { length: 30 }).notNull().default("pending"),
    result: text("result"),
    inspectedByUserId: text("inspected_by_user_id").references(() => user.id),
    inspectedAt: timestamp("inspected_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("quality_inspections_receipt_batch_unique").on(
      table.receiptId,
      table.batchLotId,
    ),
  ],
);

export const productionOrders = pgTable("production_orders", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  finishedMaterialCode: varchar("finished_material_code", { length: 50 })
    .notNull()
    .references(() => materials.code),
  plannedQuantity: numeric("planned_quantity", {
    precision: 14,
    scale: 3,
  }).notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  plannedAt: date("planned_at", { mode: "string" }),
  createdByUserId: text("created_by_user_id").references(() => user.id),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  deletedByUserId: text("deleted_by_user_id"),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const productionMaterialIssues = pgTable(
  "production_material_issues",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    productionOrderId: uuid("production_order_id")
      .notNull()
      .references(() => productionOrders.id, { onDelete: "cascade" }),
    lineNumber: smallint("line_number").notNull(),
    materialCode: varchar("material_code", { length: 50 })
      .notNull()
      .references(() => materials.code),
    batchLotId: uuid("batch_lot_id")
      .notNull()
      .references(() => batchLots.id),
    locationId: uuid("location_id").references(() => locations.id),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
    unit: varchar("unit", { length: 30 }).notNull(),
    issuedAt: timestamp("issued_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("production_material_issues_order_line_unique").on(
      table.productionOrderId,
      table.lineNumber,
    ),
  ],
);

export const finishedGoodsReceipts = pgTable("finished_goods_receipts", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  productionOrderId: uuid("production_order_id")
    .notNull()
    .references(() => productionOrders.id),
  batchLotId: uuid("batch_lot_id")
    .notNull()
    .references(() => batchLots.id),
  locationId: uuid("location_id").references(() => locations.id),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  receivedAt: timestamp("received_at", { mode: "date" }).notNull().defaultNow(),
  qualityStatus: varchar("quality_status", { length: 30 })
    .notNull()
    .default("quarantine"),
});

export const deliveryHeaders = pgTable("delivery_headers", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  deliveryNumber: varchar("delivery_number", { length: 50 }).notNull().unique(),
  deliveredAt: date("delivered_at", { mode: "string" }).notNull(),
  customerCode: varchar("customer_code", { length: 50 })
    .notNull()
    .references(() => customers.code),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  salesOrderNumber: varchar("sales_order_number", { length: 100 }),
  createdByUserId: text("created_by_user_id").references(() => user.id),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  deletedByUserId: text("deleted_by_user_id"),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const deliveryLines = pgTable(
  "delivery_lines",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => deliveryHeaders.id, { onDelete: "cascade" }),
    lineNumber: smallint("line_number").notNull(),
    materialCode: varchar("material_code", { length: 50 })
      .notNull()
      .references(() => materials.code),
    batchLotId: uuid("batch_lot_id")
      .notNull()
      .references(() => batchLots.id),
    locationId: uuid("location_id").references(() => locations.id),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
    unit: varchar("unit", { length: 30 }).notNull(),
  },
  (table) => [
    uniqueIndex("delivery_lines_delivery_line_unique").on(
      table.deliveryId,
      table.lineNumber,
    ),
  ],
);

export const stockTransactions = pgTable("stock_transactions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  transactionNumber: varchar("transaction_number", { length: 80 })
    .notNull()
    .unique(),
  transactionType: varchar("transaction_type", { length: 50 }).notNull(),
  transactionAt: timestamp("transaction_at", { mode: "date" })
    .notNull()
    .defaultNow(),
  materialCode: varchar("material_code", { length: 50 })
    .notNull()
    .references(() => materials.code),
  batchLotId: uuid("batch_lot_id").references(() => batchLots.id),
  warehouseId: uuid("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  locationId: uuid("location_id").references(() => locations.id),
  quantityIn: numeric("quantity_in", { precision: 14, scale: 3 })
    .notNull()
    .default("0"),
  quantityOut: numeric("quantity_out", { precision: 14, scale: 3 })
    .notNull()
    .default("0"),
  unit: varchar("unit", { length: 30 }).notNull(),
  referenceType: varchar("reference_type", { length: 50 }).notNull(),
  referenceId: uuid("reference_id"),
  createdByUserId: text("created_by_user_id").references(() => user.id),
  // Stock ledger entries are immutable accounting/traceability evidence.
  // Corrections are posted as reversal/counter transactions, never soft-deleted.
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const stockBalances = pgTable(
  "stock_balances",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    materialCode: varchar("material_code", { length: 50 })
      .notNull()
      .references(() => materials.code),
    batchLotId: uuid("batch_lot_id")
      .notNull()
      .references(() => batchLots.id),
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    locationId: uuid("location_id").references(() => locations.id),
    quantityOnHand: numeric("quantity_on_hand", { precision: 14, scale: 3 })
      .notNull()
      .default("0"),
    unit: varchar("unit", { length: 30 }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("stock_balances_balance_key_unique").on(
      table.materialCode,
      table.batchLotId,
      table.warehouseId,
      table.locationId,
    ),
  ],
);

export const stockReservations = pgTable("stock_reservations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  reservationNumber: varchar("reservation_number", { length: 80 })
    .notNull()
    .unique(),
  stockBalanceId: uuid("stock_balance_id")
    .notNull()
    .references(() => stockBalances.id),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  referenceType: varchar("reference_type", { length: 50 })
    .notNull()
    .default("manual"),
  referenceId: varchar("reference_id", { length: 100 }),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  createdByUserId: text("created_by_user_id").references(() => user.id),
  releasedByUserId: text("released_by_user_id").references(() => user.id),
  releaseReason: text("release_reason"),
  releasedAt: timestamp("released_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const salesOrders = pgTable("sales_orders", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  customerCode: varchar("customer_code", { length: 50 }),
  materialCode: varchar("material_code", { length: 50 })
    .notNull()
    .references(() => materials.code),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  requestedAt: date("requested_at", { mode: "string" }),
  stockBalanceId: uuid("stock_balance_id").references(() => stockBalances.id),
  reservationId: uuid("reservation_id").references(() => stockReservations.id),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  createdByUserId: text("created_by_user_id").references(() => user.id),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  deletedByUserId: text("deleted_by_user_id"),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  actorUserId: text("actor_user_id").references(() => user.id),
  action: varchar("action", { length: 50 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }).notNull(),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  ipAddress: varchar("ip_address", { length: 100 }),
  // Audit logs are append-only evidence. They intentionally do not use the
  // generic soft-delete columns used by mutable ERP business tables.
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const goodsReceipts = pgTable("goods_receipts", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  receivedAt: date("received_at", { mode: "string" }).notNull(),
  receiptCode: varchar("receipt_code", { length: 50 }).notNull().unique(),
  materialCode: varchar("material_code", { length: 50 })
    .notNull()
    .references(() => materials.code),
  batchNumber: varchar("batch_number", { length: 100 }).notNull(),
  expiryDate: date("expiry_date", { mode: "string" }),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  deletedByUserId: text("deleted_by_user_id"),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const billOfMaterials = pgTable("bill_of_materials", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  materialCode: varchar("material_code", { length: 50 })
    .notNull()
    .references(() => materials.code),
  requiredQuantity: numeric("required_quantity", {
    precision: 14,
    scale: 3,
  }).notNull(),
  unit: varchar("unit", { length: 30 }).notNull(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  deletedByUserId: text("deleted_by_user_id"),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// File metadata and its uploaded variants/attachments.
export const files = tableFiles;
export const fileAttachments = tableFileAttachments;
// Compatibility names used by the retained file API.
export const dbTableFiles = files;
export const dbTableFileAttachments = fileAttachments;

export const schema = {
  user,
  session,
  account,
  verification,
  files,
  fileAttachments,
  materials,
  businessPartners,
  suppliers,
  customers,
  warehouses,
  locations,
  roles,
  permissions,
  userRoles,
  rolePermissions,
  batchLots,
  goodsReceipts,
  billOfMaterials,
  goodsReceiptHeaders,
  goodsReceiptLines,
  purchaseRequisitions,
  purchaseOrders,
  qualityInspections,
  productionOrders,
  productionMaterialIssues,
  finishedGoodsReceipts,
  deliveryHeaders,
  deliveryLines,
  stockTransactions,
  stockBalances,
  stockReservations,
  salesOrders,
  auditLogs,
};
