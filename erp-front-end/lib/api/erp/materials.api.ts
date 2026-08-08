import { erpRequest } from "@/lib/api/erp-client";
export const materialsApi = {
  list: (init?: RequestInit) => erpRequest<any>("materials", init),
  create: (body: unknown) => erpRequest<any>("materials", { method: "POST", body: JSON.stringify(body) }),
  update: (code: string, body: unknown) => erpRequest<any>(`materials/${encodeURIComponent(code)}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (code: string, body?: unknown) => erpRequest<any>(`materials/${encodeURIComponent(code)}`, { method: "DELETE", ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),
};
