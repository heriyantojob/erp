# ERP Endpoint Proxy Fix

Frontend ERP requests now use an explicit Next.js App Router proxy:

- Browser: `/api/erp/materials`
- Next proxy: `app/api/erp/[...path]/route.ts`
- Express: `/erp/materials`

This replaces the previous broad `/erp/:path*` rewrite, which could return a
Next.js 404 before the request reached Express.

## Quick checks

Start `erp-api` on port 4000 and `erp-front-end` on port 3100, then open:

- `http://localhost:4000/health`
- `http://localhost:3100/api/erp-health`

After signing in, this endpoint verifies that the authenticated ERP router is mounted:

- `http://localhost:3100/api/erp/_diagnostic`

If an Express ERP endpoint is genuinely missing, the API now reports the exact
method and path, for example:

`ERP endpoint not found: GET /erp/example`

Frontend calls are centralized in `lib/api/erp-client.ts` and should pass paths
without an `/erp` prefix, e.g. `erpRequest("materials")`.
