import { erpRequest } from "@/lib/api/erp-client";
export const deliveryApi = {
  list: (init?: RequestInit) => erpRequest<any>("process/deliveries", init),
  create: (body: unknown) =>
    erpRequest<any>("process/deliveries", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
