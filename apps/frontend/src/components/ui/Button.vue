<script setup lang="ts">
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'neo-press inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink font-extrabold select-none disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white hover:bg-brand-hover shadow-hard-md',
        secondary: 'bg-surface text-ink hover:bg-canvas shadow-hard-sm',
        destructive: 'bg-card-coral text-white border-ink shadow-hard-sm hover:brightness-95',
        dark: 'bg-ink text-white hover:bg-brand shadow-hard-sm',
        ghost: 'bg-transparent border-ink text-ink hover:bg-canvas',
      },
      size: {
        sm: 'text-xs px-3 py-1.5',
        md: 'text-sm px-4 py-2.5',
        lg: 'text-sm px-5 py-3',
        icon: 'p-2',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

const props = defineProps<{
  variant?: VariantProps<typeof buttonVariants>['variant'];
  size?: VariantProps<typeof buttonVariants>['size'];
  class?: string;
}>();
</script>

<template>
  <button :class="cn(buttonVariants({ variant, size }), props.class)">
    <slot />
  </button>
</template>