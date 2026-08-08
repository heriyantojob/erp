import type { Request, Response } from "express";
import { sendApiError } from "@/lib/api-i18n";
import { goodsReceiptInputSchema } from "./goods-receipt.schema";
import { createGoodsReceipt } from "./goods-receipt.service";

export async function postGoodsReceipt(req: Request, res: Response) {
  try {
    const input = goodsReceiptInputSchema.parse(req.body);
    const result = await createGoodsReceipt(input, res.locals.user?.id);
    return res.status(result.idempotent ? 200 : 201).json(result);
  } catch (error) {
    return sendApiError(req, res, error);
  }
}
