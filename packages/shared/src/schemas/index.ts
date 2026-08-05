import { z } from 'zod';

export const unitSchema = z.enum(['kg', 'pcs', 'liter', 'pak', 'saset']);

export const paymentMethodSchema = z.enum(['CASH']);

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const productSchema = z.object({
  id: z.string().regex(UUID_V4_RE, 'id must be a UUID v4'),
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  costPrice: z.number().nonnegative(),
  sellingPrice: z.number().positive(),
  stock: z.number().nonnegative(),
  minStock: z.number().nonnegative(),
  unit: unitSchema,
  image: z.string().optional(),
  isDeleted: z.boolean().optional(),
  updatedAt: z.number().int().nonnegative(),
});

/** Versi lenient utk sync — SKU boleh kosong (auto-generate di FE; server mengisi kalau kosong). */
export const productSyncSchema = z.object({
  id: z.string().regex(UUID_V4_RE, 'id must be a UUID v4'),
  sku: z.string().optional(),
  name: z.string().min(1),
  category: z.string().min(1),
  costPrice: z.number().nonnegative(),
  sellingPrice: z.number().positive(),
  stock: z.number().nonnegative(),
  minStock: z.number().nonnegative(),
  unit: unitSchema,
  image: z.string().optional(),
  isSynced: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  updatedAt: z.number().int().nonnegative(),
});

export const productSyncPayloadSchema = z.object({
  storeId: z.string().min(1),
  products: z.array(productSyncSchema).min(1).max(100),
});

export const transactionItemSchema = z.object({
  productId: z.string().regex(UUID_V4_RE, 'invalid productId'),
  productName: z.string().min(1),
  sku: z.string().optional(),
  qty: z.number().positive(),
  unit: unitSchema,
  price: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  costPrice: z.number().nonnegative().optional(),
});

export const transactionSchema = z.object({
  id: z.string().regex(UUID_V4_RE, 'id must be a UUID v4'),
  invoiceNo: z.string().min(1),
  timestamp: z.number().int().positive(),
  items: z.array(transactionItemSchema).min(1),
  totalAmount: z.number().nonnegative(),
  finalAmount: z.number().nonnegative(),
  paymentMethod: paymentMethodSchema,
  payAmount: z.number().nonnegative(),
  changeAmount: z.number(),
  isSynced: z.boolean(),
});

export const syncPayloadSchema = z.object({
  storeId: z.string().min(1),
  transactions: z.array(transactionSchema).min(1).max(100),
});

export const syncStatusQuerySchema = z.object({
  ids: z
    .string()
    .refine((s) => s.length > 0, {
      message: 'ids query param is required',
    })
    .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean)),
});

export const inventoryAdjustmentSchema = z.object({
  id: z.string().regex(UUID_V4_RE, 'invalid id'),
  productId: z.string().regex(UUID_V4_RE, 'invalid productId'),
  quantity: z.number().nonnegative(),
  note: z.string().optional(),
  adjustedAt: z.number().int().positive(),
});