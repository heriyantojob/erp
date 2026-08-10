import { erpRequest } from "@/lib/api/erp-client";
export const stockReversalApi = {
  reverse: (transactionNumber: string, body: unknown) =>
    erpRequest<any>(
      `stock/transactions/${encodeURIComponent(transactionNumber)}/reverse`,
      { method: "POST", body: JSON.stringify(body) },
    ),
};
