import { Router } from "express";
import { requireAnyPermission } from "@/middleware/auth/authorizationMiddleware";
import { postGoodsReceipt } from "./goods-receipt.controller";

const router = Router();

router.post(
  "/stock/goods-receipts",
  requireAnyPermission("goods_receipt.create"),
  postGoodsReceipt,
);

export default router;
