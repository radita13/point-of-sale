<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Search } from 'lucide-vue-next';
import { CATEGORIES } from '@/constants/product';
import Card from '@/components/ui/Card.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';

withDefaults(
  defineProps<{
    search?: string;
    category?: string;
    placeholder?: string;
    inputId?: string;
    inputName?: string;
  }>(),
  {
    search: '',
    category: 'Semua',
    placeholder: 'Cari nama barang atau SKU...',
    inputId: 'catalog-search-input',
    inputName: 'searchQuery',
  }
);

const emit = defineEmits<{
  (e: 'update:search', value: string): void;
  (e: 'update:category', value: string): void;
}>();

const scrollEl = ref<HTMLDivElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
let isDragging = false;
let startX = 0;
let startScrollLeft = 0;

function updateScrollState() {
  const el = scrollEl.value;
  if (!el) return;
  const { scrollLeft, scrollWidth, clientWidth } = el;
  canScrollLeft.value = scrollLeft > 1;
  canScrollRight.value = scrollLeft + clientWidth < scrollWidth - 1;
}

function handleWheelScroll(e: WheelEvent) {
  const el = scrollEl.value;
  if (!el) return;
  if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
    el.scrollLeft += e.deltaY;
  }
}

function onMouseDown(e: MouseEvent) {
  const el = scrollEl.value;
  if (!el) return;
  isDragging = true;
  startX = e.pageX - el.offsetLeft;
  startScrollLeft = el.scrollLeft;
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging) return;
  const el = scrollEl.value;
  if (!el) return;
  e.preventDefault();
  const x = e.pageX - el.offsetLeft;
  const walk = (x - startX) * 1.5;
  el.scrollLeft = startScrollLeft - walk;
}

function onMouseUpOrLeave() {
  isDragging = false;
}

onMounted(() => {
  updateScrollState();
  window.addEventListener('resize', updateScrollState);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateScrollState);
});
</script>

<template>
  <Card>
    <div class="flex flex-col gap-3 p-3.5 sm:p-4">
      <!-- Search Input Container -->
      <div class="relative flex items-center gap-2">
        <Label :for="inputId" class="sr-only">{{ placeholder }}</Label>
        <Search
          class="text-ink/40 pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2"
        />
        <Input
          :id="inputId"
          :name="inputName"
          :model-value="search"
          @update:model-value="emit('update:search', $event)"
          type="text"
          :placeholder="placeholder"
          class="h-11 w-full pr-12 pl-10 text-sm font-bold"
        />
        <slot name="action" />
      </div>

      <!-- Category Filter Slider -->
      <div class="relative overflow-hidden rounded-xl">
        <div
          v-if="canScrollLeft"
          class="from-surface pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-linear-to-r to-transparent"
        />

        <div
          ref="scrollEl"
          @scroll="updateScrollState"
          @wheel.passive="handleWheelScroll"
          @mousedown="onMouseDown"
          @mousemove="onMouseMove"
          @mouseup="onMouseUpOrLeave"
          @mouseleave="onMouseUpOrLeave"
          class="flex cursor-grab scrollbar-none items-center gap-1.5 overflow-x-auto py-1 select-none active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
        >
          <button
            v-for="cat in CATEGORIES"
            :key="cat"
            type="button"
            @click="emit('update:category', cat)"
            :class="category === cat ? 'bg-ink text-white' : 'bg-canvas text-ink hover:bg-gray-200'"
            class="neo-press border-ink cursor-pointer rounded-xl border px-3 py-1.5 text-[11px] font-extrabold whitespace-nowrap"
          >
            {{ cat }}
          </button>
        </div>

        <div
          v-if="canScrollRight"
          class="from-surface pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-linear-to-l to-transparent"
        />
      </div>
    </div>
  </Card>
</template>
