# TypeScript Build Fix

Fixed the nine TypeScript errors reported by `npm run build`.

## Changes

- `src/lib/api-i18n.ts`
  - Replaced `String.replaceAll()` with ES2020-compatible `split(...).join(...)`.
- `delivery.routes.ts`
  - Guard inserted delivery header before using `header.id`.
- `incoming-quality.routes.ts`
  - Guard updated quality inspection row before audit.
- `production-order.routes.ts`
  - Guard inserted production order before audit.
- `purchase-requisition.routes.ts`
  - Guard inserted purchase requisition before audit.
- `sales-order.routes.ts`
  - Guard inserted stock reservation and sales order before using their IDs.

These guards are appropriate with `noUncheckedIndexedAccess: true` because Drizzle `.returning()[0]` has the type `Row | undefined`.

The project intentionally keeps `target: ES2020`; no tsconfig target upgrade is required for interpolation.

## Verification note

The source-level errors from the supplied build log have been fixed. In the ChatGPT build container, dependency installation could not complete because the internal npm mirror did not contain `zod@4.4.3`, so a full local npm build could not be reproduced there. Run on the project machine:

```bash
npm install
npm run build
```
