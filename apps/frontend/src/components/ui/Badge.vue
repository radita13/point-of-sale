<script setup lang="ts">
import { cn } from '@/lib/utils';

const props = defineProps<{ class?: string }>();
</script>

<template>
  <span
    :class="cn('inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-1 text-[11px] font-extrabold', props.class)"
  >
    <slot />
  </span>
</template>