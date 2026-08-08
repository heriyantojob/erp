# Purchase Order Supplier: database suggestions + manual input

The Purchase Order supplier field now uses `AsyncCreatableSelect`.

- Opening the control loads up to 30 active suppliers from Business Partners.
- Typing searches supplier code and supplier name through:
  `GET /api/erp/business-partners/suppliers/options?q=...`
- Existing suggestions store their Business Partner code.
- A new manual value can be entered and confirmed with Enter.
- Manual values are automatically created/reactivated as Business Partner `type=supplier` inside the same Purchase Order database transaction.
- Goods Receipt can therefore resolve the PO supplier and mirrors it to the legacy `suppliers` table when needed.

Main files:
- `erp-front-end/components/erp/selects/SupplierSelect.tsx`
- `erp-front-end/lib/api/erp/business-partners.api.ts`
- `erp-front-end/app/[lang]/admin/_components/WorkflowStepClient.tsx`
- `erp-api/src/modules/erp/business-partners/business-partners.routes.ts`
- `erp-api/src/modules/erp/purchase-order/purchase-order.routes.ts`
- `erp-api/src/modules/erp/goods-receipt/goods-receipt.repository.ts`
