import { z } from "zod";

const positiveQuantity = z.coerce
  .string()
  .regex(/^\d+(?:\.\d{1,3})?$/, "Quantity must have at most 3 decimal places.")
  .refine((value) => Number(value) > 0, "Quantity must be greater than zero.");

export const goodsReceiptInputSchema = z.object({
  receivedAt: z.string().date(),
  receiptNumber: z.string().trim().min(1).max(50),
  materialCode: z.string().trim().min(1).max(50),
  batchNumber: z.string().trim().min(1).max(100),
  expiryDate: z.string().date().nullable().optional(),
  quantity: positiveQuantity,
  unit: z.string().trim().min(1).max(30),
  purchaseOrderId: z.string().uuid().nullable().optional(),
});

export type GoodsReceiptInput = z.infer<typeof goodsReceiptInputSchema>;
