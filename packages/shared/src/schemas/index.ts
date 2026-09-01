import { z } from "zod";

export const unitSchema = z.enum(["kg", "pcs", "liter", "pak", "saset", "bat"]);

export const paymentMethodSchema = z.enum(["CASH"]);

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const productSchema = z.object({
  id: z.string().regex(UUID_V4_RE, "id must be a UUID v4"),
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  costPrice: z.number().nonnegative(),
  sellingPrice: z.number().positive(),
  stock: z.number().nonnegative(),
  minStock: z.number().nonnegative(),
  unit: unitSchema,
  step: z.number().positive().nullable().optional(),
  piecesPerUnit: z.number().int().positive().nullable().optional(),
  smallUnit: unitSchema.nullable().optional(),
  smallPrice: z.number().nonnegative().nullable().optional(),
  image: z.string().nullable().optional(),
  isDeleted: z.boolean().optional(),
  updatedAt: z.number().int().nonnegative(),
});

export const productSyncSchema = z.object({
  id: z.string().regex(UUID_V4_RE, "id must be a UUID v4"),
  sku: z.string().nullable().optional(),
  name: z.string().min(1),
  category: z.string().min(1),
  costPrice: z.number().nonnegative(),
  sellingPrice: z.number().positive(),
  stock: z.number().nonnegative(),
  minStock: z.number().nonnegative(),
  unit: unitSchema,
  step: z.number().positive().nullable().optional(),
  piecesPerUnit: z.number().int().positive().nullable().optional(),
  smallUnit: unitSchema.nullable().optional(),
  smallPrice: z.number().nonnegative().nullable().optional(),
  image: z.string().nullable().optional(),
  isSynced: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  updatedAt: z.number().int().nonnegative(),
});

const storeIdSchema = z.string().uuid("storeId must be a valid UUID");

export const productSyncPayloadSchema = z.object({
  storeId: storeIdSchema.optional(),
  products: z.array(productSyncSchema).min(1).max(100),
});

export const transactionItemSchema = z
  .object({
    productId: z.string().regex(UUID_V4_RE, "invalid productId"),
    productName: z.string().min(1),
    sku: z.string().optional(),
    qty: z.number().positive(),
    unit: unitSchema,
    price: z.number().nonnegative(),
    subtotal: z.number().nonnegative(),
    costPrice: z.number().nonnegative().optional(),
  })
  .refine(
    (item) => Math.abs(item.subtotal - item.qty * item.price) < 0.01,
    {
      message: "subtotal must equal qty * price",
      path: ["subtotal"],
    },
  );

export const transactionSchema = z
  .object({
    id: z.string().regex(UUID_V4_RE, "id must be a UUID v4"),
    invoiceNo: z.string().min(1),
    timestamp: z.number().int().positive(),
    cashierName: z.string().optional(),
    items: z.array(transactionItemSchema).min(1).max(100),
    totalAmount: z.number().nonnegative(),
    finalAmount: z.number().nonnegative(),
    paymentMethod: paymentMethodSchema,
    payAmount: z.number().nonnegative(),
    changeAmount: z.number(),
    isSynced: z.boolean(),
  })
  .refine(
    (tx) => {
      const calculatedTotal = tx.items.reduce((sum, item) => sum + item.subtotal, 0);
      return Math.abs(tx.totalAmount - calculatedTotal) < 0.01;
    },
    {
      message: "totalAmount must equal sum of item subtotals",
      path: ["totalAmount"],
    },
  )
  .refine(
    (tx) => Math.abs(tx.changeAmount - (tx.payAmount - tx.finalAmount)) < 0.01,
    {
      message: "changeAmount must equal payAmount - finalAmount",
      path: ["changeAmount"],
    },
  );

export const syncPayloadSchema = z.object({
  storeId: storeIdSchema.optional(),
  transactions: z.array(transactionSchema).min(1).max(100),
});

export const getProductsQuerySchema = z.object({
  storeId: storeIdSchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  since: z.coerce.number().int().positive().optional(),
});

export const getTransactionsQuerySchema = z.object({
  storeId: storeIdSchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const getLowStockQuerySchema = z.object({
  storeId: storeIdSchema.optional(),
});

export const syncStatusQuerySchema = z.object({
  ids: z
    .string()
    .min(1, "ids query parameter required")
    .transform((s) =>
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    )
    .refine((arr) => arr.length > 0, {
      message: "ids query parameter required",
    }),
  storeId: storeIdSchema.optional(),
});

export const inventoryAdjustmentSchema = z.object({
  id: z.string().regex(UUID_V4_RE, "invalid id"),
  productId: z.string().regex(UUID_V4_RE, "invalid productId"),
  quantity: z.number().nonnegative(),
  note: z.string().optional(),
  adjustedAt: z.number().int().positive(),
});

export const inventoryAdjustmentsPayloadSchema = z.object({
  storeId: storeIdSchema.optional(),
  adjustments: z.array(inventoryAdjustmentSchema).min(1).max(100),
});

export const updateStoreSchema = z.object({
  name: z.string().min(1, "Store name is required").max(100, "Store name too long"),
});
