# Clean Code ERP Structure

## Backend

ERP routes are now feature-based under:

```text
erp-api/src/modules/erp/
```

The previous large files remain only as **router aggregators**:

```text
src/app/api/erp/erpRoutes.ts
src/app/api/erp/stockRoutes.ts
src/app/api/erp/processRoutes.ts
```

Do not add new business logic to those three aggregator files. Add/change the relevant feature module instead.

Feature folders:

```text
src/modules/erp/
├── security/
├── materials/
├── business-partners/
├── legacy-goods-receipts/
├── bill-of-materials/
├── fifo/
├── stock-query/
├── stock-reservations/
├── goods-receipt/
├── material-issue/
├── stock-reversal/
├── process-summary/
├── purchase-requisition/
├── purchase-order/
├── incoming-quality/
├── production-order/
├── finished-goods-receipt/
├── sales-order/
└── delivery/
```

### Important backend files

- API validation/database error translation: `src/lib/api-i18n.ts`
- Database tables: `src/db/schema.ts`
- Authentication middleware: `src/middleware/auth/authUserMiddleware.ts`
- RBAC permission middleware: `src/middleware/auth/authorizationMiddleware.ts`
- Main ERP mount: `src/routes/coreRoutes.ts`
- Migration runner: `scripts/migrate.ts`
- Drizzle SQL migrations: `drizzle/*.sql`

## Frontend

All ERP endpoint strings are now centralized under:

```text
erp-front-end/lib/api/erp/
```

UI components should not invent `/api/erp/...` endpoint strings directly.

Feature API files include:

```text
materials.api.ts
business-partners.api.ts
bill-of-materials.api.ts
goods-receipts-master.api.ts
stock.api.ts
goods-receipt.api.ts
material-issue.api.ts
stock-reservations.api.ts
stock-reversal.api.ts
purchase-requisition.api.ts
purchase-order.api.ts
incoming-quality.api.ts
production-order.api.ts
finished-goods-receipt.api.ts
sales-order.api.ts
delivery.api.ts
users.api.ts
process-summary.api.ts
```

The common HTTP/error handler remains:

```text
erp-front-end/lib/api/erp-client.ts
```

If the API base URL, locale header, JSON response parsing, HTTP 401/403/404/500 handling,
or PostgreSQL diagnostic display is wrong, edit `erp-client.ts`.

## Debugging order

When a page fails:

1. Open browser Network and note method + URL.
2. Find that endpoint in `API_FILE_MAP.md`.
3. Check the frontend `*.api.ts` file.
4. Check the backend feature `*.routes.ts` file.
5. If the response mentions `DB 42703`, run `npm run migrate`.
6. If it mentions `DB 23503`, inspect the named foreign-key constraint/reference.
7. If it mentions `DB 23505`, inspect the named unique constraint and duplicate value.
8. Check `src/db/schema.ts` if the Drizzle query expects a column that differs from PostgreSQL.
