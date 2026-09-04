<script setup lang="ts">
import { cn } from '@/lib/utils';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    id?: string;
    name?: string;
    modelValue?: string | number;
    options?: SelectOption[];
    class?: string;
    disabled?: boolean;
    placeholder?: string;
    variant?: 'flat' | 'neo';
    autocomplete?: string;
  }>(),
  {
    variant: 'flat',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: Event): void;
}>();

function onChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  emit('update:modelValue', target.value);
  emit('change', e);
}
</script>

<template>
  <div class="relative inline-block w-full">
    <select
      :id="id"
      :name="name || id"
      :value="modelValue"
      :disabled="disabled"
      :autocomplete="autocomplete"
      @change="onChange"
      :class="
        cn(
          'h-10 w-full appearance-none rounded-xl border-2 border-ink bg-canvas pl-3.5 pr-8 text-xs font-bold text-ink transition-all hover:bg-surface focus:outline-none focus:ring-2 focus:ring-brand disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
          variant === 'neo' && 'shadow-hard-sm font-extrabold',
          props.class,
        )
      "
    >
      <option v-if="placeholder" value="" disabled selected hidden>
        {{ placeholder }}
      </option>
      <slot>
        <option
          v-for="opt in options"
          :key="opt.value"
          :value="opt.value"
          :disabled="opt.disabled"
        >
          {{ opt.label }}
        </option>
      </slot>
    </select>
    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-ink">
      <svg class="h-4 w-4 fill-current" viewBox="0 0 20 20">
        <path
          fill-rule="evenodd"
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          clip-rule="evenodd"
        />
      </svg>
    </div>
  </div>
</template>
