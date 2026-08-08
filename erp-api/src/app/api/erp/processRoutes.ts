import { Router } from "express";
import processSummaryRouter from "@/modules/erp/process-summary/process-summary.routes";
import purchaseRequisitionRouter from "@/modules/erp/purchase-requisition/purchase-requisition.routes";
import purchaseOrderRouter from "@/modules/erp/purchase-order/purchase-order.routes";
import incomingQualityRouter from "@/modules/erp/incoming-quality/incoming-quality.routes";
import productionOrderRouter from "@/modules/erp/production-order/production-order.routes";
import finishedGoodsReceiptRouter from "@/modules/erp/finished-goods-receipt/finished-goods-receipt.routes";
import salesOrderRouter from "@/modules/erp/sales-order/sales-order.routes";
import deliveryRouter from "@/modules/erp/delivery/delivery.routes";

const router = Router();

router.use(processSummaryRouter);
router.use(purchaseRequisitionRouter);
router.use(purchaseOrderRouter);
router.use(incomingQualityRouter);
router.use(productionOrderRouter);
router.use(finishedGoodsReceiptRouter);
router.use(salesOrderRouter);
router.use(deliveryRouter);

export default router;
