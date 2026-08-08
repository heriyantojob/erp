import { Router } from "express";
import stockQueryRouter from "@/modules/erp/stock-query/stock-query.routes";
import stockReservationsRouter from "@/modules/erp/stock-reservations/stock-reservations.routes";
import goodsReceiptRouter from "@/modules/erp/goods-receipt/goods-receipt.routes";
import materialIssueRouter from "@/modules/erp/material-issue/material-issue.routes";
import stockReversalRouter from "@/modules/erp/stock-reversal/stock-reversal.routes";

const router = Router();

router.use(stockQueryRouter);
router.use(stockReservationsRouter);
router.use(goodsReceiptRouter);
router.use(materialIssueRouter);
router.use(stockReversalRouter);

export default router;
