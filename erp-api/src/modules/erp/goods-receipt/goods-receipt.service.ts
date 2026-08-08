import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/setup";
import {
  auditLogs,
  batchLots,
  goodsReceiptHeaders,
  goodsReceiptLines,
  purchaseOrders,
  qualityInspections,
  stockBalances,
  stockTransactions,
} from "@/db/schema";
import type { GoodsReceiptInput } from "./goods-receipt.schema";
import {
  ensureSupplierFromBusinessPartner,
  findActiveMaterial,
  findBatch,
  findPurchaseOrder,
  findReceiptByNumber,
  getDefaultRawMaterialStorage,
} from "./goods-receipt.repository";

export async function createGoodsReceipt(input: GoodsReceiptInput, userId?: string | null) {
  const material = await findActiveMaterial(db, input.materialCode);
  if (!material) {
    throw new Error(`Material "${input.materialCode}" was not found or has been deleted.`);
  }
  if (material.unit !== input.unit) {
    throw new Error(
      `Unit mismatch for material "${input.materialCode}". Expected "${material.unit}", received "${input.unit}".`,
    );
  }
  if (input.expiryDate && input.expiryDate < input.receivedAt) {
    throw new Error("Expiry date cannot be earlier than the receipt date.");
  }

  return db.transaction(async (tx) => {
    const existing = await findReceiptByNumber(tx, input.receiptNumber);
    if (existing) {
      return {
        idempotent: true,
        receiptId: existing.id,
        message: `Receipt number "${input.receiptNumber}" has already been posted.`,
      };
    }

    const storage = await getDefaultRawMaterialStorage(tx);
    const po = input.purchaseOrderId
      ? await findPurchaseOrder(tx, input.purchaseOrderId)
      : undefined;

    if (input.purchaseOrderId && !po) throw new Error("Purchase order not found.");
    if (po && po.status !== "approved") {
      throw new Error(
        `Purchase order "${po.orderNumber}" must be approved before goods receipt. Current status: ${po.status}.`,
      );
    }
    if (po && po.materialCode !== input.materialCode) {
      throw new Error(
        `Material mismatch. Purchase order "${po.orderNumber}" expects "${po.materialCode}", but "${input.materialCode}" was submitted.`,
      );
    }
    if (po && po.unit !== input.unit) {
      throw new Error(
        `Unit mismatch. Purchase order "${po.orderNumber}" uses "${po.unit}", but "${input.unit}" was submitted.`,
      );
    }
    if (po && Number(input.quantity) > Number(po.quantity)) {
      throw new Error(
        `Receipt quantity ${input.quantity} ${input.unit} exceeds purchase order quantity ${po.quantity} ${po.unit}.`,
      );
    }

    let supplierCode: string | null = null;
    if (po?.supplierCode) {
      const supplier = await ensureSupplierFromBusinessPartner(tx, po.supplierCode);
      if (!supplier) {
        throw new Error(
          `Supplier "${po.supplierCode}" from purchase order "${po.orderNumber}" was not found as an active supplier. Select a valid supplier in Business Partners and update the Purchase Order.`,
        );
      }
      supplierCode = supplier.code;
    }

    let batch = await findBatch(tx, input.materialCode, input.batchNumber);
    if (batch?.expiryDate && input.expiryDate && batch.expiryDate !== input.expiryDate) {
      throw new Error(
        `Batch "${input.batchNumber}" already exists with expiry date ${batch.expiryDate}. ` +
        "Use the same expiry date or create a different batch number.",
      );
    }

    if (!batch) {
      batch = (await tx
        .insert(batchLots)
        .values({
          materialCode: input.materialCode,
          batchNumber: input.batchNumber,
          receivedAt: input.receivedAt,
          expiryDate: input.expiryDate ?? null,
          qualityStatus: "quarantine",
        })
        .returning({
          id: batchLots.id,
          materialCode: batchLots.materialCode,
          batchNumber: batchLots.batchNumber,
          expiryDate: batchLots.expiryDate,
        }))[0];
    }

    if (!batch) throw new Error("Failed to create or resolve the batch.");

    await tx
      .update(batchLots)
      .set({ qualityStatus: "quarantine", updatedAt: new Date() })
      .where(eq(batchLots.id, batch.id));

    const header = (await tx
      .insert(goodsReceiptHeaders)
      .values({
        receiptNumber: input.receiptNumber,
        receivedAt: input.receivedAt,
        supplierCode,
        warehouseId: storage.warehouse.id,
        status: "posted",
        externalDocumentNumber: po?.orderNumber ?? null,
        createdByUserId: userId ?? null,
      })
      .returning({ id: goodsReceiptHeaders.id }))[0];

    if (!header) throw new Error("Failed to create the goods receipt header.");

    await tx.insert(goodsReceiptLines).values({
      receiptId: header.id,
      lineNumber: 1,
      materialCode: input.materialCode,
      batchLotId: batch.id,
      locationId: storage.location.id,
      quantity: input.quantity,
      unit: input.unit,
      qualityStatus: "quarantine",
    });

    await tx
      .insert(qualityInspections)
      .values({
        receiptId: header.id,
        batchLotId: batch.id,
        status: "pending",
      })
      .onConflictDoNothing();

    await tx
      .insert(stockBalances)
      .values({
        materialCode: input.materialCode,
        batchLotId: batch.id,
        warehouseId: storage.warehouse.id,
        locationId: storage.location.id,
        quantityOnHand: input.quantity,
        unit: input.unit,
      })
      .onConflictDoUpdate({
        target: [
          stockBalances.materialCode,
          stockBalances.batchLotId,
          stockBalances.warehouseId,
          stockBalances.locationId,
        ],
        set: {
          quantityOnHand: sql`${stockBalances.quantityOnHand} + ${input.quantity}`,
          updatedAt: new Date(),
        },
      });

    await tx.insert(stockTransactions).values({
      transactionNumber: `GR-${crypto.randomUUID()}`,
      transactionType: "goods_receipt",
      materialCode: input.materialCode,
      batchLotId: batch.id,
      warehouseId: storage.warehouse.id,
      locationId: storage.location.id,
      quantityIn: input.quantity,
      quantityOut: "0",
      unit: input.unit,
      referenceType: "goods_receipt",
      referenceId: header.id,
      createdByUserId: userId ?? null,
    });

    if (po) {
      await tx
        .update(purchaseOrders)
        .set({ status: "received", updatedAt: new Date() })
        .where(eq(purchaseOrders.id, po.id));
    }

    await tx.insert(auditLogs).values({
      actorUserId: userId ?? null,
      action: "goods_receipt_post",
      entityType: "goods_receipt",
      entityId: header.id,
      afterData: input,
    });

    return {
      idempotent: false,
      receiptId: header.id,
      batchLotId: batch.id,
      warehouseCode: storage.warehouse.code,
      locationCode: storage.location.code,
      qualityStatus: "quarantine",
    };
  });
}
