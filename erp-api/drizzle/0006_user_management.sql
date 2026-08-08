ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "deleted_by_user_id" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "delete_reason" text;
CREATE INDEX IF NOT EXISTS "user_deleted_at_idx" ON "user" ("deleted_at");
