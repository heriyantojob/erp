# Audit Log Schema Fix

## Root cause

`audit_logs` was created by migration `0003_big_klaw.sql` as an append-only table.
A later source edit accidentally added `deleted_at`, `deleted_by_user_id`, and
`delete_reason` to the Drizzle `auditLogs` model without a matching migration.
Drizzle therefore included those non-existent columns in every INSERT.

PostgreSQL returned error `42703`:

```text
column "deleted_at" of relation "audit_logs" does not exist
```

## Fix

The three soft-delete properties were removed from `auditLogs` in
`src/db/schema.ts`. Audit records are evidence and remain append-only; they are
not part of the generic soft-delete policy for mutable ERP business data.

No destructive migration is required and existing audit data is preserved.

`npm run migrate` now also verifies the required append-only audit columns.

## Run

```bash
npm run migrate
npm run dev
```

Then create/update/delete a Material or Business Partner. The server should no
longer print `[ERP audit] Failed to write audit log`.
