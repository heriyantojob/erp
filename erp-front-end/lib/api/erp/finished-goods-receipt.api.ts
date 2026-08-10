import { erpRequest } from "@/lib/api/erp-client";
export const finishedGoodsReceiptApi = {
  list: (init?: RequestInit) =>
    erpRequest<any>("process/finished-goods-receipts", init),
  create: (body: unknown) =>
    erpRequest<any>("process/finished-goods-receipts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
