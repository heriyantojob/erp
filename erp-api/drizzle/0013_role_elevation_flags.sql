ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "is_superadmin" boolean NOT NULL DEFAULT false;
