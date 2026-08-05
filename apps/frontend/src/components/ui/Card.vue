<script setup lang="ts">
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: string;
  shadow?: 'sm' | 'md' | 'lg' | 'xl';
}>();
</script>

<template>
  <div
    :class="cn(
      'rounded-2xl border-2 border-ink bg-surface',
      (shadow ?? 'md') === 'sm' && 'shadow-hard-sm',
      (shadow ?? 'md') === 'md' && 'shadow-hard-md',
      (shadow ?? 'md') === 'lg' && 'shadow-hard-lg',
      (shadow ?? 'md') === 'xl' && 'shadow-hard-xl',
      props.class,
    )"
  >
    <slot />
  </div>
</template>