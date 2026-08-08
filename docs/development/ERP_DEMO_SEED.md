# ERP Demo Seed

Running `npm run migrate` in `erp-api` now also seeds the assessment demo accounts and the supplied FKA simulation data. The seed is designed to be rerunnable without duplicating the fixed simulation transactions.

## Demo users

| Role | Email | Password |
| --- | --- | --- |
| System Administrator | admin@erp.test | 1234asdf |
| Warehouse User | warehouse@erp.test | asdf1234 |
| Production User | production@erp.test | asdf1234 |
| Supervisor / Approver | approver@erp.test | asdf1234 |
| Management / Auditor | auditor@erp.test | asdf1234 |

These passwords are intentionally simple **demo-only credentials** and must not be reused in production.

## Simulation Material Master

- RM-001 — Rose Extract — Raw Material — kg
- RM-002 — Alcohol — Raw Material — liter
- RM-003 — Packaging Bottle — Packaging — pcs
- FG-001 — Aroma Blend A — Finished Goods — liter

## Business Partners

- SUP-001 — Supplier Alpha — supplier
- SUP-002 — Supplier Beta — supplier
- CUS-001 — Customer A — customer

Supplier/customer compatibility tables are synchronized as part of the seed.

## Goods Receipt opening transactions

- GR-26001 — 1 Aug 2026 — RM-001 — RE-26001 — expiry 31 Jul 2027 — 25 kg
- GR-26002 — 8 Aug 2026 — RM-001 — RE-26002 — expiry 7 Aug 2027 — 35 kg
- GR-26003 — 1 Aug 2026 — RM-002 — AL-26001 — expiry 31 Jul 2028 — 40 liter
- GR-26004 — 10 Aug 2026 — RM-002 — AL-26002 — expiry 9 Aug 2028 — 80 liter
- GR-26005 — 1 Aug 2026 — RM-003 — PKG-26001 — no expiry — 200 pcs

The PDF abbreviates Alcohol transaction units as `L`; the database seed normalizes them to the Material Master unit `liter` so validation remains consistent.

The PDF does not assign a supplier to each individual Goods Receipt, so the seeded receipt headers intentionally leave `supplier_code` null instead of inventing a relationship not present in the assessment data.

Seeded opening batches are marked `released` so the supplied stock can be demonstrated immediately in Current Stock, Stock Availability, FIFO, Material Issue, and Stock Ledger.

## Bill of Materials

For the supplied 20-liter FG-001 scenario:

- RM-001 Rose Extract — 4 kg
- RM-002 Alcohol — 16 liter
- RM-003 Packaging Bottle — 20 pcs

The current prototype `bill_of_materials` table stores component requirements only; therefore the seed preserves the supplied component quantities without inventing fields not present in the current schema.

## Commands

```bash
cd erp-api
npm run migrate
```

Manual reseed commands are also available:

```bash
npm run seed:demo-users
npm run seed:simulation
```
