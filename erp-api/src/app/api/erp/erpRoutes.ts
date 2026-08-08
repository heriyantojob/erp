import { Router } from "express";
import securityRouter from "@/modules/erp/security/security.routes";
import materialsRouter from "@/modules/erp/materials/materials.routes";
import businessPartnersRouter from "@/modules/erp/business-partners/business-partners.routes";
import legacyGoodsReceiptsRouter from "@/modules/erp/legacy-goods-receipts/legacy-goods-receipts.routes";
import billOfMaterialsRouter from "@/modules/erp/bill-of-materials/bill-of-materials.routes";
import fifoRouter from "@/modules/erp/fifo/fifo.routes";

const router = Router();

router.use(securityRouter);
router.use(materialsRouter);
router.use(businessPartnersRouter);
router.use(legacyGoodsReceiptsRouter);
router.use(billOfMaterialsRouter);
router.use(fifoRouter);

export default router;
