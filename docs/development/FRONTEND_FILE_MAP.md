# Frontend Page File Map

| Feature | URL | Page | UI component | API service |
|---|---|---|---|---|
| User Management | `/[lang]/admin/users` | `app/[lang]/admin/users/page.tsx` | `app/[lang]/admin/users/user-management-client.tsx` | `lib/api/erp/users.api.ts` |
| Materials | `/[lang]/admin/materials` | `app/[lang]/admin/materials/page.tsx` | `app/[lang]/admin/_components/ErpCrudClient.tsx` | `lib/api/erp/materials.api.ts` |
| Business Partners | `/[lang]/admin/business-partners` | `app/[lang]/admin/business-partners/page.tsx` | `app/[lang]/admin/_components/ErpCrudClient.tsx` | `lib/api/erp/business-partners.api.ts` |
| Bill of Materials | `/[lang]/admin/bill-of-materials` | `app/[lang]/admin/bill-of-materials/page.tsx` | `app/[lang]/admin/_components/ErpCrudClient.tsx` | `lib/api/erp/bill-of-materials.api.ts` |
| Goods Receipt master/legacy | `/[lang]/admin/goods-receipts` | `app/[lang]/admin/goods-receipts/page.tsx` | `app/[lang]/admin/_components/ErpCrudClient.tsx` | `lib/api/erp/goods-receipts-master.api.ts` |
| Goods Receipt Input | `/[lang]/admin/goods-receipt-input` | `app/[lang]/admin/goods-receipt-input/page.tsx` | `app/[lang]/admin/_components/StockPrototypeClient.tsx` | `lib/api/erp/goods-receipt.api.ts` |
| Material Issue | `/[lang]/admin/material-issues` | `app/[lang]/admin/material-issues/page.tsx` | `app/[lang]/admin/_components/StockPrototypeClient.tsx` | `lib/api/erp/material-issue.api.ts` |
| Stock Availability | `/[lang]/admin/stock-availability` | `app/[lang]/admin/stock-availability/page.tsx` | `app/[lang]/admin/_components/StockPrototypeClient.tsx` | `lib/api/erp/stock.api.ts + stock-reservations.api.ts` |
| Current Stock | `/[lang]/admin/current-stock` | `app/[lang]/admin/current-stock/page.tsx` | `app/[lang]/admin/_components/StockPrototypeClient.tsx` | `lib/api/erp/stock.api.ts` |
| Stock Ledger | `/[lang]/admin/stock-ledger` | `app/[lang]/admin/stock-ledger/page.tsx` | `app/[lang]/admin/_components/StockPrototypeClient.tsx` | `lib/api/erp/stock.api.ts + stock-reversal.api.ts` |
| Purchase Requisition | `/[lang]/admin/purchase-requisition` | `app/[lang]/admin/purchase-requisition/page.tsx` | `app/[lang]/admin/_components/WorkflowStepClient.tsx` | `lib/api/erp/purchase-requisition.api.ts` |
| Purchase Order | `/[lang]/admin/purchase-order` | `app/[lang]/admin/purchase-order/page.tsx` | `app/[lang]/admin/_components/WorkflowStepClient.tsx` | `lib/api/erp/purchase-order.api.ts` |
| Incoming Quality | `/[lang]/admin/incoming-quality` | `app/[lang]/admin/incoming-quality/page.tsx` | `app/[lang]/admin/_components/WorkflowStepClient.tsx` | `lib/api/erp/incoming-quality.api.ts` |
| Production Order | `/[lang]/admin/production-order` | `app/[lang]/admin/production-order/page.tsx` | `app/[lang]/admin/_components/WorkflowStepClient.tsx` | `lib/api/erp/production-order.api.ts` |
| Manufacturing | `/[lang]/admin/manufacturing` | `app/[lang]/admin/manufacturing/page.tsx` | `app/[lang]/admin/_components/WorkflowStepClient.tsx` | `lib/api/erp/production-order.api.ts` |
| Finished Goods Receipt | `/[lang]/admin/finished-goods-receipt` | `app/[lang]/admin/finished-goods-receipt/page.tsx` | `app/[lang]/admin/_components/WorkflowStepClient.tsx` | `lib/api/erp/finished-goods-receipt.api.ts` |
| Sales Order | `/[lang]/admin/sales-order` | `app/[lang]/admin/sales-order/page.tsx` | `app/[lang]/admin/_components/WorkflowStepClient.tsx` | `lib/api/erp/sales-order.api.ts` |
| Customer Delivery | `/[lang]/admin/customer-delivery` | `app/[lang]/admin/customer-delivery/page.tsx` | `app/[lang]/admin/_components/WorkflowStepClient.tsx` | `lib/api/erp/delivery.api.ts` |
