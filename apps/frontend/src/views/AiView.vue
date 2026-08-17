<script setup lang="ts">
import { Sparkles, RefreshCw, CheckCircle, MessageSquareText, Wand2, Send, Copy, Brain } from 'lucide-vue-next';
import { formatPrice } from '@/lib/utils';
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
          <p class="text-xs font-semibold text-gray-600">Analisis stok, saran restock, pembuat promosi WhatsApp, & konsul bisnis warung</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <!-- AI Executive Summary & Restock Advisor (Cols 7) -->
      <div class="space-y-4 rounded-2xl border-2 border-ink bg-surface p-4 shadow-hard-md lg:col-span-7">
        <div class="flex items-center justify-between border-b-2 border-ink pb-3">
          <h3 class="flex items-center gap-2 text-sm font-extrabold">
            <Brain class="h-5 w-5 text-card-purple" />
            <span>Analisis Otomatis Stok & Laba Warung</span>
          </h3>
          <button
            @click="generateAiInsight"
            :disabled="isAiGenerating"
            class="neo-press flex items-center gap-1.5 rounded-xl border-2 border-ink bg-card-purple px-3.5 py-1.5 text-xs font-extrabold text-white shadow-hard-sm disabled:opacity-50"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isAiGenerating }" />
            <span>{{ isAiGenerating ? 'Menganalisis Data...' : 'Mulai Analisis AI' }}</span>
          </button>
        </div>

        <!-- Empty State -->
        <div v-if="!aiInsightResult && !isAiGenerating" class="space-y-2 rounded-xl border-2 border-ink bg-canvas p-6 text-center">
          <Sparkles class="mx-auto h-10 w-10 text-card-purple" />
          <h4 class="text-sm font-extrabold">Belum Ada Analisis AI Hari Ini</h4>
          <p class="mx-auto max-w-md text-xs font-semibold text-gray-600">
            Klik tombol "Mulai Analisis AI" di atas untuk menganalisis data stok menipis, omset penjualan, dan strategi restock warung Anda.
          </p>
        </div>

        <!-- Loading State -->
        <div v-if="isAiGenerating" class="space-y-3 rounded-xl border-2 border-ink bg-canvas py-12 text-center">
          <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-card-purple border-t-transparent"></div>
          <p class="text-xs font-extrabold text-ink">Gemini AI sedang membaca katalog & riwayat penjualan warung Anda...</p>
        </div>

        <!-- AI Insight Display -->
        <div v-if="aiInsightResult && !isAiGenerating" class="space-y-3 rounded-xl border-2 border-ink bg-canvas p-4 text-xs font-bold leading-relaxed">
          <div class="flex items-center justify-between border-b border-gray-300 pb-2 text-card-purple">
            <span class="flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider">
              <CheckCircle class="h-4 w-4" /> Hasil Rekomendasi Kecerdasan Buatan
            </span>
            <span class="font-mono text-[10px] text-gray-500">{{ new Date().toLocaleTimeString('id-ID') }}</span>
          </div>
          <div class="whitespace-pre-line text-ink">
            {{ aiInsightResult }}
          </div>
        </div>
      </div>

      <!-- Quick Chat & WA Promo Generator (Cols 5) -->
      <div class="space-y-4 lg:col-span-5">
        <!-- Promo Text Generator Card -->
        <div class="space-y-3 rounded-2xl border-2 border-ink bg-surface p-4 shadow-hard-md">
          <h3 class="flex items-center gap-2 border-b-2 border-ink pb-2.5 text-sm font-extrabold">
            <MessageSquareText class="h-5 w-5 text-card-green" />
            <span>Pembuat Pesan Promosi WhatsApp</span>
          </h3>

          <div class="space-y-2 text-xs font-bold">
            <label class="block text-gray-700">Pilih Produk Yang Ingin Dipromosikan:</label>
            <select v-model="selectedPromoProductId" class="w-full rounded-xl border-2 border-ink bg-canvas p-2 focus:outline-none">
              <option v-for="p in products" :key="p.id" :value="p.id">
                {{ p.name }} (Rp {{ formatPrice(p.sellingPrice) }}/{{ p.unit }})
              </option>
            </select>

            <button
              @click="generateWaPromo"
              :disabled="isGeneratingPromo || !selectedPromoProductId"
              class="neo-press flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-card-green py-2.5 text-xs font-extrabold text-white shadow-hard-sm disabled:opacity-50"
            >
              <Wand2 class="h-4 w-4" />
              <span>{{ isGeneratingPromo ? 'Membuat Teks Promo...' : 'Buat Teks Promo WA' }}</span>
            </button>
          </div>

          <!-- Generated Copy Box -->
          <div v-if="generatedPromoText" class="mt-3 space-y-2 rounded-xl border-2 border-ink bg-canvas p-3 text-xs font-bold">
            <textarea readonly rows="5" class="w-full rounded-lg border border-ink bg-white p-2 font-mono text-[11px] focus:outline-none" :value="generatedPromoText"></textarea>
            <button
              @click="copyPromoText"
              class="neo-press flex w-full items-center justify-center gap-1 rounded-lg bg-ink py-1.5 text-[11px] font-extrabold text-white"
            >
              <Copy class="h-3.5 w-3.5" /> Salin Teks Promo
            </button>
          </div>
        </div>

        <!-- AI Q&A Chat Box -->
        <div class="space-y-3 rounded-2xl border-2 border-ink bg-surface p-4 shadow-hard-md">
          <h3 class="flex items-center gap-2 border-b-2 border-ink pb-2.5 text-sm font-extrabold">
            <MessageSquareText class="h-5 w-5 text-brand" />
            <span>Tanya Jawab AI Warung</span>
          </h3>

          <div class="max-h-55 space-y-2 overflow-y-auto pr-1">
            <div v-for="(chat, i) in aiChatMessages" :key="i" :class="chat.role === 'user' ? 'text-right' : 'text-left'">
              <div
                :class="chat.role === 'user' ? 'ml-8 bg-brand text-white' : 'mr-8 border-2 border-ink bg-canvas text-ink'"
                class="inline-block rounded-xl p-2.5 text-left text-xs font-bold shadow-hard-sm"
              >
                {{ chat.text }}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 border-t border-gray-300 pt-2">
            <input
              type="text"
              v-model="aiUserQuery"
              @keyup.enter="sendAiQuery"
              placeholder="Tanyakan sesuatu ke AI warung..."
              class="w-full rounded-xl border-2 border-ink bg-canvas px-3 py-2 text-xs font-bold focus:outline-none"
            />
            <button
              @click="sendAiQuery"
              :disabled="!aiUserQuery || isAiChatting"
              class="neo-press rounded-xl border-2 border-ink bg-brand p-2.5 text-white shadow-hard-sm disabled:opacity-50"
            >
              <Send class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>