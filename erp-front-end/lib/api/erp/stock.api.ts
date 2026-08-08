import { erpRequest } from "@/lib/api/erp-client";
export const stockApi = {
  availability: (init?: RequestInit) => erpRequest<any>("stock/availability", init),
  current: (init?: RequestInit) => erpRequest<any>("stock/current-stock", init),
  ledger: (init?: RequestInit) => erpRequest<any>("stock/ledger", init),
};
