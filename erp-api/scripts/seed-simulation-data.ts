import "dotenv/config";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, poolConnection } from "../src/db/setup.js";
import {
  batchLots,
  billOfMaterials,
  businessPartners,
  customers,
  goodsReceiptHeaders,
  goodsReceiptLines,
  goodsReceipts,
  locations,
  materials,
  purchaseOrders,
  qualityInspections,
  stockBalances,
  stockTransactions,
  suppliers,
  warehouses,
} from "../src/db/schema.js";

const MATERIALS = [
  {
    code: "RM-001",
    name: "Rose Extract",
    category: "Raw Material",
    unit: "kg",
  },
  { code: "RM-002", name: "Alcohol", category: "Raw Material", unit: "liter" },
  {
    code: "RM-003",
    name: "Packaging Bottle",
    category: "Packaging",
    unit: "pcs",
  },
  {
    code: "FG-001",
    name: "Aroma Blend A",
    category: "Finished Goods",
    unit: "liter",
  },
] as const;

const PARTNERS = [
  { type: "supplier", code: "SUP-001", name: "Supplier Alpha" },
  { type: "supplier", code: "SUP-002", name: "Supplier Beta" },
  { type: "customer", code: "CUS-001", name: "Customer A" },
] as const;

// The assessment's goods-receipt simulation table does not identify which
// supplier belongs to each receipt, so supplierCode is intentionally null.
// Units are normalized to the Material Master values (e.g. "liter" instead of
// display abbreviation "L") so transactional validation remains consistent.
const RECEIPTS = [
  {
    receivedAt: "2026-08-01",
    receiptNumber: "GR-26001",
    materialCode: "RM-001",
    batchNumber: "LN01-01-08-26",
    expiryDate: "2027-07-31",
    quantity: "25.000",
    unit: "kg",
  },
  {
    receivedAt: "2026-08-08",
    receiptNumber: "GR-26002",
    materialCode: "RM-001",
    batchNumber: "LN02-08-08-26",
    expiryDate: "2027-08-07",
    quantity: "35.000",
    unit: "kg",
  },
  {
    receivedAt: "2026-08-01",
    receiptNumber: "GR-26003",
    materialCode: "RM-002",
    batchNumber: "LN03-01-08-26",
    expiryDate: "2028-07-31",
    quantity: "40.000",
    unit: "liter",
  },
  {
    receivedAt: "2026-08-10",
    receiptNumber: "GR-26004",
    materialCode: "RM-002",
    batchNumber: "LN04-10-08-26",
    expiryDate: "2028-08-09",
    quantity: "80.000",
    unit: "liter",
  },
  {
    receivedAt: "2026-08-01",
    receiptNumber: "GR-26005",
    materialCode: "RM-003",
    batchNumber: "LN05-01-08-26",
    expiryDate: null,
    quantity: "200.000",
    unit: "pcs",
  },
] as const;

// Current bill_of_materials schema stores component requirements only. These
// three rows represent the supplied formula for a 20-liter FG-001 batch:
// RM-001 4 kg, RM-002 16 liters, RM-003 20 pcs.
const BOM_COMPONENTS = [
  { materialCode: "RM-001", requiredQuantity: "4.000", unit: "kg" },
  { materialCode: "RM-002", requiredQuantity: "16.000", unit: "liter" },
  { materialCode: "RM-003", requiredQuantity: "20.000", unit: "pcs" },
] as const;

// This scenario intentionally ends at Incoming Quality. The purchase order is
// "received" because its goods receipt has been posted, while its inspection
// remains "pending" so the Incoming Quality page always has test data.
const INCOMING_QUALITY_SCENARIO = {
  orderNumber: "PO-SEED-IQ-001",
  receiptNumber: "GR-SEED-IQ-001",
  materialCode: "RM-001",
  batchNumber: "IQ-PO-SEED-001",
  supplierCode: "SUP-001",
  receivedAt: "2026-08-13",
  expiryDate: "2027-08-12",
  quantity: "10.000",
  unit: "kg",
} as const;

