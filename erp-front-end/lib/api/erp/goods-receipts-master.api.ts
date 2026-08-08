import { erpRequest } from "@/lib/api/erp-client";
export const goodsReceiptsMasterApi = {
  list: (init?: RequestInit) => erpRequest<any>("goods-receipts", init),
  create: (body: unknown) => erpRequest<any>("goods-receipts", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: unknown) => erpRequest<any>(`goods-receipts/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: string, body?: unknown) => erpRequest<any>(`goods-receipts/${encodeURIComponent(id)}`, { method: "DELETE", ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),
};
