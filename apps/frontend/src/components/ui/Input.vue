<script setup lang="ts">
import { cn } from '@/lib/utils';

const props = defineProps<{
  id?: string;
  name?: string;
  modelValue?: string | number;
  class?: string;
  type?: 'text' | 'number' | 'password' | 'email' | 'search' | 'tel' | 'url';
  placeholder?: string;
  step?: string;
  min?: string | number;
  max?: string | number;
  maxlength?: string | number;
  autocomplete?: string;
  disabled?: boolean;
}>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value);
}
</script>

<template>
  <input
    :id="id"
    :name="name || id"
    :type="type ?? 'text'"
    :value="modelValue"
    :placeholder="placeholder"
    :step="step"
    :min="min ?? (type === 'number' ? 0 : undefined)"
    :max="max"
    :maxlength="maxlength"
    :autocomplete="autocomplete"
    :disabled="disabled"
    @input="onInput"
    :class="cn(
      'w-full h-11 rounded-xl border-2 border-ink bg-canvas px-3 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-ink/40',
      type === 'number' && 'no-spin',
      props.class,
    )"
  />
</template>