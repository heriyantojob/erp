CREATE TABLE IF NOT EXISTS "stock_reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reservation_number" varchar(80) NOT NULL,
  "stock_balance_id" uuid NOT NULL,
  "quantity" numeric(14, 3) NOT NULL,
  "unit" varchar(30) NOT NULL,
  "reference_type" varchar(50) DEFAULT 'manual' NOT NULL,
  "reference_id" varchar(100),
  "status" varchar(30) DEFAULT 'active' NOT NULL,
  "created_by_user_id" text,
  "released_by_user_id" text,
  "release_reason" text,
  "released_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "stock_reservations_reservation_number_unique" UNIQUE("reservation_number")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_stock_balance_id_stock_balances_id_fk" FOREIGN KEY ("stock_balance_id") REFERENCES "public"."stock_balances"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_released_by_user_id_user_id_fk" FOREIGN KEY ("released_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_reservations_balance_status_idx" ON "stock_reservations" USING btree ("stock_balance_id","status");
