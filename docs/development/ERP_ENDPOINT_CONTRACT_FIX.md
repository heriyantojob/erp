# ERP endpoint contract fix

Canonical path is now the same end-to-end:

Browser -> Next.js rewrite -> Express

`/api/erp/<resource>` -> `/api/erp/<resource>` -> ERP router

The Express API also keeps `/erp/<resource>` as a legacy alias.

## Test order

1. `http://localhost:4000/health`
2. `http://localhost:3100/api/erp-health`
3. Sign in on the frontend.
4. `http://localhost:3100/api/erp/_diagnostic`
5. Open any ERP screen, e.g. Materials or Purchase Requisition.

Restart both servers after changing `next.config.js`.
