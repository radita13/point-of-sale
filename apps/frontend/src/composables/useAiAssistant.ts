import { ref, onMounted, computed } from 'vue';
import type { Product } from '@point-of-sale/shared';
import { db } from '@/db/database';
// import { formatPrice } from '@/lib/utils';
import { api } from '@/services/api';
import { toast } from 'vue-sonner';
import { useAuthStore } from '@/stores';
import { useStoreSettingsStore } from '@/stores/storeSettings';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  toolsCalled?: string[];
  createdAt?: string;
}

function createWelcomeMessage(ownerName?: string): ChatMessage {
  const ownerGreeting = ownerName ? `Pak/Ibu ${ownerName}` : 'Bapak/Ibu';
  return {
    role: 'model',
    text: `Halo ${ownerGreeting}! Saya AI Asisten, Konsultan Bisnis Warung & Ritel Anda. Ada yang bisa saya bantu terkait omset, margin laba, analisa barang terlaris, atau saran restock hari ini?`,
    createdAt: new Date().toISOString(),
  };
}

export function useAiAssistant() {
  const auth = useAuthStore();
  const storeSettings = useStoreSettingsStore();

  const ownerDisplayName = computed(() => {
    return (
      auth.userMetadata?.fullName?.trim() || storeSettings.settings.ownerName?.trim() || 'Bapak/Ibu'
    );
  });

  const products = ref<Product[]>([]);
  const isAiGenerating = ref(false);
  const aiInsightResult = ref<string | null>(null);

  const selectedPromoProductId = ref<string>('');
  const isGeneratingPromo = ref(false);
  const generatedPromoText = ref<string>('');

  const aiUserQuery = ref('');
  const isAiChatting = ref(false);
  const isLoadingHistory = ref(true);
  const currentConversationId = ref<string | undefined>(undefined);
  const activeToolStatus = ref<string | null>(null);

  const aiChatMessages = ref<ChatMessage[]>([]);

  onMounted(async () => {
    isLoadingHistory.value = true;
    try {
      products.value = (await db.products.toArray()).filter((p) => !p.isDeleted);
      if (products.value.length > 0) {
        selectedPromoProductId.value = products.value[0].id;
      }

      if (navigator.onLine) {
        try {
          const res = await api.getAiConversations();
          if (res.conversations && res.conversations.length > 0) {
            const latest = res.conversations[0];
            currentConversationId.value = latest.id;
            if (latest.messages && latest.messages.length > 0) {
              aiChatMessages.value = latest.messages.map((m: any) => ({
                role: m.role,
                text: m.content,
                createdAt: m.createdAt,
              }));
            } else {
              aiChatMessages.value = [createWelcomeMessage(ownerDisplayName.value)];
            }
          } else {
            aiChatMessages.value = [createWelcomeMessage(ownerDisplayName.value)];
          }
        } catch {
          aiChatMessages.value = [createWelcomeMessage(ownerDisplayName.value)];
        }
      } else {
        aiChatMessages.value = [createWelcomeMessage(ownerDisplayName.value)];
      }
    } finally {
      isLoadingHistory.value = false;
    }
  });

  async function generateAiInsight() {
    if (!navigator.onLine) {
      toast.error('Analisis AI memerlukan koneksi internet.');
      return;
    }

    isAiGenerating.value = true;
    try {
      const res = await api.getAiInsight();
      aiInsightResult.value = res.insight;
      toast.success('Analisis toko terbaru berhasil dibuat!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghasilkan analisis AI.');
    } finally {
      isAiGenerating.value = false;
    }
  }

  // async function generateWaPromo() {
  //   const prod = products.value.find((p) => p.id === selectedPromoProductId.value);
  //   if (!prod) {
  //     toast.error('Pilih produk untuk promo terlebih dahulu.');
  //     return;
  //   }

  //   isGeneratingPromo.value = true;
  //   if (navigator.onLine) {
  //     try {
  //       const res = await api.chatAi(
  //         `Tolong buatkan pesan siaran promosi WhatsApp yang menarik untuk produk warung saya: "${prod.name}" dengan harga Rp ${formatPrice(prod.sellingPrice)} per ${prod.unit}. Gunakan format WhatsApp (tebal, miring, emoji) dan ajak pembeli segera datang atau pesan lewat chat.`,
  //         currentConversationId.value
  //       );
  //       generatedPromoText.value = res.text;
  //       currentConversationId.value = res.conversationId;
  //     } catch {
  //       generatedPromoText.value = `🔥 PROMO SPESIAL WARUNG HARGA HEMAT! 🔥\n\nDapatkan ${prod.name} cuma Rp ${formatPrice(prod.sellingPrice)} per ${prod.unit}!\nStok terbatas, yuk buruan borong sebelum kehabisan! Langsung chat atau datang ke warung ya Pak/Bu 🙏`;
  //     } finally {
  //       isGeneratingPromo.value = false;
  //     }
  //   } else {
  //     generatedPromoText.value = `🔥 PROMO SPESIAL WARUNG HARGA HEMAT! 🔥\n\nDapatkan ${prod.name} cuma Rp ${formatPrice(prod.sellingPrice)} per ${prod.unit}!\nStok terbatas, yuk buruan borong sebelum kehabisan! Langsung chat atau datang ke warung ya Pak/Bu 🙏`;
  //     isGeneratingPromo.value = false;
  //   }
  // }

  function copyPromoText() {
    if (!generatedPromoText.value) return;
    navigator.clipboard.writeText(generatedPromoText.value);
    toast.success('Teks promo berhasil disalin ke clipboard!');
  }

  async function sendAiQuery(customQuery?: string) {
    const q = (customQuery || aiUserQuery.value).trim();
    if (!q || isAiChatting.value) return;

    if (!navigator.onLine) {
      toast.error('Konsultasi AI memerlukan koneksi internet.');
      return;
    }

    aiChatMessages.value.push({ role: 'user', text: q, createdAt: new Date().toISOString() });
    if (!customQuery) aiUserQuery.value = '';
    isAiChatting.value = true;
    activeToolStatus.value = 'Menganalisis pertanyaan...';

    try {
      activeToolStatus.value = 'AI Asisten sedang menganalisis...';
      const res = await api.chatAi(q, currentConversationId.value);
      currentConversationId.value = res.conversationId;

      aiChatMessages.value.push({
        role: 'model',
        text: res.text,
        toolsCalled: res.toolsCalled,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      aiChatMessages.value.push({
        role: 'model',
        text: `Mohon maaf ${ownerDisplayName.value ? `Pak/Bu ${ownerDisplayName.value}` : 'Pak/Bu'}, terjadi kendala saat menghubungi server AI. Pastikan server aktif atau periksa koneksi internet Anda.`,
        createdAt: new Date().toISOString(),
      });
      toast.error('Gagal mengirim pesan ke AI.');
    } finally {
      isAiChatting.value = false;
      activeToolStatus.value = null;
    }
  }

  async function resetChat() {
    if (currentConversationId.value && navigator.onLine) {
      try {
        await api.deleteAiConversation(currentConversationId.value);
      } catch {}
    }
    currentConversationId.value = undefined;
    aiChatMessages.value = [
      {
        role: 'model',
        text: `Sesi percakapan telah direset. Ada topik bisnis warung baru yang ingin Anda diskusikan ${ownerDisplayName.value ? `Pak/Bu ${ownerDisplayName.value}` : 'Pak/Bu'}?`,
        createdAt: new Date().toISOString(),
      },
    ];
    toast.info('Percakapan telah direset.');
  }

  const canReset = computed(() => {
    if (isLoadingHistory.value || isAiChatting.value) return false;
    return Boolean(
      currentConversationId.value ||
      aiChatMessages.value.some((m) => m.role === 'user') ||
      aiChatMessages.value.length > 1
    );
  });

  return {
    products,
    isAiGenerating,
    aiInsightResult,
    selectedPromoProductId,
    isGeneratingPromo,
    generatedPromoText,
    aiUserQuery,
    isAiChatting,
    isLoadingHistory,
    activeToolStatus,
    aiChatMessages,
    generateAiInsight,
    // generateWaPromo,
    copyPromoText,
    sendAiQuery,
    resetChat,
    canReset,
  };
}
