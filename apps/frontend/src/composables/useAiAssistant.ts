import { ref, onMounted } from 'vue';
import type { Product } from '@point-of-sale/shared';
import { db } from '@/db/database';
import { formatPrice } from '@/lib/utils';
import { toast } from 'vue-sonner';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export function useAiAssistant() {
  const products = ref<Product[]>([]);
  const isAiGenerating = ref(false);
  const aiInsightResult = ref<string | null>(null);

  const selectedPromoProductId = ref<string>('');
  const isGeneratingPromo = ref(false);
  const generatedPromoText = ref<string>('');

  const aiUserQuery = ref('');
  const isAiChatting = ref(false);
  const aiChatMessages = ref<ChatMessage[]>([
    {
      role: 'model',
      text: 'Halo Pak/Bu! Saya Asisten AI Warung Sembako. Ada yang bisa saya bantu terkait stok, harga, atau saran usaha hari ini?',
    },
  ]);

  onMounted(async () => {
    products.value = await db.products.toArray();
    if (products.value.length > 0) {
      selectedPromoProductId.value = products.value[0].id;
    }
  });

  async function generateAiInsight() {
    isAiGenerating.value = true;
    await new Promise((r) => setTimeout(r, 1200));
    const lowStockCount = products.value.filter((p) => p.stock <= p.minStock).length;
    aiInsightResult.value = `📊 Ringkasan Analisis Toko:
• ${products.value.length} Total jenis barang di katalog.
• ⚠️ ${lowStockCount} Produk butuh restock segera karena stok menipis.

💡 Rekomendasi Restock & Strategi:
1. Segera beli pasokan Minyak & Beras karena perputaran mingguan sangat tinggi.
2. Pertimbangkan promo bundling eceran untuk barang stok melimpah.`;
    isAiGenerating.value = false;
  }

  async function generateWaPromo() {
    const prod = products.value.find((p) => p.id === selectedPromoProductId.value);
    if (!prod) return;
    isGeneratingPromo.value = true;
    await new Promise((r) => setTimeout(r, 800));
    generatedPromoText.value = `🔥 PROMO SPESIAL WARUNG HARGA HEMAT! 🔥

Dapatkan ${prod.name} cuma Rp ${formatPrice(prod.sellingPrice)} per ${prod.unit}!
Stok terbatas, yuk buruan pesan sebelum kehabisan! WA ke toko sekarang ya Bu/Pak 🙏`;
    isGeneratingPromo.value = false;
  }

  function copyPromoText() {
    if (!generatedPromoText.value) return;
    navigator.clipboard.writeText(generatedPromoText.value);
    toast.success('Teks promo berhasil disalin!');
  }

  async function sendAiQuery() {
    if (!aiUserQuery.value || isAiChatting.value) return;
    const q = aiUserQuery.value;
    aiChatMessages.value.push({ role: 'user', text: q });
    aiUserQuery.value = '';
    isAiChatting.value = true;
    await new Promise((r) => setTimeout(r, 1000));
    aiChatMessages.value.push({
      role: 'model',
      text: `Terima kasih pertanyaannya tentang "${q}". Untuk mengoptimalkan penjualan, pastikan stok barang terlaris selalu aman dan catat transaksi secara konsisten.`,
    });
    isAiChatting.value = false;
  }

  return {
    products,
    isAiGenerating,
    aiInsightResult,
    selectedPromoProductId,
    isGeneratingPromo,
    generatedPromoText,
    aiUserQuery,
    isAiChatting,
    aiChatMessages,
    generateAiInsight,
    generateWaPromo,
    copyPromoText,
    sendAiQuery,
  };
}
