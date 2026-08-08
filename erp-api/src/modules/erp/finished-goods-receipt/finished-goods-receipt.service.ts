import { eq, sql } from "drizzle-orm";
import { db } from "@/db/setup";
import {
  auditLogs,
  batchLots,
  finishedGoodsReceipts,
  productionOrders,
  stockBalances,
  stockTransactions,
} from "@/db/schema";
import type { FinishedGoodsReceiptInput } from "./finished-goods-receipt.schema";
import {
  findFinishedGoodsBatch,
  findProductionOrder,
  getFinishedGoodsStorage,
  listReceiptQuantities,
} from "./finished-goods-receipt.repository";

function milli(value: string) {
  const [whole = "0", fraction = ""] = String(value).split(".");
  return BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, "0"));
}

function decimal(value: bigint) {
  const whole = value / 1000n;
  const fraction = (value % 1000n).toString().padStart(3, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

export async function createFinishedGoodsReceipt(
  input: FinishedGoodsReceiptInput,
  userId?: string | null,
) {
  return db.transaction(async (tx) => {
    const productionOrder = await findProductionOrder(tx, input.productionOrderId);

    if (!productionOrder) throw new Error("Production order not found.");
    if (!["in_progress", "completed"].includes(productionOrder.status)) {
      throw new Error(
        `Production order "${productionOrder.orderNumber}" must be in progress before receiving finished goods. Current status: ${productionOrder.status}.`,
      );
    }
    if (input.unit !== productionOrder.unit) {
      throw new Error(
        `Unit mismatch. Production order "${productionOrder.orderNumber}" uses "${productionOrder.unit}", but "${input.unit}" was submitted.`,
      );
    }

    const previousReceipts = await listReceiptQuantities(tx, productionOrder.id);
    const alreadyReceived = previousReceipts.reduce(
      (sum: bigint, item: { quantity: string }) => sum + milli(String(item.quantity)),
      0n,
    );
    const planned = milli(String(productionOrder.plannedQuantity));
    const requested = milli(String(input.quantity));
    const remaining = planned > alreadyReceived ? planned - alreadyReceived : 0n;

    if (remaining === 0n) {
      throw new Error(`Production order "${productionOrder.orderNumber}" has already been fully received.`);
    }
    if (requested > remaining) {
      throw new Error(
        `Finished goods quantity exceeds the remaining production quantity. ` +
        `Planned: ${productionOrder.plannedQuantity} ${productionOrder.unit}; ` +
        `already received: ${decimal(alreadyReceived)} ${productionOrder.unit}; ` +
        `remaining: ${decimal(remaining)} ${productionOrder.unit}.`,
      );
    }

    const storage = await getFinishedGoodsStorage(tx);
    let batch = await findFinishedGoodsBatch(
      tx,
      productionOrder.finishedMaterialCode,
      input.batchNumber,
    );

    if (!batch) {
      batch = (await tx
        .insert(batchLots)
        .values({
          materialCode: productionOrder.finishedMaterialCode,
          batchNumber: input.batchNumber,
          receivedAt: new Date().toISOString().slice(0, 10),
          qualityStatus: "released",
        })
        .returning({
          id: batchLots.id,
          materialCode: batchLots.materialCode,
          batchNumber: batchLots.batchNumber,
        }))[0];
    }
    if (!batch) throw new Error("Failed to create or resolve the finished-goods batch.");

    const receipt = (await tx
      .insert(finishedGoodsReceipts)
      .values({
        productionOrderId: productionOrder.id,
        batchLotId: batch.id,
        locationId: storage.location.id,
        quantity: input.quantity,
        unit: input.unit,
        qualityStatus: "released",
      })
      .returning())[0];

    if (!receipt) throw new Error("Failed to create the finished goods receipt.");

    await tx
      .insert(stockBalances)
      .values({
        materialCode: productionOrder.finishedMaterialCode,
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
      transactionNumber: `FG-${crypto.randomUUID()}`,
      transactionType: "finished_goods_receipt",
      materialCode: productionOrder.finishedMaterialCode,
      batchLotId: batch.id,
      warehouseId: storage.warehouse.id,
      locationId: storage.location.id,
      quantityIn: input.quantity,
      quantityOut: "0",
      unit: input.unit,
      referenceType: "finished_goods_receipt",
      referenceId: receipt.id,
      createdByUserId: userId ?? null,
    });

    const totalAfter = alreadyReceived + requested;
    await tx
      .update(productionOrders)
      .set({
        status: totalAfter >= planned ? "completed" : "in_progress",
        updatedAt: new Date(),
      })
      .where(eq(productionOrders.id, productionOrder.id));

    await tx.insert(auditLogs).values({
      actorUserId: userId ?? null,
      action: "finished_goods_receipt",
      entityType: "production_order",
      entityId: productionOrder.id,
      afterData: receipt,
    });

    return {
      ...receipt,
      plannedQuantity: productionOrder.plannedQuantity,
      totalReceivedQuantity: decimal(totalAfter),
      remainingQuantity: decimal(planned - totalAfter),
    };
  });
}

export async function listFinishedGoodsReceipts() {
  return db
    .select({
      id: finishedGoodsReceipts.id,
      productionOrderId: finishedGoodsReceipts.productionOrderId,
      orderNumber: productionOrders.orderNumber,
      materialCode: productionOrders.finishedMaterialCode,
      batchNumber: batchLots.batchNumber,
      quantity: finishedGoodsReceipts.quantity,
      unit: finishedGoodsReceipts.unit,
      qualityStatus: finishedGoodsReceipts.qualityStatus,
      receivedAt: finishedGoodsReceipts.receivedAt,
    })
    .from(finishedGoodsReceipts)
    .innerJoin(productionOrders, eq(finishedGoodsReceipts.productionOrderId, productionOrders.id))
    .innerJoin(batchLots, eq(finishedGoodsReceipts.batchLotId, batchLots.id))
    .orderBy(sql`${finishedGoodsReceipts.receivedAt} desc`);
}
