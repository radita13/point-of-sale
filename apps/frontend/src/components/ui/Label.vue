<script setup lang="ts">
import { cn } from '@/lib/utils';

const props = defineProps<{
  required?: boolean;
  class?: string;
  for?: string;
}>();
</script>

<template>
  <label :for="props.for" :class="cn('mb-1 block text-xs font-bold text-ink', props.class)">
    <slot />
    <span v-if="required" class="text-card-coral ml-0.5">*</span>
  </label>
</template>
