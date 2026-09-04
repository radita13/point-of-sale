<script setup lang="ts">
import { cn } from '@/lib/utils';

const props = withDefaults(
  defineProps<{
    count?: number;
    class?: string;
    type?: 'card' | 'line' | 'table' | 'table-rows' | 'top-sales' | 'transactions';
    columns?: number;
  }>(),
  {
    count: 6,
    type: 'card',
    columns: 8,
  }
);
</script>

<template>
  <!-- Card Grid Skeleton -->
  <div v-if="type === 'card'" :class="cn('grid grid-cols-2 gap-3.5 sm:grid-cols-3', props.class)">
    <div
      v-for="i in count"
      :key="i"
      class="border-ink bg-surface shadow-hard-md relative flex animate-pulse flex-col justify-between rounded-2xl border-2 p-3"
    >
      <div>
        <div class="bg-ink/10 border-ink/20 mb-2 h-24 w-full rounded-xl border-2 sm:h-28"></div>
        <div class="bg-ink/10 mb-1 h-3 w-16 rounded"></div>
        <div class="bg-ink/15 h-4 w-3/4 rounded"></div>
        <div class="bg-ink/10 mt-1.5 h-3 w-1/2 rounded"></div>
      </div>
      <div class="border-ink/10 mt-3 flex flex-col gap-1.5 border-t pt-2">
        <div class="bg-ink/10 h-3 w-12 rounded"></div>
        <div class="bg-ink/15 border-ink/20 h-8 w-full rounded-xl border"></div>
      </div>
    </div>
  </div>

  <!-- Top Sales Skeleton -->
  <div v-else-if="type === 'top-sales'" :class="cn('mt-3 space-y-2', props.class)">
    <div
      v-for="i in count"
      :key="i"
      class="border-ink bg-canvas shadow-hard-sm flex animate-pulse items-center justify-between rounded-xl border-2 p-2"
    >
      <div class="flex items-center gap-2.5">
        <div class="bg-ink/20 h-6 w-6 shrink-0 rounded-lg"></div>
        <div>
          <div class="bg-ink/20 h-3.5 w-28 rounded sm:w-36"></div>
          <div class="bg-ink/10 mt-1.5 h-2.5 w-16 rounded sm:w-24"></div>
        </div>
      </div>
      <div class="flex flex-col items-end gap-1 text-right">
        <div class="bg-ink/20 h-3.5 w-20 rounded"></div>
        <div class="bg-ink/10 h-2.5 w-14 rounded"></div>
      </div>
    </div>
  </div>

  <!-- Transactions Skeleton -->
  <div v-else-if="type === 'transactions'" :class="cn('mt-3 space-y-2.5', props.class)">
    <div
      v-for="i in count"
      :key="i"
      class="border-ink bg-canvas shadow-hard-sm flex animate-pulse flex-col gap-2 rounded-xl border-2 p-3"
    >
      <div class="flex items-center justify-between gap-2 border-b border-gray-300 pb-2">
        <div class="flex items-center gap-2">
          <div class="bg-ink/20 border-ink/20 h-5 w-28 rounded border"></div>
          <div class="bg-ink/10 h-3.5 w-28 rounded"></div>
        </div>
        <div class="bg-ink/15 h-5 w-16 rounded-full"></div>
      </div>

      <div class="flex items-center justify-between gap-4">
        <div class="bg-ink/15 h-3.5 w-48 rounded sm:w-64"></div>
        <div class="bg-ink/20 h-4 w-20 shrink-0 rounded"></div>
      </div>

      <div class="flex items-center justify-between gap-2 pt-0.5">
        <div class="bg-ink/10 h-3 w-40 rounded"></div>
        <div class="bg-ink/15 border-ink/20 h-7 w-24 shrink-0 rounded-xl border"></div>
      </div>
    </div>
  </div>

  <!-- Line List Skeleton -->
  <div v-else-if="type === 'line'" :class="cn('space-y-2', props.class)">
    <div
      v-for="i in count"
      :key="i"
      class="border-ink/20 bg-surface h-10 w-full animate-pulse rounded-xl border-2"
    ></div>
  </div>

  <!-- Table Row Skeleton -->
  <tbody v-if="type === 'table-rows'" class="divide-ink divide-y-2">
    <tr v-for="i in count" :key="i" class="animate-pulse">
      <td v-for="col in columns || 8" :key="col" class="p-3">
        <div class="bg-ink/15 h-4 w-full rounded"></div>
      </td>
    </tr>
  </tbody>

  <!-- Table Card -->
  <div v-else-if="type === 'table'" :class="cn('space-y-3', props.class)">
    <div
      v-for="i in count"
      :key="i"
      class="border-ink bg-surface flex h-14 w-full animate-pulse items-center justify-between rounded-xl border-2 p-3"
    >
      <div class="bg-ink/15 h-4 w-1/3 rounded"></div>
      <div class="bg-ink/10 h-4 w-1/4 rounded"></div>
      <div class="bg-ink/15 h-4 w-16 rounded"></div>
    </div>
  </div>
</template>
