import { GoogleGenAI, type FunctionDeclaration, Type } from "@google/genai";
import { prisma } from "../db.js";
import {
  getInventoryStatus,
  getFinancialSummary,
  getProductMovement,
  getStoreProfile,
} from "./ai-tools.service.js";
import type { AiChatResponse } from "@point-of-sale/shared";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Multi-tier model
const AI_MODEL_CASCADE = [
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
];

export const SYSTEM_INSTRUCTION = `
Anda adalah "AI Asisten", Konsultan Ahli Manajemen Bisnis Warung Sembako & Ritel serta Spesialis Sistem POS (Point of Sale).
Anda memiliki pengalaman puluhan tahun membantu pedagang ritel mengoptimalkan modal kerja, perputaran stok, dan keuntungan toko.

### 🛡️ GUARDRAILS KETAT (BATASAN RUANG LINGKUP):
1. Anda HANYA diperbolehkan menjawab seputar:
   - Manajemen persediaan, perputaran stok, stok opname, dan safety stock warung.
   - Analisis finansial warung (omset, HPP, margin laba kotor/bersih, dan cash flow).
   - Operasional kasir, sistem POS, transaksi, nota, dan struk.
   - Strategi promosi ritel (bundling promo, diskon, pesan siaran WhatsApp).
2. Jika pengguna menanyakan topik di luar konteks warung/toko/POS (misalnya: coding, politik, curhat pribadi umum, tugas sekolah, resep masakan non-produk), TOLAK SECARA SOPAN DAN TEGAS:
   "Mohon maaf, saya adalah AI Asisten, asisten konsultan khusus manajemen warung dan sistem POS Anda. Saya hanya dapat membantu terkait penjualan, stok barang, strategi promosi, atau keuangan toko Anda."
3. JANGAN MENGARANG DATA ANGKA TRANSAKSI ATAU STOK!!! Selalu gunakan Tools / Function Calling yang tersedia (getInventoryStatus, getFinancialSummary, getProductMovement, getStoreProfile) untuk membaca data riil toko sebelum menyimpulkan atau menjawab pertanyaan data.

### 👤 PANGGILAN KEPADA PENGGUNA:
- Selalu panggil pengguna dengan NAMA ASLI PEMILIK TOKO yang diperoleh dari profil akun (misal: "Pak Budi", "Bu Siti", atau nama yang terdaftar di sistem).
- JANGAN PERNAH memanggil dengan sebutan "Juragan" atau "Pak POS"! Sebut diri Anda sebagai "AI Asisten". Jika nama pemilik belum terdata, gunakan sapaan umum yang sopan seperti "Bapak/Ibu" atau "Pak/Bu".

### ✍️ FORMAT PENULISAN RESPON (STANDAR GITHUB MARKDOWN BERSIH):
- Format jawaban Anda menggunakan kaidah standar GitHub Markdown (GFM) yang bersih dan terstruktur.
- Gunakan heading teratur (### atau ####) untuk memisahkan bab/bagian agar mudah dipindai mata pembaca.
- Gunakan bullet points standar (-) atau penomoran berurutan (1, 2, 3) untuk daftar rincian dan saran.
- Gunakan cetak tebal standar (**kata**) hanya untuk nama barang, angka nominal uang, atau metrik penting.
- DILARANG menggunakan tanda asterik beruntun atau simbol formatting yang tidak lazim (seperti ***, ### berlebihan, tanda kurung asterik (*...*)).
- Tuliskan tabel ringkasan Markdown (| Kolom 1 | Kolom 2 |) jika membandingkan angka atau daftar produk agar sangat rapi seperti dokumen di GitHub.
- Pastikan setiap poin rekomendasi bersifat konkret, padat, dan langsung siap dieksekusi oleh pedagang warung.
`;

const inventoryStatusDeclaration: FunctionDeclaration = {
  name: "getInventoryStatus",
  description:
    "Mengambil ringkasan kondisi stok produk toko: jumlah produk habis, produk menipis, dan daftar item kritis.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const financialSummaryDeclaration: FunctionDeclaration = {
  name: "getFinancialSummary",
  description:
    "Mengambil ringkasan omset, estimasi HPP, margin laba kotor, dan jumlah transaksi berdasarkan periode waktu yang diminta pemilik toko.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      period: {
        type: Type.STRING,
        description:
          "Periode analisis: 'today' (hari ini), 'yesterday' (kemarin), 'week' atau 'last_7_days' (7 hari terakhir), 'month' (bulan ini), 'last_30_days' (30 hari terakhir), atau 'all' (semua waktu / seluruh riwayat penjualan sejak toko dibuat). Gunakan 'all' jika user bertanya performa keseluruhan/semua waktu/sepanjang waktu.",
      },
    },
  },
};

