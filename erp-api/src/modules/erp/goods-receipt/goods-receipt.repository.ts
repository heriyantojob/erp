import { and, eq, isNull } from "drizzle-orm";
import {
  batchLots,
  businessPartners,
  goodsReceiptHeaders,
  locations,
  materials,
  purchaseOrders,
  suppliers,
  warehouses,
} from "@/db/schema";

export async function findActiveMaterial(db: any, materialCode: string) {
  return (
    await db
      .select({
        code: materials.code,
        name: materials.name,
        unit: materials.unit,
      })
      .from(materials)
      .where(and(eq(materials.code, materialCode), isNull(materials.deletedAt)))
      .limit(1)
  )[0];
}

export async function findReceiptByNumber(db: any, receiptNumber: string) {
  return (
    await db
      .select({
        id: goodsReceiptHeaders.id,
        receiptNumber: goodsReceiptHeaders.receiptNumber,
        status: goodsReceiptHeaders.status,
      })
      .from(goodsReceiptHeaders)
      .where(eq(goodsReceiptHeaders.receiptNumber, receiptNumber))
      .limit(1)
  )[0];
}

export async function findPurchaseOrder(db: any, id: string) {
  return (
    await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        supplierCode: purchaseOrders.supplierCode,
        materialCode: purchaseOrders.materialCode,
        quantity: purchaseOrders.quantity,
        unit: purchaseOrders.unit,
        status: purchaseOrders.status,
      })
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, id), isNull(purchaseOrders.deletedAt)))
      .limit(1)
  )[0];
}

export async function getDefaultRawMaterialStorage(db: any) {
  let warehouse = (
    await db
      .select({
        id: warehouses.id,
        code: warehouses.code,
        name: warehouses.name,
      })
      .from(warehouses)
      .where(and(eq(warehouses.code, "MAIN"), isNull(warehouses.deletedAt)))
      .limit(1)
  )[0];

  if (!warehouse) {
    warehouse = (
      await db
        .insert(warehouses)
        .values({ code: "MAIN", name: "Main Warehouse" })
        .returning({
          id: warehouses.id,
          code: warehouses.code,
          name: warehouses.name,
        })
    )[0];
  }

  if (!warehouse) throw new Error("Could not resolve the MAIN warehouse.");

  let location = (
    await db
      .select({
        id: locations.id,
        code: locations.code,
        name: locations.name,
      })
      .from(locations)
      .where(
        and(
          eq(locations.warehouseId, warehouse.id),
          eq(locations.code, "MAIN-01"),
        ),
      )
      .limit(1)
  )[0];

  if (!location) {
    location = (
      await db
        .insert(locations)
        .values({
          warehouseId: warehouse.id,
          code: "MAIN-01",
          name: "Main Storage",
        })
        .returning({
          id: locations.id,
          code: locations.code,
          name: locations.name,
        })
    )[0];
  }

  if (!location) throw new Error("Could not resolve the MAIN-01 location.");
  return { warehouse, location };
}

export async function ensureSupplierFromBusinessPartner(
  db: any,
  supplierCode: string,
) {
  const normalizedCode = supplierCode.trim();

  // Business Partners is the canonical ERP supplier master.
  const partner = (
    await db
      .select({
        code: businessPartners.code,
        name: businessPartners.name,
        type: businessPartners.type,
      })
      .from(businessPartners)
      .where(
        and(
          eq(businessPartners.code, normalizedCode),
          eq(businessPartners.type, "supplier"),
          isNull(businessPartners.deletedAt),
        ),
      )
      .limit(1)
  )[0];

  if (partner) {
    // goods_receipt_headers still has a legacy FK to suppliers.code.
    // Keep that compatibility table synchronized automatically.
    const legacySupplier = (
      await db
        .select({ code: suppliers.code })
        .from(suppliers)
        .where(eq(suppliers.code, partner.code))
        .limit(1)
    )[0];

    if (!legacySupplier) {
      await db
        .insert(suppliers)
        .values({
          code: partner.code,
          name: partner.name,
          active: true,
        })
        .onConflictDoNothing();
    }

    return partner;
  }

  // Compatibility for older ERP databases: if the supplier exists only in
  // the legacy suppliers table, migrate it into Business Partners on demand.
  const legacySupplier = (
    await db
      .select({
        code: suppliers.code,
        name: suppliers.name,
        active: suppliers.active,
      })
      .from(suppliers)
      .where(eq(suppliers.code, normalizedCode))
      .limit(1)
  )[0];

  if (!legacySupplier?.active) return null;

  await db
    .insert(businessPartners)
    .values({
      code: legacySupplier.code,
      name: legacySupplier.name,
      type: "supplier",
    })
    .onConflictDoNothing();

  return {
    code: legacySupplier.code,
    name: legacySupplier.name,
    type: "supplier" as const,
  };
}

export async function findBatch(
  db: any,
  batchNumber: string,
) {
  return (
    await db
      .select({
        id: batchLots.id,
        materialCode: batchLots.materialCode,
        batchNumber: batchLots.batchNumber,
        expiryDate: batchLots.expiryDate,
      })
      .from(batchLots)
      .where(eq(batchLots.batchNumber, batchNumber))
      .limit(1)
  )[0];
}
