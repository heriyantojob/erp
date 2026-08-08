# Goods Receipt / Finished Goods Receipt error diagnostics

The API now distinguishes user validation, business-rule failures, foreign-key
errors, duplicate values, and database schema drift.

Examples shown in the frontend:

- `Material "RM-01" was not found or has been deleted.`
- `Purchase order "PO-01" must be approved before goods receipt. Current status: draft.`
- `Unit mismatch. Purchase order "PO-01" uses "kg", but "pcs" was submitted.`
- `Batch "B-01" already exists with expiry date 2026-08-29.`
- `Database schema is out of sync. Required column "deleted_at" on table "goods_receipt_headers" does not exist. Run "npm run migrate"... [DB 42703 ...]`
- `Invalid data reference (...) ... [DB 23503 ...]`

Before starting the API after upgrading this package:

```bash
cd erp-api
npm run migrate
npm run dev
```

Migration `0009_operational_schema_repair.sql` is idempotent and repairs older
prototype databases without dropping transaction data.
