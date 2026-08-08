-- Idempotent operational schema repair.
-- This migration repairs databases created by older prototype packages where
-- schema.ts evolved faster than the manual migration history.

ALTER TABLE IF EXISTS "goods_receipt_headers"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "deleted_by_user_id" text,
  ADD COLUMN IF NOT EXISTS "delete_reason" text;

ALTER TABLE IF EXISTS "goods_receipt_lines"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "deleted_by_user_id" text,
  ADD COLUMN IF NOT EXISTS "delete_reason" text;

ALTER TABLE IF EXISTS "production_orders"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "deleted_by_user_id" text,
  ADD COLUMN IF NOT EXISTS "delete_reason" text;

ALTER TABLE IF EXISTS "warehouses"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "deleted_by_user_id" text,
  ADD COLUMN IF NOT EXISTS "delete_reason" text;

ALTER TABLE IF EXISTS "materials"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "deleted_by_user_id" text,
  ADD COLUMN IF NOT EXISTS "delete_reason" text;

ALTER TABLE IF EXISTS "business_partners"
  ADD COLUMN IF NOT EXISTS "deleted_at" timestamp,
  ADD COLUMN IF NOT EXISTS "deleted_by_user_id" text,
  ADD COLUMN IF NOT EXISTS "delete_reason" text;

ALTER TABLE IF EXISTS "batch_lots"
  ADD COLUMN IF NOT EXISTS "received_at" date DEFAULT CURRENT_DATE NOT NULL;

-- Ledger tables are intentionally append-only. Do not add soft-delete columns
-- to audit_logs or stock_transactions.
