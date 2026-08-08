# Supplier React Select / Purchase Order / Goods Receipt

Supplier is now selected from the database instead of a free-text field.

Flow:

Business Partners (`type = supplier`)
→ `GET /api/erp/business-partners/suppliers/options?q=...`
→ React `AsyncSelect`
→ Purchase Order stores `supplierCode`
→ Goods Receipt resolves the same supplier
→ legacy `suppliers` table is synchronized automatically for the old FK.

## Main files

Backend supplier search:
`erp-api/src/modules/erp/business-partners/business-partners.routes.ts`

Purchase Order validation:
`erp-api/src/modules/erp/purchase-order/purchase-order.routes.ts`

Goods Receipt supplier compatibility:
`erp-api/src/modules/erp/goods-receipt/goods-receipt.repository.ts`
`erp-api/src/modules/erp/goods-receipt/goods-receipt.service.ts`

Frontend API:
`erp-front-end/lib/api/erp/business-partners.api.ts`

Reusable React Select:
`erp-front-end/components/erp/selects/SupplierSelect.tsx`

Purchase Order form:
`erp-front-end/app/[lang]/admin/_components/WorkflowStepClient.tsx`

## Existing invalid Purchase Orders

Old Purchase Orders may already contain arbitrary supplier codes such as `111`.
If that code is not a supplier in Business Partners, either:
1. create Business Partner `111` with `type=supplier` if it is legitimate; or
2. recreate/update the PO with a valid supplier.

New Purchase Orders cannot store an unknown supplier through the normal API.
