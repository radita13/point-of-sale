import type { Response } from "express";
import { prisma } from "../db";
import { toPrismaError } from "../lib/errors";
import { requireStoreAccess } from "../middleware/store-access";
import type { ValidatedRequest } from "../types/http";
import type { Prisma } from "../generated/client";
import type {
  GetTransactionsQuery,
  PaymentMethod,
  SyncPayload,
  SyncStatusQuery,
  Unit,
} from "@point-of-sale/shared";

async function nextInvoiceNoForStore(
  tx: Prisma.TransactionClient,
  storeId: string,
  invoiceNo: string,
): Promise<string> {
  const lastDash = invoiceNo.lastIndexOf("-");
  const prefix = invoiceNo.slice(0, lastDash + 1);
  const rows = await tx.transaction.findMany({
    where: { storeId, invoiceNo: { startsWith: prefix } },
    select: { invoiceNo: true },
  });
  let maxSeq = 0;
  for (const r of rows) {
    const m = r.invoiceNo.match(/-(\d{4})$/);
    if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
}

export async function syncTransactions(
  req: ValidatedRequest<SyncPayload>,
  res: Response,
): Promise<void> {
  const { storeId: providedStoreId, transactions } = req.validated;
  const access = await requireStoreAccess(req, res, providedStoreId);
  if (!access.ok || !access.storeId) return;
  const storeId = access.storeId;

  try {
    const feProductIds: string[] = Array.from(
      new Set(
        transactions.flatMap((t) =>
          t.items.map((it) => String(it.productId)),
        ),
      ),
    );

    const foundProducts = await prisma.product.findMany({
      where: {
        OR: [{ id: { in: feProductIds } }, { serverId: { in: feProductIds } }],
      },
    });

    const productIdMap = new Map<string, string>();
    for (const p of foundProducts) {
      productIdMap.set(p.id, p.id);
      productIdMap.set(p.serverId, p.id);
    }

    const updated: string[] = [];
    const skipped: string[] = [];
    const invoiceNoMap: Record<string, string> = {};

    for (const t of transactions) {
      const existing = await prisma.transaction.findUnique({
        where: { id: t.id },
      });
      if (existing) {
        updated.push(t.id);
        continue;
      }

      const invalidItem = t.items.find(
        (it) => !productIdMap.has(it.productId),
      );
      if (invalidItem) {
        console.warn(
          `[transactions/sync] Skip transaction ${t.id} (${t.invoiceNo}): product '${invalidItem.productName}' (${invalidItem.productId}) not found on server.`,
        );
        skipped.push(t.id);
        continue;
      }

      let invoiceNo = t.invoiceNo;
      let created = false;
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        try {
          await prisma.transaction.create({
            data: {
              id: t.id,
              invoiceNo,
              timestamp: new Date(t.timestamp),
              totalAmount: t.totalAmount,
              finalAmount: t.finalAmount,
              paymentMethod: t.paymentMethod,
              payAmount: t.payAmount,
              changeAmount: t.changeAmount,
              storeId,
              items: {
                create: t.items.map((it) => ({
                  productId: productIdMap.get(it.productId)!,
                  productName: it.productName,
                  sku: it.sku,
                  qty: it.qty,
                  unit: it.unit,
                  price: it.price,
                  costPrice: it.costPrice ?? null,
                  subtotal: it.subtotal,
                })),
              },
            },
          });
          created = true;
          updated.push(t.id);
          if (invoiceNo !== t.invoiceNo) {
            invoiceNoMap[t.id] = invoiceNo;
          }
        } catch (err: unknown) {
          const isPrismaP2002 =
            err &&
            typeof err === "object" &&
            "code" in err &&
            (err as { code: string }).code === "P2002";

          if (isPrismaP2002 && attempt < 4) {
            const resolvedInvoiceNo = await nextInvoiceNoForStore(
              prisma,
              storeId,
              t.invoiceNo,
            );
            invoiceNo = resolvedInvoiceNo;
          } else {
            console.error(`[transactions/sync] error inserting ${t.id}:`, err);
            break;
          }
        }
      }
    }

    res.json({
      synced: updated,
      skipped,
      invoiceNoMap,
    });
  } catch (e: unknown) {
    res.status(500).json({ error: toPrismaError(e) });
  }
}

export async function getSyncStatus(
  req: ValidatedRequest<SyncStatusQuery>,
  res: Response,
): Promise<void> {
  const { ids, storeId: providedStoreId } = req.validated;
  const access = await requireStoreAccess(req, res, providedStoreId);
  if (!access.ok || !access.storeId) return;
  const storeId = access.storeId;
  try {
    const where = storeId ? { id: { in: ids }, storeId } : { id: { in: ids } };
    const found = await prisma.transaction.findMany({ where });
    const syncedMap: Record<string, number> = Object.fromEntries(
      found.map((tx) => [tx.id, tx.timestamp.getTime()]),
    );
    res.json({ synced: syncedMap });
  } catch (e: unknown) {
    res.status(500).json({ error: toPrismaError(e) });
  }
}

export async function getTransactions(
  req: ValidatedRequest<GetTransactionsQuery>,
  res: Response,
): Promise<void> {
  const {
    storeId: providedStoreId,
    page: rawPage,
    limit: rawLimit,
  } = req.validated;
  const access = await requireStoreAccess(req, res, providedStoreId);
  if (!access.ok || !access.storeId) return;
  const storeId = access.storeId;

  const page = Math.max(1, Number(rawPage ?? 1));
  const limit = Math.min(100, Math.max(1, Number(rawLimit ?? 10)));
  const skip = (page - 1) * limit;

  try {
    const [total, rows] = await Promise.all([
      prisma.transaction.count({ where: { storeId } }),
      prisma.transaction.findMany({
        where: { storeId },
        include: { items: true },
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      data: rows.map((t) => ({
        id: t.id,
        invoiceNo: t.invoiceNo,
        timestamp: t.timestamp.getTime(),
        totalAmount: t.totalAmount.toNumber(),
        finalAmount: t.finalAmount.toNumber(),
        paymentMethod: t.paymentMethod as PaymentMethod,
        payAmount: t.payAmount.toNumber(),
        changeAmount: t.changeAmount.toNumber(),
        items: t.items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          sku: it.sku ?? undefined,
          qty: it.qty,
          unit: it.unit as Unit,
          price: it.price.toNumber(),
          costPrice: it.costPrice ? it.costPrice.toNumber() : undefined,
          subtotal: it.subtotal.toNumber(),
        })),
        isSynced: true,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e: unknown) {
    res.status(500).json({ error: toPrismaError(e) });
  }
}
