import type { Response } from "express";
import { prisma } from "../db";
import { toPrismaError } from "../lib/errors";
import { requireStoreAccess } from "../middleware/store-access";
import { uploadProductImage, deleteProductImage } from "../lib/storage";
import type { ValidatedRequest } from "../types/http";
import type { Prisma } from "../generated/client";
import type {
  GetProductsQuery,
  ProductSyncPayload,
} from "@point-of-sale/shared";

function cleanQty(val: unknown): number {
  if (val === undefined || val === null) return 0;
  const num = Number(val);
  if (isNaN(num)) return 0;
  return num;
}

export async function getProducts(
  req: ValidatedRequest<GetProductsQuery>,
  res: Response,
): Promise<void> {
  const {
    storeId: providedStoreId,
    page: rawPage,
    limit: rawLimit,
    since: rawSince,
  } = req.validated;
  const access = await requireStoreAccess(req, res, providedStoreId);
  if (!access.ok || !access.storeId) return;
  const storeId = access.storeId;

  const page = rawPage !== undefined ? Math.max(1, Number(rawPage)) : undefined;
  const limit = rawLimit !== undefined ? Math.max(1, Number(rawLimit)) : 10;

  try {
    const sinceParam = rawSince ? Number(rawSince) : undefined;
    const sinceDate =
      sinceParam && !isNaN(sinceParam) ? new Date(sinceParam) : undefined;

    const where: Prisma.ProductWhereInput = { storeId };
    if (sinceDate) {
      where.updatedAt = { gte: sinceDate };
    } else {
      where.isDeleted = false;
    }

    if (page !== undefined) {
      const [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy: { name: "asc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const formatted = products.map((p) => ({
        id: p.serverId,
        sku: p.sku,
        name: p.name,
        category: p.category,
        costPrice: p.costPrice.toNumber(),
        sellingPrice: p.sellingPrice.toNumber(),
        stock: cleanQty(p.stock),
        minStock: cleanQty(p.minStock),
        unit: p.unit,
        step: p.step ? cleanQty(p.step) : undefined,
        piecesPerUnit: p.piecesPerUnit ?? undefined,
        smallUnit: p.smallUnit ?? undefined,
        smallPrice: p.smallPrice ? p.smallPrice.toNumber() : undefined,
        image: p.image,
        isSynced: true,
        isDeleted: p.isDeleted,
        updatedAt: p.updatedAt.getTime(),
      }));

      res.json({
        data: formatted,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
      return;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
    });

    res.json(
      products.map((p) => ({
        id: p.serverId,
        sku: p.sku,
        name: p.name,
        category: p.category,
        costPrice: p.costPrice.toNumber(),
        sellingPrice: p.sellingPrice.toNumber(),
        stock: cleanQty(p.stock),
        minStock: cleanQty(p.minStock),
        unit: p.unit,
        step: p.step ? cleanQty(p.step) : undefined,
        piecesPerUnit: p.piecesPerUnit ?? undefined,
        smallUnit: p.smallUnit ?? undefined,
        smallPrice: p.smallPrice ? p.smallPrice.toNumber() : undefined,
        image: p.image,
        isSynced: true,
        isDeleted: p.isDeleted,
        updatedAt: p.updatedAt.getTime(),
      })),
    );
  } catch (e: unknown) {
    res.status(500).json({ error: toPrismaError(e) });
  }
}

export async function syncProducts(
  req: ValidatedRequest<ProductSyncPayload>,
  res: Response,
): Promise<void> {
  const { storeId: providedStoreId, products } = req.validated;
  const access = await requireStoreAccess(req, res, providedStoreId);
  if (!access.ok || !access.storeId) return;
  const storeId = access.storeId;
  const synced: Array<{ id: string; image: string | null }> = [];

  for (const p of products) {
    try {
      if (p.isDeleted) {
        // Hapus file fisik gambar dari Supabase storage jika produk dihapus
        await deleteProductImage(p.id);
      }

      let imageUrl: string | null | undefined = p.isDeleted ? null : p.image;
      if (!p.isDeleted && p.image?.startsWith("data:")) {
        try {
          imageUrl = await uploadProductImage(p.image, p.id);
        } catch (imgErr) {
          console.warn(
            `[products.sync] Image upload failed for SKU ${p.sku}, continuing without new image:`,
            imgErr instanceof Error ? imgErr.message : String(imgErr),
          );
          imageUrl = undefined;
        }
      }

      const existing = await prisma.product.findFirst({
        where: { storeId, serverId: p.id },
      });

      const clientUpdated = new Date(p.updatedAt);
      if (existing && existing.updatedAt > clientUpdated) {
        synced.push({ id: p.id, image: existing.image });
        continue;
      }

      const imageUpdate =
        imageUrl !== undefined ? { image: imageUrl } : {};

      const costPriceUpdate =
        p.costPrice !== undefined ? Number(p.costPrice) : undefined;

      const product = await prisma.product.upsert({
        where: { sku: p.sku },
        update: {
          name: p.name,
          category: p.category,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          stock: Number(p.stock),
          minStock: Number(p.minStock),
          unit: p.unit,
          step: p.step ? Number(p.step) : null,
          piecesPerUnit: p.piecesPerUnit ?? null,
          smallUnit: p.smallUnit ?? null,
          smallPrice: p.smallPrice ? Number(p.smallPrice) : null,
          isDeleted: p.isDeleted ?? false,
          updatedAt: clientUpdated,
          storeId,
          ...imageUpdate,
        },
        create: {
          serverId: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          stock: Number(p.stock),
          minStock: Number(p.minStock),
          unit: p.unit,
          step: p.step ? Number(p.step) : null,
          piecesPerUnit: p.piecesPerUnit ?? null,
          smallUnit: p.smallUnit ?? null,
          smallPrice: p.smallPrice ? Number(p.smallPrice) : null,
          isDeleted: p.isDeleted ?? false,
          image: imageUrl ?? null,
          updatedAt: clientUpdated,
          storeId,
        },
      });

      if (costPriceUpdate !== undefined) {
        await prisma.transactionItem.updateMany({
          where: { productId: product.id },
          data: { costPrice: costPriceUpdate },
        });
      }

      synced.push({ id: p.id, image: product.image });
    } catch (e: unknown) {
      res.status(500).json({ error: toPrismaError(e) });
      return;
    }
  }

  res.json({ synced });
}
