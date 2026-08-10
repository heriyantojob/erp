import { and, asc, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/setup";
import {
  auditLogs,
  batchLots,
  productionMaterialIssues,
  productionOrders,
  stockBalances,
  stockTransactions,
} from "@/db/schema";

const quantityInput = z.coerce
  .string()
  .regex(
    /^\d+(?:\.\d{1,3})?$/,
    "Quantity must have at most three decimal places",
  )
  .refine(
    (value) =>
      value !== "0" && value !== "0.0" && value !== "0.00" && value !== "0.000",
    "Quantity must be greater than zero",
  );

export const fifoRequestInput = z.object({
  productionOrderId: z.string().uuid(),
  materialCode: z.string().trim().min(1).max(50),
  quantity: quantityInput,
  unit: z.string().trim().min(1).max(30),
});

type FifoRequest = z.infer<typeof fifoRequestInput>;

function toMilli(value: string): bigint {
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, "0"));
}

function fromMilli(value: bigint): string {
  const whole = value / 1000n;
  const fraction = (value % 1000n)
    .toString()
    .padStart(3, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export class FifoAllocationError extends Error {
  constructor(
    message: string,
    readonly status = 409,
  ) {
    super(message);
  }
}

/**
 * Allocates one material for a production order with FIFO and transaction safety.
 * The production-order lock makes retries idempotent; balance rows are locked before
 * they are read/updated so two concurrent allocations cannot consume the same stock.
 */
export async function allocateFifoForProduction(
  input: FifoRequest,
  actorUserId?: string,
) {
  const requested = toMilli(input.quantity);
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM production_orders WHERE id = ${input.productionOrderId} FOR UPDATE`,
    );
    const order = (
      await tx
        .select()
        .from(productionOrders)
        .where(eq(productionOrders.id, input.productionOrderId))
    )[0];
    if (!order)
      throw new FifoAllocationError("Production order not found", 404);

    const previousIssues = await tx
      .select()
      .from(productionMaterialIssues)
      .where(
        and(
          eq(
            productionMaterialIssues.productionOrderId,
            input.productionOrderId,
          ),
          eq(productionMaterialIssues.materialCode, input.materialCode),
        ),
      );
    if (previousIssues.length) {
      return {
        idempotent: true,
        productionOrderId: input.productionOrderId,
        materialCode: input.materialCode,
        allocations: previousIssues,
      };
    }

    // Lock eligible balance rows in FIFO order before calculating the allocation.
    await tx.execute(sql`
      SELECT sb.id
      FROM stock_balances sb
      INNER JOIN batch_lots bl ON bl.id = sb.batch_lot_id
      WHERE sb.material_code = ${input.materialCode}
        AND sb.warehouse_id = ${order.warehouseId}
        AND sb.unit = ${input.unit}
        AND sb.quantity_on_hand > 0
      ORDER BY bl.received_at ASC, bl.created_at ASC, sb.id ASC
      FOR UPDATE OF sb
    `);

    const balances = await tx
      .select({ balance: stockBalances, batch: batchLots })
      .from(stockBalances)
      .innerJoin(batchLots, eq(stockBalances.batchLotId, batchLots.id))
      .where(
        and(
          eq(stockBalances.materialCode, input.materialCode),
          eq(stockBalances.warehouseId, order.warehouseId),
          eq(stockBalances.unit, input.unit),
          gt(stockBalances.quantityOnHand, "0"),
        ),
      )
      .orderBy(
        asc(batchLots.receivedAt),
        asc(batchLots.createdAt),
        asc(stockBalances.id),
      );

    const available = balances.reduce(
      (total, row) => total + toMilli(row.balance.quantityOnHand),
      0n,
    );
    if (available < requested) {
      throw new FifoAllocationError(
        `Insufficient stock. Requested ${input.quantity} ${input.unit}; available ${fromMilli(available)} ${input.unit}.`,
      );
    }

    let remaining = requested;
    const allocations: Array<{
      batchLotId: string;
      batchNumber: string;
      receivedAt: string;
      quantity: string;
      remainingBalance: string;
    }> = [];
    let lineNumber = 1;
    for (const row of balances) {
      if (remaining === 0n) break;
      const availableInBatch = toMilli(row.balance.quantityOnHand);
      const issued =
        availableInBatch < remaining ? availableInBatch : remaining;
      const nextBalance = availableInBatch - issued;

      await tx
        .update(stockBalances)
        .set({ quantityOnHand: fromMilli(nextBalance), updatedAt: new Date() })
        .where(eq(stockBalances.id, row.balance.id));
      await tx.insert(productionMaterialIssues).values({
        productionOrderId: input.productionOrderId,
        lineNumber,
        materialCode: input.materialCode,
        batchLotId: row.batch.id,
        locationId: row.balance.locationId,
        quantity: fromMilli(issued),
        unit: input.unit,
      });
      await tx.insert(stockTransactions).values({
        transactionNumber: `ISS-${crypto.randomUUID()}`,
        transactionType: "production_issue",
        materialCode: input.materialCode,
        batchLotId: row.batch.id,
        warehouseId: row.balance.warehouseId,
        locationId: row.balance.locationId,
        quantityIn: "0",
        quantityOut: fromMilli(issued),
        unit: input.unit,
        referenceType: "production_order",
        referenceId: input.productionOrderId,
        createdByUserId: actorUserId,
      });
      allocations.push({
        batchLotId: row.batch.id,
        batchNumber: row.batch.batchNumber,
        receivedAt: row.batch.receivedAt,
        quantity: fromMilli(issued),
        remainingBalance: fromMilli(nextBalance),
      });
      remaining -= issued;
      lineNumber += 1;
    }

    await tx.insert(auditLogs).values({
      actorUserId,
      action: "fifo_allocate",
      entityType: "production_order",
      entityId: input.productionOrderId,
      afterData: {
        materialCode: input.materialCode,
        requestedQuantity: input.quantity,
        unit: input.unit,
        allocations,
      },
    });
    return {
      idempotent: false,
      productionOrderId: input.productionOrderId,
      materialCode: input.materialCode,
      requestedQuantity: input.quantity,
      unit: input.unit,
      allocations,
    };
  });
}