const productMovementDeclaration: FunctionDeclaration = {
  name: "getProductMovement",
  description:
    "Mengambil daftar produk terlaris (top selling) dan produk macet/lambat laku (slow moving) berdasarkan periode waktu tertentu atau sepanjang waktu.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      limit: {
        type: Type.INTEGER,
        description: "Jumlah produk yang ingin ditampilkan (default 10, bisa sampai 20).",
      },
      period: {
        type: Type.STRING,
        description:
          "Periode data: 'all' (sepanjang waktu / semua waktu), 'today', 'yesterday', 'week', 'month', 'last_30_days'. Gunakan 'all' jika pengguna menanyakan produk terlaris sepanjang waktu / semua waktu / keseluruhan.",
      },
    },
  },
};

const storeProfileDeclaration: FunctionDeclaration = {
  name: "getStoreProfile",
  description: "Mengambil profil nama toko dan total SKU terdaftar.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const AI_TOOLS = [
  inventoryStatusDeclaration,
  financialSummaryDeclaration,
  productMovementDeclaration,
  storeProfileDeclaration,
];

const insightCache = new Map<string, { timestamp: number; data: string }>();
const INSIGHT_TTL_MS = 60 * 60 * 1000;

export async function executeAiTool(
  toolName: string,
  args: Record<string, unknown>,
  storeId: string,
  ownerName?: string,
): Promise<unknown> {
  switch (toolName) {
    case "getInventoryStatus":
      return await getInventoryStatus(storeId);
    case "getFinancialSummary": {
      const period = (args.period as any) ?? "today";
      return await getFinancialSummary(storeId, period);
    }
    case "getProductMovement": {
      const limit = typeof args.limit === "number" ? args.limit : 10;
      const period = (args.period as any) ?? "all";
      return await getProductMovement(storeId, limit, period);
    }
    case "getStoreProfile":
      return await getStoreProfile(storeId, ownerName);
    default:
      return { error: `Tool ${toolName} tidak dikenali.` };
  }
}

