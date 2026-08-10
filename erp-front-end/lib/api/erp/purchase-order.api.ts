import { erpRequest } from "@/lib/api/erp-client";
export const purchaseOrderApi = {
  list: (init?: RequestInit) =>
    erpRequest<any>("process/purchase-orders", init),
  create: (body: unknown) =>
    erpRequest<any>("process/purchase-orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  setStatus: (id: string, body: unknown) =>
    erpRequest<any>(
      `process/purchase-orders/${encodeURIComponent(id)}/status`,
      { method: "POST", body: JSON.stringify(body) },
    ),
};
