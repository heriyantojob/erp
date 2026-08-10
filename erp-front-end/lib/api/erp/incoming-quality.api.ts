import { erpRequest } from "@/lib/api/erp-client";
export const incomingQualityApi = {
  list: (init?: RequestInit) =>
    erpRequest<any>("process/incoming-quality", init),
  inspect: (id: string, body: unknown) =>
    erpRequest<any>(
      `process/incoming-quality/${encodeURIComponent(id)}/inspect`,
      { method: "POST", body: JSON.stringify(body) },
    ),
};