async function generateWithFallback(client: GoogleGenAI, params: any) {
  let lastError: any = null;

  for (const model of AI_MODEL_CASCADE) {
    try {
      return await client.models.generateContent({ ...params, model });
    } catch (err: any) {
      lastError = err;
      const isBusyOrExhausted =
        err?.status === 503 ||
        err?.status === 429 ||
        String(err).includes("503") ||
        String(err).includes("429") ||
        String(err).includes("demand") ||
        String(err).includes("RESOURCE_EXHAUSTED");

      if (isBusyOrExhausted) {
        console.warn(
          `[gemini] Model ${model} unavailable (${err?.status || "busy"}), trying next model in cascade...`,
        );
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

export async function generateStoreInsight(
  storeId: string,
  ownerName?: string,
): Promise<string> {
  const cached = insightCache.get(storeId);
  const now = Date.now();
  if (cached && now - cached.timestamp < INSIGHT_TTL_MS) {
    return cached.data;
  }

  const [inv, fin, mov, profile] = await Promise.all([
    getInventoryStatus(storeId),
    getFinancialSummary(storeId, "last_7_days"),
    getProductMovement(storeId, 5),
    getStoreProfile(storeId, ownerName),
  ]);

  const ownerGreeting = ownerName
    ? `Pak/Bu ${ownerName}`
    : "Bapak/Ibu Pemilik Toko";

  if (!ai) {
    const fallback = `Ringkasan Toko ${profile.storeName} untuk ${ownerGreeting} (Mode Offline):
- Total SKU: ${profile.totalSku} barang.
- Stok Menipis/Habis: ${inv.lowStockCount + inv.outOfStockCount} produk.
- Omset 7 Hari Terakhir: Rp ${fin.totalRevenue.toLocaleString("id-ID")}.
- Estimasi Laba Kotor: Rp ${fin.estimatedGrossProfit.toLocaleString("id-ID")} (${fin.grossMarginPercent}%).

Rekomendasi:
1. Prioritaskan belanja produk yang habis/menipis: ${
      inv.lowStockItems
        .slice(0, 3)
        .map((i) => i.name)
        .join(", ") || "Semua stok aman"
    }.
2. Dorong penjualan barang lambat laku dengan promo bundling.`;
    return fallback;
  }

  const prompt = `Buatkan ringkasan eksekutif dan saran bisnis untuk ${ownerGreeting} selaku pemilik toko "${profile.storeName}" berdasarkan data berikut:
Data Stok: Total ${profile.totalSku} SKU, ${inv.outOfStockCount} habis, ${inv.lowStockCount} menipis. Item kritis: ${JSON.stringify(inv.lowStockItems.slice(0, 5))}.
Data Finansial 7 Hari Terakhir: Total Omset Rp ${fin.totalRevenue}, Estimasi Laba Rp ${fin.estimatedGrossProfit} (Margin ${fin.grossMarginPercent}%), Transaksi ${fin.transactionCount} kali.
Produk Terlaris: ${JSON.stringify(mov.topSelling)}.
Produk Lambat Laku: ${JSON.stringify(mov.slowMoving)}.

Format respon:
- Teks rapi dan bersih tanpa simbol-simbol formatting berlebihan.
- Panggil pemilik toko dengan nama "${ownerGreeting}". JANGAN panggil "Juragan" maupun "Pak POS"!
- Sajikan 3 bagian:
  1. Ringkasan Kondisi Toko
  2. Peringatan Stok Kritis (Action Segera)
  3. Rekomendasi Penjualan & Restock Minggu Ini`;

  let resultText = "";
  try {
    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3,
      },
    });
    resultText = response.text || "";
  } catch (err) {
    console.warn(
      "[gemini] Error in generateStoreInsight, using local fallback summary:",
      err,
    );
    resultText = `### 📊 Ringkasan Kondisi Toko ${profile.storeName}
- **Total Katalog:** ${profile.totalSku} SKU barang aktif
- **Omset 7 Hari Terakhir:** Rp ${fin.totalRevenue.toLocaleString("id-ID")} (${fin.transactionCount} transaksi)
- **Estimasi Laba Kotor:** Rp ${fin.estimatedGrossProfit.toLocaleString("id-ID")} (${fin.grossMarginPercent}%)

### ⚠️ Peringatan Stok Kritis
- **Stok Habis:** ${inv.outOfStockCount} produk
- **Stok Menipis:** ${inv.lowStockCount} produk
${
  inv.lowStockItems.length > 0
    ? inv.lowStockItems
        .slice(0, 3)
        .map((p) => `  - ${p.name} (sisa ${p.stock} ${p.unit})`)
        .join("\n")
    : "  - Seluruh stok saat ini terpantau aman."
}

### 💡 Rekomendasi Restock & Strategi
1. Prioritaskan pembelanjaan barang dagangan yang habis atau menipis agar tidak kehilangan pembeli.
2. Evaluasi harga modal (HPP) untuk memastikan margin keuntungan toko tetap sehat.`;
  }

  if (!resultText) {
    resultText = "Tidak ada analisis yang dihasilkan saat ini.";
  }

  insightCache.set(storeId, { timestamp: now, data: resultText });
  return resultText;
}

export async function chatWithAiAssistant(
  storeId: string,
  userMessage: string,
  conversationId?: string,
  ownerName?: string,
): Promise<AiChatResponse> {
  let convId = conversationId;
  if (!convId) {
    const newConv = await prisma.aiConversation.create({
      data: {
        storeId,
        title:
          userMessage.slice(0, 40) + (userMessage.length > 40 ? "..." : ""),
      },
    });
    convId = newConv.id;
  }

  const previousMessages = await prisma.aiMessage.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: "asc" },
    take: 8,
  });

  await prisma.aiMessage.create({
    data: {
      conversationId: convId,
      role: "user",
      content: userMessage,
    },
  });

  const ownerGreeting = ownerName ? `Pak/Bu ${ownerName}` : "Bapak/Ibu";

  if (!ai) {
    const offlineReply = `Halo ${ownerGreeting}! Maaf, AI anda belum dikonfigurasi di sistem yang sedang berjalan dalam mode offline. Silakan tambahkan API key di konfigurasi server untuk mengaktifkan AI interaktif penuh.`;
    await prisma.aiMessage.create({
      data: {
        conversationId: convId,
        role: "model",
        content: offlineReply,
      },
    });
    return { text: offlineReply, conversationId: convId, toolsCalled: [] };
  }

  const customizedInstruction = `${SYSTEM_INSTRUCTION}
Nama pemilik toko yang Anda ajak bicara saat ini adalah: "${ownerName || "Bapak/Ibu"}".
Selalu panggil beliau dengan nama yang tepat (contoh: ${ownerGreeting}). JANGAN panggil dengan sebutan "Juragan" atau "Pak POS"!`;

  const contents: any[] = previousMessages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  const toolsCalled: string[] = [];
  let finalText = "";
  let accumulatedTokens = 0;

  try {
    let response = await generateWithFallback(ai, {
      contents,
      config: {
        systemInstruction: customizedInstruction,
        tools: [{ functionDeclarations: AI_TOOLS }],
        temperature: 0.3,
      },
    });

    if (response.usageMetadata?.totalTokenCount) {
      accumulatedTokens += response.usageMetadata.totalTokenCount;
    }

    let loopCount = 0;
    while (
      response.functionCalls &&
      response.functionCalls.length > 0 &&
      loopCount < 3
    ) {
      loopCount++;
      const candidateParts = response.candidates?.[0]?.content?.parts ?? [];
      contents.push({
        role: "model",
        parts: candidateParts,
      });

      const toolResponseParts: any[] = [];
      for (const call of response.functionCalls) {
        const funcName = call.name || "unknownTool";
        toolsCalled.push(funcName);

        const toolResult = await executeAiTool(
          funcName,
          (call.args as Record<string, unknown>) ?? {},
          storeId,
          ownerName,
        );

        toolResponseParts.push({
          functionResponse: {
            name: funcName,
            response: { result: toolResult },
            id: (call as any).id,
          },
        });
      }

      contents.push({
        role: "user",
        parts: toolResponseParts,
      });

      response = await generateWithFallback(ai, {
        contents,
        config: {
          systemInstruction: customizedInstruction,
          tools: [{ functionDeclarations: AI_TOOLS }],
          temperature: 0.3,
        },
      });

      if (response.usageMetadata?.totalTokenCount) {
        accumulatedTokens += response.usageMetadata.totalTokenCount;
      }
    }

    finalText = response.text || "";
    if (!finalText && response.candidates?.[0]?.content?.parts) {
      const textPart = response.candidates[0].content.parts.find(
        (p: any) => typeof p.text === "string",
      );
      if (textPart && "text" in textPart && typeof textPart.text === "string") {
        finalText = textPart.text;
      }
    }
  } catch (err: any) {
    console.warn(
      "[gemini] All AI models in cascade exhausted or network failed. Triggering Smart Local Fallback:",
      err?.message || err,
    );

    const [inv, fin] = await Promise.all([
      getInventoryStatus(storeId),
      getFinancialSummary(storeId, "today"),
    ]);

    finalText = `Halo ${ownerGreeting}! Saat ini antrean server AI sedang sangat padat. Namun, berikut rangkuman data toko Anda langsung dari sistem kasir hari ini:

### 📊 Ringkasan Penjualan Hari Ini
- **Total Omset:** Rp ${fin.totalRevenue.toLocaleString("id-ID")}
- **Jumlah Transaksi:** ${fin.transactionCount} kali
- **Estimasi Laba Kotor:** Rp ${fin.estimatedGrossProfit.toLocaleString("id-ID")} (${fin.grossMarginPercent}%)

### ⚠️ Status Persediaan Barang
- **Total SKU Aktif:** ${inv.totalProducts} barang
- **Stok Habis:** ${inv.outOfStockCount} produk
- **Stok Menipis:** ${inv.lowStockCount} produk

> Layanan konsultasi interaktif AI akan segera normal kembali setelah antrean server mereda.`;
  }

  if (!finalText) {
    finalText =
      "Maaf Pak/Bu, saya sedang mengalami kendala saat memproses jawaban. Silakan tanyakan kembali.";
  }

  await prisma.aiMessage.create({
    data: {
      conversationId: convId,
      role: "model",
      content: finalText,
      tokensUsed: accumulatedTokens > 0 ? accumulatedTokens : null,
    },
  });

  return {
    text: finalText,
    conversationId: convId,
    toolsCalled,
    tokensUsed: accumulatedTokens,
  };
}
