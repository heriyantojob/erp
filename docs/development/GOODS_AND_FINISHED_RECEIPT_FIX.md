# Goods Receipt & Finished Goods Receipt database fix

## Root cause

Both posting flows write an immutable stock-ledger row into `stock_transactions`.
The original database migration creates that table without generic soft-delete
columns. A later TypeScript schema revision accidentally declared
`deleted_at`, `deleted_by_user_id`, and `delete_reason` on `stockTransactions`.
Drizzle therefore included those non-existent columns in INSERT statements,
which PostgreSQL rejected as a database constraint/schema error.

## Correct design

`stock_transactions` is an append-only ledger, just like `audit_logs`.
Posted stock movements are never deleted. Corrections use the existing reversal
endpoint and create a counter-entry.

The Drizzle model now matches the database again and does not declare soft-delete
columns on `stockTransactions`.

## Affected flows

- Goods Receipt Input -> stock transaction `goods_receipt`
- Finished Goods Receipt -> stock transaction `finished_goods_receipt`
- Material Issue and Customer Delivery also benefit from the same fix

## Run

```bash
cd erp-api
npm run migrate
npm run dev
```

No destructive SQL, table drop, or data reset is required.
