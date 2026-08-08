import { and, eq } from "drizzle-orm";
import {
  batchLots,
  finishedGoodsReceipts,
  locations,
  productionOrders,
  warehouses,
} from "@/db/schema";

export async function findProductionOrder(db: any, id: string) {
  return (await db
    .select({
      id: productionOrders.id,
      orderNumber: productionOrders.orderNumber,
      finishedMaterialCode: productionOrders.finishedMaterialCode,
      plannedQuantity: productionOrders.plannedQuantity,
      unit: productionOrders.unit,
      status: productionOrders.status,
    })
    .from(productionOrders)
    .where(eq(productionOrders.id, id))
    .limit(1))[0];
}

export async function getFinishedGoodsStorage(db: any) {
  let warehouse = (await db
    .select({ id: warehouses.id, code: warehouses.code, name: warehouses.name })
    .from(warehouses)
    .where(eq(warehouses.code, "FG"))
    .limit(1))[0];

  if (!warehouse) {
    warehouse = (await db
      .insert(warehouses)
      .values({ code: "FG", name: "Finished Goods Warehouse" })
      .returning({ id: warehouses.id, code: warehouses.code, name: warehouses.name }))[0];
  }
  if (!warehouse) throw new Error("Could not resolve the FG warehouse.");

  let location = (await db
    .select({ id: locations.id, code: locations.code, name: locations.name })
    .from(locations)
    .where(and(eq(locations.warehouseId, warehouse.id), eq(locations.code, "FG-01")))
    .limit(1))[0];

  if (!location) {
    location = (await db
      .insert(locations)
      .values({
        warehouseId: warehouse.id,
        code: "FG-01",
        name: "Finished Goods Warehouse Storage",
      })
      .returning({ id: locations.id, code: locations.code, name: locations.name }))[0];
  }
  if (!location) throw new Error("Could not resolve the FG-01 location.");

  return { warehouse, location };
}

export async function findFinishedGoodsBatch(db: any, materialCode: string, batchNumber: string) {
  return (await db
    .select({
      id: batchLots.id,
      materialCode: batchLots.materialCode,
      batchNumber: batchLots.batchNumber,
    })
    .from(batchLots)
    .where(and(eq(batchLots.materialCode, materialCode), eq(batchLots.batchNumber, batchNumber)))
    .limit(1))[0];
}

export async function listReceiptQuantities(db: any, productionOrderId: string) {
  return db
    .select({ quantity: finishedGoodsReceipts.quantity })
    .from(finishedGoodsReceipts)
    .where(eq(finishedGoodsReceipts.productionOrderId, productionOrderId));
}
