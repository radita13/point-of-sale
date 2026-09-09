<script setup lang="ts">
import {
  Sparkles,
  RefreshCw,
  CheckCircle,
  Send,
  Copy,
  Brain,
  Trash2,
  Cpu,
  Bot,
} from 'lucide-vue-next';
import { useAiAssistant } from '@/composables/useAiAssistant';
import { renderMarkdown } from '@/lib/markdown';
import { formatDateSeparator, shouldShowDateSeparator } from '@/lib/utils';
import { toast } from 'vue-sonner';
import Button from '@/components/ui/Button.vue';
import { quickChips } from '@/constants/aiasistant.constants';
import Input from '@/components/ui/Input.vue';

function copyText(text: string) {
  if (!text) return;
  navigator.clipboard.writeText(text);
  toast.success('Teks pesan berhasil disalin!');
}

const {
  isAiGenerating,
  aiInsightResult,
  aiUserQuery,
  isAiChatting,
  isLoadingHistory,
  activeToolStatus,
  aiChatMessages,
  generateAiInsight,
  sendAiQuery,
  resetChat,
  canReset,
} = useAiAssistant();
</script>

<template>
  <div class="space-y-5">
    <div
      class="border-ink bg-surface shadow-hard-md flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 p-4"
    >
      <div class="flex items-center gap-3">
        <div
          class="border-ink bg-card-purple shadow-hard-sm flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 text-xl font-black text-white"
        >
          <Sparkles class="h-5 w-5 text-amber-300" />
        </div>
        <div>
          <h2 class="text-lg font-extrabold">AI Asisten — Konsultan Bisnis Warung & Ritel</h2>
          <p class="text-xs font-semibold text-gray-600">
            Analisis data riil stok, profit margin, deteksi produk lambat laku, & strategi bisnis
            toko
          </p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-5 lg:h-[calc(100dvh-155px)] lg:min-h-0 lg:grid-cols-12">
      <div
        class="border-ink bg-surface shadow-hard-md flex h-full min-h-0 flex-col gap-3 rounded-2xl border-2 p-4 lg:col-span-7"
      >
        <div class="border-ink flex shrink-0 items-center justify-between border-b-2 pb-3">
          <h3 class="flex items-center gap-2 text-sm font-extrabold">
            <Brain class="text-card-purple h-5 w-5" />
            <span>Analisis Otomatis Kondisi Toko</span>
          </h3>
          <Button
            @click="generateAiInsight"
            :disabled="isAiGenerating"
            size="md"
            class="bg-card-purple hover:bg-card-purple/85 text-xs font-extrabold"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isAiGenerating }" />
            <span>{{ isAiGenerating ? 'Menganalisis...' : 'Mulai Analisis AI' }}</span>
          </Button>
        </div>

        <div
          v-if="!aiInsightResult && !isAiGenerating"
          class="border-ink bg-canvas flex flex-1 flex-col items-center justify-center space-y-2 rounded-xl border-2 p-6 text-center"
        >
          <Sparkles class="text-card-purple mx-auto h-10 w-10" />
          <h4 class="text-sm font-extrabold">Belum Ada Analisis AI Hari Ini</h4>
          <p class="mx-auto max-w-md text-xs font-semibold text-gray-600">
            Klik tombol "Mulai Analisis AI" di atas untuk menjalankan diagnosa otomatis kondisi
            stok, omset riil, dan rekomendasi pembelian supplier warung Anda.
          </p>
        </div>

        <div
          v-if="isAiGenerating"
          class="border-ink bg-canvas flex flex-1 flex-col items-center justify-center space-y-3 rounded-xl border-2 p-6 text-center"
        >
          <div
            class="border-card-purple mx-auto h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
          ></div>
          <p class="text-ink text-xs font-extrabold">
            AI Asisten sedang memeriksa perputaran stok & transaksi toko Anda...
          </p>
        </div>

        <div
          v-if="aiInsightResult && !isAiGenerating"
          class="border-ink bg-canvas neo-scroll flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto rounded-xl border-2 p-4 text-xs leading-relaxed font-bold"
        >
          <div
            class="text-card-purple bg-canvas border-ink/20 flex shrink-0 items-center justify-between border-b pb-2"
          >
            <span
              class="flex items-center gap-1 text-[11px] font-extrabold tracking-wider uppercase"
            >
              <CheckCircle class="h-4 w-4" /> Hasil Rekomendasi Konsultan Bisnis
            </span>
            <span class="font-mono text-[10px] text-gray-500">{{
              new Date().toLocaleTimeString('id-ID')
            }}</span>
          </div>
          <div class="prose-ai text-ink flex-1 pr-1" v-html="renderMarkdown(aiInsightResult)"></div>
        </div>
      </div>

      <div class="flex h-full min-h-0 flex-col space-y-4 lg:col-span-5">
        <div
          class="border-ink bg-surface shadow-hard-md flex h-full min-h-0 flex-col space-y-3 rounded-2xl border-2 p-4"
        >
          <div class="border-ink mb-0 flex shrink-0 items-center justify-between border-b-2 pb-2.5">
            <div class="flex items-center gap-2">
              <div class="bg-brand rounded-full p-2">
                <Bot class="h-6 w-6 text-white" />
              </div>
              <div>
                <span class="text-sm font-extrabold">AI Asisten Toko</span>
                <p class="text-xs font-semibold text-gray-600">
                  Konsultasikan dan analisis toko anda disini!
                </p>
              </div>
            </div>
            <Button
              @click="resetChat"
              :disabled="!canReset"
              title="Reset Riwayat Chat"
              variant="destructive"
              size="sm"
              class="px-2 py-1 text-[10px] font-bold text-white"
            >
              <Trash2 class="h-3 w-3" />
              <span>Reset</span>
            </Button>
          </div>

          <div class="neo-scroll mb-0 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-2">
            <div
              v-if="isLoadingHistory"
              class="flex h-full flex-col items-center justify-center space-y-3 py-6 text-center"
            >
              <div
                class="border-brand mx-auto h-8 w-8 animate-spin rounded-full border-3 border-t-transparent"
              ></div>
              <p class="text-ink/60 text-xs font-bold">Memuat percakapan...</p>
            </div>

            <template v-else>
              <div v-for="(chat, i) in aiChatMessages" :key="i">
                <div
                  v-if="shouldShowDateSeparator(aiChatMessages, i)"
                  class="my-3 flex items-center justify-center"
                >
                  <div class="border-ink/20 flex w-full items-center">
                    <div class="border-ink/20 flex-1 border-t"></div>
                    <span
                      class="border-ink bg-canvas shadow-hard-xs mx-3 rounded-full border px-3 py-0.5 text-[10px] font-extrabold tracking-wider text-gray-700 uppercase"
                    >
                      {{ formatDateSeparator(chat.createdAt) }}
                    </span>
                    <div class="border-ink/20 flex-1 border-t"></div>
                  </div>
                </div>

                <!-- Chat Bubble -->
                <div :class="chat.role === 'user' ? 'text-right' : 'text-left'">
                  <div class="group relative inline-block max-w-[90%] pb-4">
                    <div
                      :class="
                        chat.role === 'user'
                          ? 'bg-brand border-ink shadow-hard-xs border-2 text-white'
                          : 'border-ink bg-canvas text-ink shadow-hard-xs border-2'
                      "
                      class="rounded-xl p-2.5 text-left text-xs leading-relaxed font-semibold wrap-break-word"
                    >
                      <div
                        v-if="chat.role === 'model'"
                        class="text-card-purple mb-1 flex items-center gap-1 text-[10px] font-extrabold"
                      >
                        <Brain class="h-3 w-3" />
                        <span>AI Asisten</span>
                      </div>
                      <div
                        v-if="chat.role === 'model'"
                        class="prose-ai"
                        v-html="renderMarkdown(chat.text)"
                      ></div>
                      <div v-else class="whitespace-pre-line">{{ chat.text }}</div>
                      <div class="w-full text-right">
                        <span class="text-ink/60 font-mono text-[9px] font-bold">{{
                          chat.createdAt
                            ? new Date(chat.createdAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : new Date().toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                        }}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      @click="copyText(chat.text)"
                      title="Salin teks pesan ini"
                      class="neo-press border-ink bg-surface shadow-hard-xs hover:text-ink absolute bottom-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border text-gray-700 opacity-80 hover:opacity-100"
                      :class="
                        chat.role === 'user' ? 'left-0 -translate-x-2' : 'right-0 translate-x-2'
                      "
                    >
                      <Copy class="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </template>

            <!-- AI Call Indicator -->
            <div v-if="isAiChatting" class="mb-2 text-left">
              <div
                class="border-ink shadow-hard-xs inline-flex items-center gap-2 rounded-xl border-2 bg-amber-50 p-2.5 text-xs font-bold text-amber-900"
              >
                <Cpu class="text-brand h-4 w-4 animate-spin" />
                <span>{{ activeToolStatus || 'AI Asisten sedang menganalisis...' }}</span>
              </div>
            </div>
          </div>

          <div class="flex shrink-0 flex-col gap-2 border-t border-gray-300 pt-2">
            <div class="border-ink">
              <p class="mb-2 text-[11px] font-extrabold tracking-wider text-gray-600">
                💡 Pertanyaan template ke AI Asisten:
              </p>
              <div class="flex flex-wrap gap-1.5">
                <Button
                  v-for="(chip, idx) in quickChips"
                  :key="idx"
                  size="sm"
                  variant="ghost"
                  @click="sendAiQuery(chip.query)"
                  :disabled="isAiChatting"
                >
                  {{ chip.label }}
                </Button>
              </div>
            </div>
            <div class="flex w-full gap-2">
              <Input
                id="ai-user-query"
                name="aiUserQuery"
                type="text"
                v-model="aiUserQuery"
                @keyup.enter="() => sendAiQuery()"
                placeholder="Tanyakan omset, stok, atau saran warung..."
                class="border-ink bg-canvas w-full rounded-xl border-2 px-3 py-2 text-xs font-bold focus:outline-none"
              />
              <Button
                @click="() => sendAiQuery()"
                size="sm"
                variant="ghost"
                :disabled="!aiUserQuery.trim() || isAiChatting"
                aria-label="Kirim pertanyaan ke AI"
                class="bg-brand hover:bg-brand/80 text-white disabled:opacity-50"
              >
                <Send class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <!-- Promo Text Generator Card -->
        <!-- <div class="border-ink bg-surface shadow-hard-md space-y-3 rounded-2xl border-2 p-4">
          <h3 class="border-ink flex items-center gap-2 border-b-2 pb-2.5 text-sm font-extrabold">
            <Flame class="text-card-coral h-5 w-5" />
            <span>AI Pembuat Pesan WhatsApp Promo</span>
          </h3>

          <div class="space-y-2 text-xs font-bold">
            <label for="ai-promo-product-select" class="block text-gray-700"
              >Pilih Produk Untuk Dipromosikan:</label
            >
            <select
              id="ai-promo-product-select"
              aria-label="Pilih Produk Yang Ingin Dipromosikan"
              v-model="selectedPromoProductId"
              class="border-ink bg-canvas w-full rounded-xl border-2 p-2 focus:outline-none"
            >
              <option v-for="p in products" :key="p.id" :value="p.id">
                {{ p.name }} (Rp {{ formatPrice(p.sellingPrice) }}/{{ p.unit }})
              </option>
            </select>

            <button
              @click="generateWaPromo"
              :disabled="isGeneratingPromo || !selectedPromoProductId"
              class="neo-press border-ink bg-card-green shadow-hard-sm flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"
            >
              <Wand2 class="h-4 w-4" />
              <span>{{
                isGeneratingPromo ? 'Membuat Pesan Menarik...' : 'Generate Teks WA Promo'
              }}</span>
            </button>
          </div>

          <div
            v-if="generatedPromoText"
            class="border-ink bg-canvas mt-3 space-y-2 rounded-xl border-2 p-3 text-xs font-bold"
          >
            <textarea
              readonly
              rows="4"
              class="border-ink w-full rounded-lg border bg-white p-2 font-mono text-[11px] focus:outline-none"
              :value="generatedPromoText"
            ></textarea>
            <button
              @click="copyPromoText"
              class="neo-press bg-ink flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-extrabold text-white"
            >
              <Copy class="h-3.5 w-3.5" /> Salin Teks Promo
            </button>
          </div>
        </div> -->
      </div>
    </div>
  </div>
</template>
