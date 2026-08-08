# Purchase Order Supplier Suggestion Fix

Problem reproduced from the UI:

- Business Partners contains `supplier / 01 / test`.
- Purchase Order typed `01` but React Select displayed only
  `Use manual supplier "01"`.

## Fix

`Business Partners` is now always the source of truth.

Supplier selection first calls:

`GET /api/erp/business-partners/suppliers/options?q=01`

If that optimized endpoint returns no rows or fails, the frontend automatically
falls back to:

`GET /api/erp/business-partners`

and filters active rows with `type === supplier` by code/name locally.
Therefore an active supplier visible in the Business Partners page (for example
`01 - test`) must also appear in Purchase Order suggestions.

If no matching supplier exists, `AsyncCreatableSelect` still offers:

`Use manual supplier "01"`

and Purchase Order creation will create the supplier master automatically.

## Relevant files

Frontend:
- `erp-front-end/components/erp/selects/SupplierSelect.tsx`
- `erp-front-end/lib/api/erp/business-partners.api.ts`

Backend:
- `erp-api/src/modules/erp/business-partners/business-partners.routes.ts`
- `erp-api/src/modules/erp/purchase-order/purchase-order.routes.ts`
- `erp-api/src/modules/erp/goods-receipt/goods-receipt.repository.ts`
