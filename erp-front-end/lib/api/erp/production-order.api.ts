import { erpRequest } from "@/lib/api/erp-client";
export const productionOrderApi = {
  list: (init?: RequestInit) => erpRequest<any>("process/production-orders", init),
  create: (body: unknown) => erpRequest<any>("process/production-orders", { method: "POST", body: JSON.stringify(body) }),
  start: (id: string) => erpRequest<any>(`process/production-orders/${encodeURIComponent(id)}/start`, { method: "POST", body: JSON.stringify({}) }),
  complete: (id: string) => erpRequest<any>(`process/production-orders/${encodeURIComponent(id)}/complete`, { method: "POST", body: JSON.stringify({}) }),
};
