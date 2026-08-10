# FKA ERP Postman

## Import
Import:
1. `FKA_ERP_API.postman_collection.json`
2. `FKA_ERP_Local.postman_environment.json`

Select **FKA ERP - Local**.

## Run order
1. Start PostgreSQL and run ERP migrations/seeds.
2. Start `erp-api` on port 4000.
3. Run **00 - System & Authentication > Sign In - System Administrator**.
4. Postman should retain the Better Auth session cookie automatically.
5. Run master-data requests before dependent transaction requests.
6. Fill dynamic environment IDs (`purchaseOrderId`, `stockBalanceId`, `productionOrderId`, etc.) from preceding API responses.

## Language
Set `locale` to `en`, `id`, or `ko`. Requests send `x-locale: {{locale}}`.

## Important
The collection uses the canonical `/api/erp` prefix. The source also mounts `/erp` as a backward-compatible alias.
Some transaction endpoints depend on valid IDs and workflow state from prior requests; placeholder UUID variables must be replaced with real response values.
Posted legacy goods-receipt deletion intentionally returns HTTP 405; stock corrections should use the reversal endpoint.
