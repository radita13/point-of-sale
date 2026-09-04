<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import Button from '@/components/ui/Button.vue';
import Label from '@/components/ui/Label.vue';

withDefaults(
  defineProps<{
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize?: number;
    pageSizeOptions?: number[];
    itemName?: string;
    idPrefix?: string;
  }>(),
  {
    pageSize: 10,
    pageSizeOptions: () => [],
    itemName: 'item',
    idPrefix: 'pagination',
  }
);

const emit = defineEmits<{
  (e: 'update:page', val: number): void;
  (e: 'update:pageSize', val: number): void;
}>();
</script>

<template>
  <div
    class="border-ink bg-surface flex flex-wrap items-center justify-between gap-2 border-t-2 pt-3 text-xs font-extrabold"
  >
    <div class="whitespace-nowrap text-gray-600">
      <span class="hidden sm:inline">Menampilkan </span>
      <span>{{ (page - 1) * pageSize + 1 }}-{{ Math.min(page * pageSize, totalItems) }}</span>
      <span class="font-normal text-gray-400"> / </span>
      <span>{{ totalItems }}</span>
      <span class="hidden sm:inline"> {{ itemName }}</span>
    </div>

    <div class="flex items-center gap-2">
      <div v-if="pageSizeOptions.length > 0" class="flex items-center gap-1">
        <Label :for="`${idPrefix}-page-size`" class="sr-only">Baris per halaman</Label>
        <select
          :id="`${idPrefix}-page-size`"
          :name="`${idPrefix}PageSize`"
          :value="pageSize"
          @change="
            (e: Event) => emit('update:pageSize', Number((e.target as HTMLSelectElement).value))
          "
          class="border-ink cursor-pointer rounded-lg border-2 bg-white px-1.5 py-1 text-xs font-extrabold focus:outline-none"
          title="Baris per halaman"
        >
          <option v-for="size in pageSizeOptions" :key="size" :value="size">
            {{ size }}
          </option>
        </select>
      </div>

      <div class="flex items-center gap-1">
        <Button
          variant="secondary"
          size="icon"
          :disabled="page <= 1"
          @click="emit('update:page', page - 1)"
          class="h-8 w-8 cursor-pointer disabled:opacity-40"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <span class="px-1 text-[11px] whitespace-nowrap"> {{ page }} / {{ totalPages }} </span>
        <Button
          variant="secondary"
          size="icon"
          :disabled="page >= totalPages"
          @click="emit('update:page', page + 1)"
          class="h-8 w-8 cursor-pointer disabled:opacity-40"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
