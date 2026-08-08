import { z } from "zod";

const positiveQuantity = z.coerce
  .string()
  .regex(/^\d+(?:\.\d{1,3})?$/, "Quantity must have at most 3 decimal places.")
  .refine((value) => Number(value) > 0, "Quantity must be greater than zero.");

export const finishedGoodsReceiptInputSchema = z.object({
  productionOrderId: z.string().uuid(),
  batchNumber: z.string().trim().min(1).max(100),
  quantity: positiveQuantity,
  unit: z.string().trim().min(1).max(30),
});

export type FinishedGoodsReceiptInput = z.infer<typeof finishedGoodsReceiptInputSchema>;
