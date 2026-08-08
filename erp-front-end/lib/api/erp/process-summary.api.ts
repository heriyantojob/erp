import { erpRequest } from "@/lib/api/erp-client";
export const processSummaryApi = {
  get: (init?: RequestInit) => erpRequest<any>("process/summary", init),
};
