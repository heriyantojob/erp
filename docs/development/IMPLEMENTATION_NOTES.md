# ERP multilingual, soft delete, and RBAC changes

## Front end
- Added locale routing for `en`, `ko`, and `id` with Indonesian as the default.
- Added JSON dictionaries under `erp-front-end/dictionaries`.
- Added a language selector that preserves the current route.
- Moved shared admin navigation, CRUD actions, fields, and module titles into dictionaries.

## API
- Added soft-delete metadata (`deleted_at`, `deleted_by_user_id`, `delete_reason`) to ERP master and operational tables.
- Material, business partner, and BOM DELETE endpoints now update soft-delete metadata and write an audit log.
- Posted goods receipts and stock movements remain immutable; corrections must use reversal with a recorded reason.
- File and attachment deletion now marks records deleted rather than physically deleting database rows.
- Active-list and direct lookup queries exclude deleted records where updated.

## Migration and role seed
- Added migration `0005_soft_delete_and_default_rbac.sql`.
- `npm run migrate` now applies migrations and idempotently seeds:
  - System Administrator
  - Warehouse User
  - Production User
  - Supervisor / Approver
  - Management / Auditor

## Validation note
Dependency installation/build could not be completed in the execution environment because the configured npm registry returned 404 for `zod@4.4.3`. JSON and basic source structure checks passed. Run locally:

```bash
cd erp-api
npm install
npm run migrate
npm run build

cd ../erp-front-end
npm install
npm run build
```