async function ensureStorage() {
  let warehouse = (
    await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.code, "MAIN"))
      .limit(1)
  )[0];

  if (!warehouse) {
    warehouse = (
      await db
        .insert(warehouses)
        .values({ code: "MAIN", name: "Main Warehouse", active: true })
        .returning()
    )[0];
  } else if (warehouse.deletedAt) {
    warehouse = (
      await db
        .update(warehouses)
        .set({
          deletedAt: null,
          deletedByUserId: null,
          deleteReason: null,
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(warehouses.id, warehouse.id))
        .returning()
    )[0];
  }

  if (!warehouse) throw new Error("Could not seed MAIN warehouse.");

  let location = (
    await db
      .select()
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
          active: true,
        })
        .returning()
    )[0];
  }

  if (!location) throw new Error("Could not seed MAIN-01 location.");
  return { warehouse, location };
}

async function seedMaterials() {
  for (const item of MATERIALS) {
    const existing = (
      await db
        .select()
        .from(materials)
        .where(eq(materials.code, item.code))
        .limit(1)
    )[0];
    if (!existing) {
      await db.insert(materials).values(item);
    } else {
      await db
        .update(materials)
        .set({
          ...item,
          deletedAt: null,
          deletedByUserId: null,
          deleteReason: null,
          updatedAt: new Date(),
        })
        .where(eq(materials.code, item.code));
    }
  }
}

async function seedPartners() {
  for (const partner of PARTNERS) {
    const existing = (
      await db
        .select()
        .from(businessPartners)
        .where(eq(businessPartners.code, partner.code))
        .limit(1)
    )[0];
    if (!existing) {
      await db.insert(businessPartners).values(partner);
    } else {
      await db
        .update(businessPartners)
        .set({
          ...partner,
          deletedAt: null,
          deletedByUserId: null,
          deleteReason: null,
          updatedAt: new Date(),
        })
        .where(eq(businessPartners.code, partner.code));
    }

    if (partner.type === "supplier") {
      await db
        .insert(suppliers)
        .values({ code: partner.code, name: partner.name, active: true })
        .onConflictDoUpdate({
          target: suppliers.code,
          set: {
            name: partner.name,
            active: true,
            deletedAt: null,
            deletedByUserId: null,
            deleteReason: null,
            updatedAt: new Date(),
          },
        });
    } else {
      await db
        .insert(customers)
        .values({ code: partner.code, name: partner.name, active: true })
        .onConflictDoUpdate({
          target: customers.code,
          set: {
            name: partner.name,
            active: true,
            deletedAt: null,
            deletedByUserId: null,
            deleteReason: null,
            updatedAt: new Date(),
          },
        });
    }
  }
}

async function seedBom() {
  for (const component of BOM_COMPONENTS) {
    const existing = (
      await db
        .select()
        .from(billOfMaterials)
        .where(
          and(
            eq(billOfMaterials.materialCode, component.materialCode),
            eq(billOfMaterials.requiredQuantity, component.requiredQuantity),
            eq(billOfMaterials.unit, component.unit),
            isNull(billOfMaterials.deletedAt),
          ),
        )
        .limit(1)
    )[0];

    if (!existing) await db.insert(billOfMaterials).values(component);
  }
}

