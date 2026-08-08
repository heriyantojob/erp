CREATE TABLE IF NOT EXISTS "purchase_requisitions" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "requisition_number" varchar(50) NOT NULL UNIQUE, "material_code" varchar(50) NOT NULL REFERENCES "materials"("code"), "quantity" numeric(14,3) NOT NULL, "unit" varchar(30) NOT NULL, "needed_at" date, "status" varchar(30) DEFAULT 'draft' NOT NULL, "notes" text, "created_by_user_id" text REFERENCES "user"("id"), "approved_by_user_id" text REFERENCES "user"("id"), "approved_at" timestamp, "deleted_at" timestamp, "deleted_by_user_id" text, "delete_reason" text, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "purchase_orders" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "order_number" varchar(50) NOT NULL UNIQUE, "requisition_id" uuid REFERENCES "purchase_requisitions"("id"), "supplier_code" varchar(50), "material_code" varchar(50) NOT NULL REFERENCES "materials"("code"), "quantity" numeric(14,3) NOT NULL, "unit" varchar(30) NOT NULL, "expected_at" date, "status" varchar(30) DEFAULT 'draft' NOT NULL, "created_by_user_id" text REFERENCES "user"("id"), "approved_by_user_id" text REFERENCES "user"("id"), "approved_at" timestamp, "deleted_at" timestamp, "deleted_by_user_id" text, "delete_reason" text, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "quality_inspections" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "receipt_id" uuid NOT NULL REFERENCES "goods_receipt_headers"("id"), "batch_lot_id" uuid NOT NULL REFERENCES "batch_lots"("id"), "status" varchar(30) DEFAULT 'pending' NOT NULL, "result" text, "inspected_by_user_id" text REFERENCES "user"("id"), "inspected_at" timestamp, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL, CONSTRAINT "quality_inspections_receipt_batch_unique" UNIQUE("receipt_id","batch_lot_id")
);
CREATE TABLE IF NOT EXISTS "sales_orders" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "order_number" varchar(50) NOT NULL UNIQUE, "customer_code" varchar(50), "material_code" varchar(50) NOT NULL REFERENCES "materials"("code"), "quantity" numeric(14,3) NOT NULL, "unit" varchar(30) NOT NULL, "requested_at" date, "stock_balance_id" uuid REFERENCES "stock_balances"("id"), "reservation_id" uuid REFERENCES "stock_reservations"("id"), "status" varchar(30) DEFAULT 'draft' NOT NULL, "created_by_user_id" text REFERENCES "user"("id"), "deleted_at" timestamp, "deleted_by_user_id" text, "delete_reason" text, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "quality_inspections" ("receipt_id","batch_lot_id","status","result")
SELECT grl."receipt_id", grl."batch_lot_id", CASE WHEN grl."quality_status"='released' THEN 'released' ELSE 'pending' END, 'Backfilled from existing goods receipt'
FROM "goods_receipt_lines" grl
ON CONFLICT ("receipt_id","batch_lot_id") DO NOTHING;
