import { erpRequest } from "@/lib/api/erp-client";
export const goodsReceiptApi = {
  create: (body: unknown) => erpRequest<any>("stock/goods-receipts", { method: "POST", body: JSON.stringify(body) }),
};
