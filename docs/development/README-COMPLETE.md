# ERP Complete Source Code

Paket ini berisi:

- `erp-api`: API ERP dengan soft delete, audit trail, reversal transaksi, dan seed role RBAC.
- `erp-front-end`: Next.js frontend dengan routing locale dan dictionary per fitur untuk `id`, `en`, dan `ko`, termasuk `LocaleSwitcher` global.

## Struktur

```text
erp/
├── erp-api/
├── erp-front-end/
├── IMPLEMENTATION_NOTES.md
└── README-COMPLETE.md
```

## Menjalankan API

```bash
cd erp-api
npm install
npm run migrate
npm run dev
```

Sesuaikan konfigurasi environment/database sebelum menjalankan migrasi.

## Menjalankan Frontend

```bash
cd erp-front-end
npm install
npm run dev
```

Contoh URL locale:

- `/id`
- `/en`
- `/ko`


## ERP Demo Users

Running `npm run migrate` in `erp-api` creates or restores these demo accounts and assigns their default RBAC role:

- System Administrator: `admin@erp.test` / `1234asdf`
- Warehouse User: `warehouse@erp.test` / `asdf1234`
- Production User: `production@erp.test` / `asdf1234`
- Supervisor / Approver: `approver@erp.test` / `asdf1234`
- Management / Auditor: `auditor@erp.test` / `asdf1234`

Change these passwords outside demo/development environments.

## Assessment simulation seed

`npm run migrate` also seeds the supplied assessment simulation data: Material Master, Business Partners, the five August 2026 Goods Receipts and their released opening-stock batches, and the three BOM component requirements. See `ERP_DEMO_SEED.md` for the exact records and the small normalization/assumption notes.

You can rerun only the assessment data seed with:

```bash
cd erp-api
npm run seed:simulation
```

## Assessment documentation

The assessment package is now mapped to the supplied FKA requirements:

- `docs/ASSESSMENT_REPORT.md` - consolidated Tasks 1-9 report and prototype evidence.
- `docs/PROCESS_FLOW.md` - detailed PR -> Customer Delivery process/control matrix.
- `docs/DATA_DICTIONARY.md` - ERD/table key/field explanation.
- `docs/ASSESSMENT_SQL.sql` - PostgreSQL queries for Current Stock, Ledger, Expiry, Traceability and Reconciliation.
- `docs/ARCHITECTURE_IMPLEMENTATION_DR.md` - architecture, scalability, operating cost, DR and implementation approach.
- `docs/PROTOTYPE_SCREENSHOTS.md` + `docs/screenshots/` - prototype screenshot evidence.

## Environment templates

Existing local `.env` / `.env.local` files are left unchanged in this working copy. Sanitized templates are provided at:

```text
erp-api/.env.example
erp-front-end/.env.example
```

For a final public repository or external submission, review the real environment files first and do not publish actual passwords, tokens, API keys, or confidential endpoints.
