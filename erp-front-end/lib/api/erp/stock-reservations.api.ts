import { erpRequest } from "@/lib/api/erp-client";
export const stockReservationsApi = {
  list: (status = "active", init?: RequestInit) => erpRequest<any>(`stock/reservations?status=${encodeURIComponent(status)}`, init),
  create: (body: unknown) => erpRequest<any>("stock/reservations", { method: "POST", body: JSON.stringify(body) }),
  release: (id: string, body: unknown) => erpRequest<any>(`stock/reservations/${encodeURIComponent(id)}/release`, { method: "POST", body: JSON.stringify(body) }),
};
