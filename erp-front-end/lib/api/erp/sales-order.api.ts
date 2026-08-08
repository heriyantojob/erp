import { erpRequest } from "@/lib/api/erp-client";
export const salesOrderApi = {
  list: (init?: RequestInit) => erpRequest<any>("process/sales-orders", init),
  create: (body: unknown) => erpRequest<any>("process/sales-orders", { method: "POST", body: JSON.stringify(body) }),
};
