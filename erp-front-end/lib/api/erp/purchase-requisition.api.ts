import { erpRequest } from "@/lib/api/erp-client";
export const purchaseRequisitionApi = {
  list: (init?: RequestInit) => erpRequest<any>("process/purchase-requisitions", init),
  create: (body: unknown) => erpRequest<any>("process/purchase-requisitions", { method: "POST", body: JSON.stringify(body) }),
  approve: (id: string) => erpRequest<any>(`process/purchase-requisitions/${encodeURIComponent(id)}/approve`, { method: "POST", body: JSON.stringify({}) }),
};
