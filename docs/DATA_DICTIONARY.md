# Task 2 - ERD and Database Data Dictionary

**Database:** PostgreSQL  
**ORM/migrations:** Drizzle ORM + SQL migrations  
**Identifier strategy:** stable business codes for master data where appropriate; UUID primary keys for transaction/entity rows.

The authoritative executable schema is `erp-api/src/db/schema.ts`. This data dictionary summarizes the assessment-relevant tables, keys, and mandatory/optional fields.

| Table | Primary key | Important foreign keys | Mandatory fields | Optional / notable fields | Purpose |
|---|---|---|---|---|---|
| `user` | text `id` | - | name, email, timestamps | role/admin fields, soft-delete fields | Better Auth identity |
| `roles` | UUID `id` | - | code, name, `is_system` | description, soft-delete fields | ERP roles |
| `permissions` | UUID `id` | - | code, name, module | description, soft-delete fields | Fine-grained permissions |
| `user_roles` | UUID `id` | `user_id -> user`, `role_id -> roles` | user_id, role_id, assigned_at | assigned_by_user_id | Many-to-many user-role assignment; unique user+role |
| `role_permissions` | UUID `id` | role_id, permission_id | role_id, permission_id | - | Many-to-many role-permission assignment |
| `materials` | varchar `code` | - | name, category, unit | soft-delete fields | Material/item master |
| `business_partners` | varchar `code` | - | type, name | soft-delete fields | User-facing supplier/customer master |
| `suppliers` | varchar `code` | - | name, active | contact/email/phone/address, soft-delete | Explicit supplier entity / legacy FK compatibility |
| `customers` | varchar `code` | - | name, active | contact/email/phone/address, soft-delete | Explicit customer entity |
| `warehouses` | UUID `id` | - | code, name, bonded, active | address, soft-delete | Warehouse master; unique code |
| `locations` | UUID `id` | `warehouse_id -> warehouses` | warehouse_id, code, name, location_type, active | - | Warehouse location; unique warehouse+code |
| `batch_lots` | UUID `id` | `material_code -> materials`, optional trace parent | material_code, batch_number, received_at, quality_status | supplier lot, manufactured date, expiry, trace parent | Batch/lot master; unique material+batch |
| `goods_receipt_headers` | UUID `id` | supplier, warehouse, creator | receipt_number, received_at, warehouse_id, status | supplier, external document, soft-delete | Receipt header; unique receipt number |
| `goods_receipt_lines` | UUID `id` | receipt, material, batch, location | receipt_id, line_number, material_code, batch, quantity, unit, quality status | location | Multi-line receipt; unique receipt+line |
| `production_orders` | UUID `id` | finished material, creator/approver | order_number, finished material, planned quantity, unit, status | dates/approval/soft-delete | Production request/order |
| `production_material_issues` | UUID `id` | production order, material, batch, location | order, line, material, batch, quantity, unit, issued_at | location | Exact raw-material batch consumption; unique order+line |
| `finished_goods_receipts` | UUID `id` | production order, batch, location | production order, batch, quantity, unit, received_at, quality status | location | Finished-goods output receipt |
| `delivery_headers` | UUID `id` | customer, warehouse, creator | delivery number, date, customer, warehouse, status | sales order, soft-delete | Delivery header; unique delivery number |
| `delivery_lines` | UUID `id` | delivery, material, batch, location | delivery, line, material, batch, quantity, unit | location | Exact FG batch delivered; unique delivery+line |
| `stock_transactions` | UUID `id` | material, batch, warehouse, location, user | transaction number/type/date, material, warehouse, qty in/out, unit, reference type | batch/location/reference ID/user | Immutable stock ledger; unique transaction number |
| `stock_balances` | UUID `id` | material, batch, warehouse, location | material, batch, warehouse, quantity, unit | location | Current stock; unique material+batch+warehouse+location |
| `stock_reservations` | UUID `id` | stock balance, users | reservation number, stock balance, quantity, unit, status | reference/release fields | Available-stock reservation without immediately reducing on-hand |
| `audit_logs` | UUID `id` | actor user | action, entity type, entity ID, created_at | before/after JSON, IP | Append-only audit evidence |
| `bill_of_materials` | UUID `id` | material code | material, required quantity, unit | soft-delete fields | Demo BOM component requirement |

## Relationship and cardinality notes

- One material can have many batch/lot rows.
- One goods-receipt header can contain many lines; each line identifies one material/batch/location.
- One production order can consume several input batches through multiple `production_material_issues` rows.
- One production order can create one or more finished-goods receipt rows/batches.
- Raw-material-to-finished-goods traceability is obtained by joining `production_material_issues.production_order_id` to `finished_goods_receipts.production_order_id`.
- One item/batch may exist in multiple warehouses/locations because the current balance key includes warehouse and location.
- Transaction numbers such as goods receipt / stock transaction / delivery numbers are unique to prevent duplicate business documents.

## Deletion strategy

Mutable master/business data uses soft-delete fields where required. `stock_transactions` and `audit_logs` intentionally remain append-only: an incorrect posted movement is corrected with a reversal/counter-entry rather than deleting evidence.