async function seedReceipts() {
  const { warehouse, location } = await ensureStorage();

  for (const receipt of RECEIPTS) {
    // Compatibility table used by the original assessment endpoints.
    const legacy = (
      await db
        .select()
        .from(goodsReceipts)
        .where(eq(goodsReceipts.receiptCode, receipt.receiptNumber))
        .limit(1)
    )[0];
    if (!legacy) {
      await db.insert(goodsReceipts).values({
        receivedAt: receipt.receivedAt,
        receiptCode: receipt.receiptNumber,
        materialCode: receipt.materialCode,
        batchNumber: receipt.batchNumber,
        expiryDate: receipt.expiryDate,
        quantity: receipt.quantity,
        unit: receipt.unit,
      });
    }

    let batch = (
      await db
        .select()
        .from(batchLots)
        .where(
          and(
            eq(batchLots.materialCode, receipt.materialCode),
            eq(batchLots.batchNumber, receipt.batchNumber),
          ),
        )
        .limit(1)
    )[0];

    if (!batch) {
      batch = (
        await db
          .insert(batchLots)
          .values({
            materialCode: receipt.materialCode,
            batchNumber: receipt.batchNumber,
            receivedAt: receipt.receivedAt,
            expiryDate: receipt.expiryDate,
            qualityStatus: "released",
          })
          .returning()
      )[0];
    } else {
      batch = (
        await db
          .update(batchLots)
          .set({
            receivedAt: receipt.receivedAt,
            expiryDate: receipt.expiryDate,
            qualityStatus: "released",
            updatedAt: new Date(),
          })
          .where(eq(batchLots.id, batch.id))
          .returning()
      )[0];
    }

    if (!batch) throw new Error(`Could not seed batch ${receipt.batchNumber}.`);

    let header = (
      await db
        .select()
        .from(goodsReceiptHeaders)
        .where(eq(goodsReceiptHeaders.receiptNumber, receipt.receiptNumber))
        .limit(1)
    )[0];

    if (!header) {
      header = (
        await db
          .insert(goodsReceiptHeaders)
          .values({
            receiptNumber: receipt.receiptNumber,
            receivedAt: receipt.receivedAt,
            supplierCode: null,
            warehouseId: warehouse.id,
            status: "posted",
          })
          .returning()
      )[0];
    }

    if (!header)
      throw new Error(`Could not seed receipt ${receipt.receiptNumber}.`);

    const line = (
      await db
        .select()
        .from(goodsReceiptLines)
        .where(
          and(
            eq(goodsReceiptLines.receiptId, header.id),
            eq(goodsReceiptLines.lineNumber, 1),
          ),
        )
        .limit(1)
    )[0];

    if (!line) {
      await db.insert(goodsReceiptLines).values({
        receiptId: header.id,
        lineNumber: 1,
        materialCode: receipt.materialCode,
        batchLotId: batch.id,
        locationId: location.id,
        quantity: receipt.quantity,
        unit: receipt.unit,
        qualityStatus: "released",
      });
    }

    // Only create the opening stock once. This makes the seed idempotent and
    // avoids increasing the balance every time npm run migrate is executed.
    const transactionNumber = `SEED-${receipt.receiptNumber}`;
    const transaction = (
      await db
        .select()
        .from(stockTransactions)
        .where(eq(stockTransactions.transactionNumber, transactionNumber))
        .limit(1)
    )[0];

    if (!transaction) {
      await db
        .insert(stockBalances)
        .values({
          materialCode: receipt.materialCode,
          batchLotId: batch.id,
          warehouseId: warehouse.id,
          locationId: location.id,
          quantityOnHand: receipt.quantity,
          unit: receipt.unit,
        })
        .onConflictDoUpdate({
          target: [
            stockBalances.materialCode,
            stockBalances.batchLotId,
            stockBalances.warehouseId,
            stockBalances.locationId,
          ],
          set: {
            quantityOnHand: sql`${stockBalances.quantityOnHand} + ${receipt.quantity}`,
            updatedAt: new Date(),
          },
        });

      await db.insert(stockTransactions).values({
        transactionNumber,
        transactionType: "goods_receipt",
        transactionAt: new Date(`${receipt.receivedAt}T00:00:00.000Z`),
        materialCode: receipt.materialCode,
        batchLotId: batch.id,
        warehouseId: warehouse.id,
        locationId: location.id,
        quantityIn: receipt.quantity,
        quantityOut: "0",
        unit: receipt.unit,
        referenceType: "goods_receipt_seed",
        referenceId: header.id,
      });
    }
  }
}

