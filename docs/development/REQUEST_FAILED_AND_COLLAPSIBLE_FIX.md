# Request Failed + Collapsible Sidebar Fix

## What changed

- All browser ERP requests now use same-origin `/erp/*`. Next.js proxies them to `NEXT_PUBLIC_API_URL_EXPRESS`.
- Better Auth also stays on the Next.js origin through `/api/auth/*`, reducing CORS/cookie problems.
- A shared `lib/api/erp-client.ts` parses JSON/text errors consistently and reports HTTP 401/403/404/5xx clearly instead of only `Request failed`.
- Express global error middleware now always returns a valid JSON error response and defaults to HTTP 500 when an untyped error reaches it.
- Sidebar sections are collapsible: Overview, Process Flow, Controls & Inventory, and Master Data. User Management remains at the very top.

## Local run

API: `npm run migrate && npm run dev` (port from `erp-api/.env`, currently 4000).
Frontend: `npm run dev` (port 3100).

If an API still fails, the UI should now show the actual HTTP status/message. Check `http://localhost:4000/health` and `http://localhost:3100/api/erp-health`.
