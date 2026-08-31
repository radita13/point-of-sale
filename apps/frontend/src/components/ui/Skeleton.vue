<script setup lang="ts">
withDefaults(
  defineProps<{
    count?: number;
    type?: 'card' | 'line' | 'table' | 'table-rows';
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
  <div v-if="type === 'card'" class="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
    <div
      v-for="i in count"
      :key="i"
      class="border-ink bg-surface shadow-hard-md relative flex flex-col justify-between rounded-2xl border-2 p-3 animate-pulse"
    >
      <div>
        <div class="mb-2 h-24 sm:h-28 w-full rounded-xl bg-ink/10 border-2 border-ink/20"></div>
        <div class="h-3 w-16 bg-ink/10 rounded mb-1"></div>
        <div class="h-4 w-3/4 bg-ink/15 rounded"></div>
        <div class="h-3 w-1/2 bg-ink/10 rounded mt-1.5"></div>
      </div>
      <div class="mt-3 border-t border-ink/10 pt-2 flex flex-col gap-1.5">
        <div class="h-3 w-12 bg-ink/10 rounded"></div>
        <div class="h-8 w-full bg-ink/15 rounded-xl border border-ink/20"></div>
      </div>
    </div>
  </div>

  <!-- Line List Skeleton -->
  <div v-else-if="type === 'line'" class="space-y-2">
    <div
      v-for="i in count"
      :key="i"
      class="h-10 w-full rounded-xl border-2 border-ink/20 bg-surface animate-pulse"
    ></div>
  </div>

  <!-- Table Row Skeleton (Inside <tbody> or standalone) -->
  <tbody v-if="type === 'table-rows'" class="divide-ink divide-y-2">
    <tr v-for="i in count" :key="i" class="animate-pulse">
      <td v-for="col in (columns || 8)" :key="col" class="p-3">
        <div class="h-4 bg-ink/15 rounded w-full"></div>
      </td>
    </tr>
  </tbody>

  <!-- Table Card / Standalone Skeleton -->
  <div v-else-if="type === 'table'" class="space-y-3">
    <div
      v-for="i in count"
      :key="i"
      class="h-14 w-full rounded-xl border-2 border-ink bg-surface p-3 animate-pulse flex items-center justify-between"
    >
      <div class="h-4 w-1/3 bg-ink/15 rounded"></div>
      <div class="h-4 w-1/4 bg-ink/10 rounded"></div>
      <div class="h-4 w-16 bg-ink/15 rounded"></div>
    </div>
  </div>
</template>
