import type { Response } from "express";
import { requireStoreAccess } from "../middleware/store-access.js";
import type { ValidatedRequest } from "../types/http.js";
import { prisma } from "../db.js";
import {
  generateStoreInsight,
  chatWithAiAssistant,
} from "../services/gemini.service.js";

export async function getStoreInsightHandler(
  req: ValidatedRequest<{ storeId?: string }>,
  res: Response
): Promise<void> {
  const { storeId: providedStoreId } = (req.query as { storeId?: string }) ?? {};
  const access = await requireStoreAccess(req, res, providedStoreId);
  if (!access.ok || !access.storeId) return;

  const ownerName = req.auth?.name ?? undefined;

  try {
    const insight = await generateStoreInsight(access.storeId, ownerName);
    res.json({ insight });
  } catch (err: unknown) {
    console.error("[ai.controller] Error generating insight:", err);
    res.status(500).json({ error: "Gagal memproses analisis AI toko." });
  }
}

export async function chatAiHandler(
  req: ValidatedRequest<{ message: string; conversationId?: string; storeId?: string }>,
  res: Response
): Promise<void> {
  const { message, conversationId, storeId: providedStoreId } = req.validated;
  if (!message.trim()) {
    res.status(400).json({ error: "Pesan tidak boleh kosong." });
    return;
  }

  const access = await requireStoreAccess(req, res, providedStoreId);
  if (!access.ok || !access.storeId) return;

  const ownerName = req.auth?.name ?? undefined;

  try {
    const reply = await chatWithAiAssistant(access.storeId, message.trim(), conversationId, ownerName);
    res.json(reply);
  } catch (err: unknown) {
    console.error("[ai.controller] Error in AI chat:", err);
    res.status(500).json({ error: "Gagal memproses pertanyaan AI." });
  }
}

export async function getConversationsHandler(
  req: ValidatedRequest,
  res: Response
): Promise<void> {
  const access = await requireStoreAccess(req, res);
  if (!access.ok || !access.storeId) return;

  try {
    const conversations = await prisma.aiConversation.findMany({
      where: { storeId: access.storeId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
    res.json({ conversations });
  } catch (err: unknown) {
    console.error("[ai.controller] Error fetching conversations:", err);
    res.status(500).json({ error: "Gagal mengambil riwayat percakapan AI." });
  }
}

export async function deleteConversationHandler(
  req: ValidatedRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const access = await requireStoreAccess(req, res);
  if (!access.ok || !access.storeId) return;

  try {
    await prisma.aiConversation.deleteMany({
      where: { id, storeId: access.storeId },
    });
    res.json({ success: true });
  } catch (err: unknown) {
    console.error("[ai.controller] Error deleting conversation:", err);
    res.status(500).json({ error: "Gagal menghapus percakapan AI." });
  }
}
