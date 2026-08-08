import { Router } from "express";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/setup";
import { sendApiError } from "@/lib/api-i18n";
import { requireAnyPermission } from "@/middleware/auth/authorizationMiddleware";
import { auditLogs, batchLots, businessPartners, customers, deliveryHeaders, deliveryLines, finishedGoodsReceipts, goodsReceiptHeaders, goodsReceiptLines, locations, materials, productionOrders, purchaseOrders, purchaseRequisitions, qualityInspections, salesOrders, stockBalances, stockReservations, stockTransactions, warehouses } from "@/db/schema";

const router = Router();
const code = z.string().trim().min(1).max(50);
const qty = z.coerce.string().regex(/^\d+(?:\.\d{1,3})?$/).refine(v => Number(v) > 0, "Quantity must be greater than zero");
const date = z.string().date().nullable().optional();
const reason = z.string().trim().min(3).max(500);
const prInput = z.object({ requisitionNumber: code, materialCode: code, quantity: qty, unit: z.string().trim().min(1).max(30), neededAt: date, notes: z.string().trim().max(1000).nullable().optional() });
const poInput = z.object({ orderNumber: code, requisitionId: z.string().uuid().nullable().optional(), supplierCode: code, materialCode: code, quantity: qty, unit: z.string().trim().min(1).max(30), expectedAt: date });
const poStatus = z.object({ status: z.enum(["approved", "cancelled"]), reason: reason.optional() });
const qaInput = z.object({ status: z.enum(["released", "rejected"]), result: reason });
const productionInput = z.object({ orderNumber: code, finishedMaterialCode: code, plannedQuantity: qty, unit: z.string().trim().min(1).max(30), plannedAt: date });
const fgInput = z.object({ productionOrderId: z.string().uuid(), batchNumber: z.string().trim().min(1).max(100), quantity: qty, unit: z.string().trim().min(1).max(30) });
const salesInput = z.object({ orderNumber: code, customerCode: code.nullable().optional(), materialCode: code, quantity: qty, unit: z.string().trim().min(1).max(30), requestedAt: date, stockBalanceId: z.string().uuid() });
const deliveryInput = z.object({ deliveryNumber: code, salesOrderId: z.string().uuid(), deliveredAt: z.string().date() });
function milli(v: string){ const [w="0", f=""] = String(v).split("."); return BigInt(w)*1000n+BigInt(f.padEnd(3,"0")); }
function dec(v: bigint){ const w=v/1000n, f=(v%1000n).toString().padStart(3,"0").replace(/0+$/,""); return f?`${w}.${f}`:String(w); }
async function storage(tx:any, codeValue:string, name:string){ let w=(await tx.select().from(warehouses).where(eq(warehouses.code,codeValue)))[0]; if(!w) w=(await tx.insert(warehouses).values({code:codeValue,name}).returning())[0]; let l=(await tx.select().from(locations).where(and(eq(locations.warehouseId,w.id),eq(locations.code,`${codeValue}-01`))))[0]; if(!l) l=(await tx.insert(locations).values({warehouseId:w.id,code:`${codeValue}-01`,name:`${name} Storage`}).returning())[0]; return {w,l}; }
async function audit(tx:any, res:any, action:string, type:string, id:string, data:any){ await tx.insert(auditLogs).values({actorUserId:res.locals.user?.id,action,entityType:type,entityId:id,afterData:data}); }

router.get("/process/purchase-orders", requireAnyPermission("purchase_order.manage","transaction.approve","goods_receipt.create"), async (_req,res)=>res.json(await db.select().from(purchaseOrders).where(isNull(purchaseOrders.deletedAt)).orderBy(desc(purchaseOrders.createdAt))));
router.post("/process/purchase-orders", requireAnyPermission("purchase_order.manage"), async (req,res)=>{
  try {
    const x = poInput.parse(req.body);

    const row = await db.transaction(async (tx) => {
      const existingPartner = (await tx
        .select({
          code: businessPartners.code,
          name: businessPartners.name,
          type: businessPartners.type,
          deletedAt: businessPartners.deletedAt,
        })
        .from(businessPartners)
        .where(eq(businessPartners.code, x.supplierCode))
        .limit(1))[0];

      if (existingPartner && existingPartner.type !== "supplier") {
        throw new Error(
          `Business Partner code "${x.supplierCode}" already belongs to a customer. ` +
          `Use a different supplier code or update the Business Partner master first.`,
        );
      }

      let supplier: { code: string; name: string } | undefined;

      if (existingPartner?.type === "supplier") {
        if (existingPartner.deletedAt) {
          supplier = (await tx
            .update(businessPartners)
            .set({
              deletedAt: null,
              deletedByUserId: null,
              deleteReason: null,
              updatedAt: new Date(),
            })
            .where(eq(businessPartners.code, x.supplierCode))
            .returning({
              code: businessPartners.code,
              name: businessPartners.name,
            }))[0];
        } else {
          supplier = {
            code: existingPartner.code,
            name: existingPartner.name,
          };
        }
      } else {
        // Creatable supplier UX: a new manual code becomes a supplier master
        // record inside the same transaction as the Purchase Order.
        supplier = (await tx
          .insert(businessPartners)
          .values({
            code: x.supplierCode,
            name: x.supplierCode,
            type: "supplier",
          })
          .returning({
            code: businessPartners.code,
            name: businessPartners.name,
          }))[0];
      }

      if (!supplier) throw new Error("Supplier could not be resolved or created.");

      const created = (await tx.insert(purchaseOrders).values({
        ...x,
        requisitionId: x.requisitionId ?? null,
        supplierCode: supplier.code,
        expectedAt: x.expectedAt ?? null,
        status: "draft",
        createdByUserId: res.locals.user?.id,
      }).returning())[0];

      if (!created) throw new Error("Purchase order was not created.");

      if (created.requisitionId) {
        await tx.update(purchaseRequisitions)
          .set({ status: "converted", updatedAt: new Date() })
          .where(eq(purchaseRequisitions.id, created.requisitionId));
      }

      await audit(tx, res, "purchase_order_create", "purchase_order", created.id, {
        ...created,
        supplierCreatedFromManualInput: supplier.name === supplier.code,
      });

      return created;
    });

    return res.status(201).json(row);
  } catch(e) {
    return sendApiError(req,res,e);
  }
});
router.post("/process/purchase-orders/:id/status", requireAnyPermission("transaction.approve"), async (req,res)=>{try{const x=poStatus.parse(req.body); const row=(await db.update(purchaseOrders).set({status:x.status,approvedByUserId:x.status==="approved"?res.locals.user?.id:null,approvedAt:x.status==="approved"?new Date():null,updatedAt:new Date()}).where(eq(purchaseOrders.id,String(req.params.id))).returning())[0]; if(!row)return res.status(404).json({message:"Purchase order not found"}); await audit(db,res,`purchase_order_${x.status}`,"purchase_order",row.id,{...row,reason:x.reason});res.json(row);}catch(e){sendApiError(req,res,e);} });

export default router;
