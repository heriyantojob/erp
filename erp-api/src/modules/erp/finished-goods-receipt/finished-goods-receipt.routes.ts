import { Router } from "express";
import { requireAnyPermission } from "@/middleware/auth/authorizationMiddleware";
import {
  getFinishedGoodsReceipts,
  postFinishedGoodsReceipt,
} from "./finished-goods-receipt.controller";

const router = Router();

router.get(
  "/process/finished-goods-receipts",
  requireAnyPermission("finished_goods.create", "stock.view"),
  getFinishedGoodsReceipts,
);

router.post(
  "/process/finished-goods-receipts",
  requireAnyPermission("finished_goods.create"),
  postFinishedGoodsReceipt,
);

export default router;