async function seedIncomingQualityScenario() {
  const scenario = INCOMING_QUALITY_SCENARIO;
  const { warehouse, location } = await ensureStorage();

  let purchaseOrder = (
    await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.orderNumber, scenario.orderNumber))
      .limit(1)
  )[0];

  if (!purchaseOrder) {
    purchaseOrder = (
      await db
        .insert(purchaseOrders)
        .values({
          orderNumber: scenario.orderNumber,
          supplierCode: scenario.supplierCode,
          materialCode: scenario.materialCode,
          quantity: scenario.quantity,
          unit: scenario.unit,
          expectedAt: scenario.receivedAt,
          status: "received",
          approvedAt: new Date(`${scenario.receivedAt}T00:00:00.000Z`),
        })
        .returning()
    )[0];
  } else {
    purchaseOrder = (
      await db
        .update(purchaseOrders)
        .set({
          supplierCode: scenario.supplierCode,
          materialCode: scenario.materialCode,
          quantity: scenario.quantity,
          unit: scenario.unit,
          expectedAt: scenario.receivedAt,
          status: "received",
          deletedAt: null,
          deletedByUserId: null,
          deleteReason: null,
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, purchaseOrder.id))
        .returning()
    )[0];
  }

  if (!purchaseOrder) throw new Error("Could not seed Incoming Quality PO.");

  let batch = (
    await db
      .select()
      .from(batchLots)
      .where(
        and(
          eq(batchLots.materialCode, scenario.materialCode),
          eq(batchLots.batchNumber, scenario.batchNumber),
        ),
      )
      .limit(1)
  )[0];

  if (!batch) {
    batch = (
      await db
        .insert(batchLots)
        .values({
          materialCode: scenario.materialCode,
          batchNumber: scenario.batchNumber,
          receivedAt: scenario.receivedAt,
          expiryDate: scenario.expiryDate,
          qualityStatus: "quarantine",
        })
        .returning()
    )[0];
  } else {
    batch = (
      await db
        .update(batchLots)
        .set({
          receivedAt: scenario.receivedAt,
          expiryDate: scenario.expiryDate,
          qualityStatus: "quarantine",
          updatedAt: new Date(),
        })
        .where(eq(batchLots.id, batch.id))
        .returning()
    )[0];
  }

  if (!batch) throw new Error("Could not seed Incoming Quality batch.");

  let receipt = (
    await db
      .select()
      .from(goodsReceiptHeaders)
      .where(eq(goodsReceiptHeaders.receiptNumber, scenario.receiptNumber))
      .limit(1)
  )[0];

  if (!receipt) {
    receipt = (
      await db
        .insert(goodsReceiptHeaders)
        .values({
          receiptNumber: scenario.receiptNumber,
          receivedAt: scenario.receivedAt,
          supplierCode: scenario.supplierCode,
          warehouseId: warehouse.id,
          status: "posted",
          externalDocumentNumber: scenario.orderNumber,
        })
        .returning()
    )[0];
  }

  if (!receipt) throw new Error("Could not seed Incoming Quality receipt.");

  const line = (
    await db
      .select()
      .from(goodsReceiptLines)
      .where(
        and(
          eq(goodsReceiptLines.receiptId, receipt.id),
          eq(goodsReceiptLines.lineNumber, 1),
        ),
      )
      .limit(1)
  )[0];

  if (!line) {
    await db.insert(goodsReceiptLines).values({
      receiptId: receipt.id,
      lineNumber: 1,
      materialCode: scenario.materialCode,
      batchLotId: batch.id,
      locationId: location.id,
      quantity: scenario.quantity,
      unit: scenario.unit,
      qualityStatus: "quarantine",
    });
  }

  await db
    .insert(qualityInspections)
    .values({ receiptId: receipt.id, batchLotId: batch.id, status: "pending" })
    .onConflictDoNothing();

  const transactionNumber = `SEED-${scenario.receiptNumber}`;
  const transaction = (
    await db
      .select()
      .from(stockTransactions)
      .where(eq(stockTransactions.transactionNumber, transactionNumber))
      .limit(1)
  )[0];
  if (!transaction) {
    await db.insert(stockBalances).values({
      materialCode: scenario.materialCode,
      batchLotId: batch.id,
      warehouseId: warehouse.id,
      locationId: location.id,
      quantityOnHand: scenario.quantity,
      unit: scenario.unit,
    });
    await db.insert(stockTransactions).values({
      transactionNumber,
      transactionType: "goods_receipt",
      transactionAt: new Date(`${scenario.receivedAt}T00:00:00.000Z`),
      materialCode: scenario.materialCode,
      batchLotId: batch.id,
      warehouseId: warehouse.id,
      locationId: location.id,
      quantityIn: scenario.quantity,
      quantityOut: "0",
      unit: scenario.unit,
      referenceType: "goods_receipt_seed",
      referenceId: receipt.id,
    });
  }
}

export async function seedSimulationData() {
  await seedMaterials();
  await seedPartners();
  await seedBom();
  await seedReceipts();
  await seedIncomingQualityScenario();
  console.info("ERP assessment simulation data is ready.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedSimulationData()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await poolConnection.end();
    });
}
