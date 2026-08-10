import { erpRequest } from "@/lib/api/erp-client";
export const billOfMaterialsApi = {
  list: (init?: RequestInit) => erpRequest<any>("bill-of-materials", init),
  create: (body: unknown) =>
    erpRequest<any>("bill-of-materials", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, body: unknown) =>
    erpRequest<any>(`bill-of-materials/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  remove: (id: string, body?: unknown) =>
    erpRequest<any>(`bill-of-materials/${encodeURIComponent(id)}`, {
      method: "DELETE",
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
};
