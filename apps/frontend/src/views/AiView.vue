<script setup lang="ts">
import { Sparkles, RefreshCw, CheckCircle, MessageSquareText, Wand2, Send, Copy, Brain } from 'lucide-vue-next';
import Select from '@/components/ui/Select.vue';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';
import { useAiAssistant } from '@/composables/useAiAssistant';

const {
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
} = useAiAssistant();
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-surface p-4 shadow-hard-md">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-card-purple text-xl font-black text-white shadow-hard-sm">
          <Sparkles class="h-5 w-5 text-amber-300" />
        </div>
        <div>
          <h2 class="text-lg font-extrabold">Asisten AI Toko Sembako (Powered by Gemini)</h2>
          <p class="text-xs font-semibold text-gray-600">Analisis stok, saran restock, pembuat promosi WhatsApp, &amp; konsul bisnis warung</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <!-- AI Executive Summary & Restock Advisor (Cols 7) -->
      <div class="space-y-4 rounded-2xl border-2 border-ink bg-surface p-4 shadow-hard-md lg:col-span-7">
        <div class="flex items-center justify-between border-b-2 border-ink pb-3">
          <h3 class="flex items-center gap-2 text-sm font-extrabold">
            <Brain class="h-5 w-5 text-card-purple" />
            Analisis Stok &amp; Rekomendasi Restock AI
          </h3>
          <Button variant="secondary" class="text-xs font-bold" :disabled="isAiGenerating" @click="generateAiInsight">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isAiGenerating }" />
            {{ isAiGenerating ? 'Menganalisis...' : 'Analisis Ulang' }}
          </Button>
        </div>

        <div v-if="!aiInsightResult && !isAiGenerating" class="py-12 text-center text-xs font-bold text-gray-500">
          Klik tombol "Analisis Ulang" di atas untuk mendapatkan rekomendasi kecerdasan buatan untuk warung Anda.
        </div>

        <div v-if="isAiGenerating" class="py-12 text-center text-xs font-bold text-gray-500">
          <div class="mx-auto mb-2 h-7 w-7 animate-spin rounded-full border-4 border-card-purple border-t-transparent" />
          Sedang menganalisis katalog produk dan pola penjualan...
        </div>

        <div v-if="aiInsightResult && !isAiGenerating" class="space-y-3">
          <div class="rounded-xl border-2 border-ink bg-canvas p-4 text-xs font-extrabold whitespace-pre-line text-ink leading-relaxed">
            {{ aiInsightResult }}
          </div>
          <div class="flex items-center gap-1.5 text-[11px] font-bold text-card-green">
            <CheckCircle class="h-4 w-4" /> Analisis berbasis data katalog IndexedDB lokal Anda.
          </div>
        </div>

        <!-- Pembuat Pesan Promo WA -->
        <div class="border-t-2 border-ink pt-4">
          <h3 class="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-700">
            <Wand2 class="h-4 w-4 text-brand" /> Generator Teks Promosi WhatsApp
          </h3>
          <div class="space-y-3 rounded-xl border-2 border-ink bg-canvas p-3">
            <div>
              <label class="mb-1 block text-[11px] font-bold text-gray-600">Pilih Produk Yang Ingin Dipromosikan:</label>
              <Select v-model="selectedPromoProductId" class="w-full text-xs font-bold">
                <option v-for="p in products" :key="p.id" :value="p.id">
                  {{ p.name }} (Rp {{ p.sellingPrice }})
                </option>
              </Select>
            </div>

            <Button variant="primary" class="w-full text-xs font-extrabold" :disabled="isGeneratingPromo || products.length === 0" @click="generateWaPromo">
              <Sparkles class="h-3.5 w-3.5 text-amber-300" />
              {{ isGeneratingPromo ? 'Membuat Teks...' : 'Buat Teks Promo WA' }}
            </Button>

            <div v-if="generatedPromoText" class="mt-3 space-y-2">
              <div class="relative rounded-xl border border-ink bg-white p-3 font-mono text-xs font-semibold whitespace-pre-line text-ink">
                {{ generatedPromoText }}
              </div>
              <Button variant="secondary" class="w-full text-xs font-bold" @click="copyPromoText">
                <Copy class="h-3.5 w-3.5" /> Salin Teks ke Clipboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- AI Chat Assistant (Cols 5) -->
      <div class="flex flex-col rounded-2xl border-2 border-ink bg-surface p-4 shadow-hard-md lg:col-span-5">
        <div class="mb-3 flex items-center gap-2 border-b-2 border-ink pb-3">
          <MessageSquareText class="h-5 w-5 text-brand" />
          <div>
            <h3 class="text-sm font-extrabold">Konsultasi Bisnis Warung</h3>
            <p class="text-[10px] font-bold text-gray-500">Tanyakan apa saja seputar operasional toko</p>
          </div>
        </div>

        <!-- Chat messages viewport -->
        <div class="neo-scroll flex-1 space-y-3 overflow-y-auto pr-1 min-h-[300px] max-h-[450px]">
          <div
            v-for="(msg, idx) in aiChatMessages"
            :key="idx"
            :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
            class="flex gap-2"
          >
            <div
              :class="msg.role === 'user' ? 'bg-brand text-white border-ink' : 'bg-canvas text-ink border-ink'"
              class="max-w-[85%] rounded-2xl border-2 p-3 text-xs font-bold leading-relaxed shadow-hard-xs"
            >
              {{ msg.text }}
            </div>
          </div>

          <div v-if="isAiChatting" class="flex items-center gap-2 text-xs font-bold text-gray-500">
            <div class="h-2 w-2 animate-ping rounded-full bg-brand" />
            Asisten AI sedang mengetik...
          </div>
        </div>

        <!-- Chat Input -->
        <form @submit.prevent="sendAiQuery" class="mt-4 flex gap-2 border-t-2 border-ink pt-3">
          <Input
            v-model="aiUserQuery"
            placeholder="Tanyakan sesuatu..."
            class="text-xs font-bold"
            :disabled="isAiChatting"
          />
          <Button type="submit" variant="primary" class="shrink-0" :disabled="!aiUserQuery.trim() || isAiChatting">
            <Send class="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  </div>
</template>
