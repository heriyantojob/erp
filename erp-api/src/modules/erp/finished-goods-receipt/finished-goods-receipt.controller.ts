import type { Request, Response } from "express";
import { sendApiError } from "@/lib/api-i18n";
import { finishedGoodsReceiptInputSchema } from "./finished-goods-receipt.schema";
import {
  createFinishedGoodsReceipt,
  listFinishedGoodsReceipts,
} from "./finished-goods-receipt.service";

export async function getFinishedGoodsReceipts(_req: Request, res: Response) {
  return res.json(await listFinishedGoodsReceipts());
}

export async function postFinishedGoodsReceipt(req: Request, res: Response) {
  try {
    const input = finishedGoodsReceiptInputSchema.parse(req.body);
    const result = await createFinishedGoodsReceipt(input, res.locals.user?.id);
    return res.status(201).json(result);
  } catch (error) {
    return sendApiError(req, res, error);
  }
}
