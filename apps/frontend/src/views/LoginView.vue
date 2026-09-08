<script setup lang="ts">
import { Store } from 'lucide-vue-next';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';
import { useLogin } from '@/composables/auth/useLogin';

const { handleLogin, email, password, error, isLoading } = useLogin();
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center p-4">
    <div
      class="border-ink bg-surface shadow-hard-xl w-full max-w-md rounded-2xl border-2 p-6 sm:p-8"
    >
      <div class="mb-6 text-center">
        <div
          class="border-ink bg-brand shadow-hard-md mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-white"
        >
          <Store class="h-8 w-8" />
        </div>
        <h1 class="text-2xl font-extrabold tracking-tight">Point of Sale</h1>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label
            for="login-email"
            class="mb-1 block text-xs font-extrabold tracking-wider uppercase"
            >Email</label
          >
          <Input
            id="login-email"
            name="email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="kasir@pointofsale.id"
          />
        </div>
        <div>
          <label
            for="login-password"
            class="mb-1 block text-xs font-extrabold tracking-wider uppercase"
            >Password</label
          >
          <Input
            id="login-password"
            name="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
          />
        </div>

        <p v-if="error" class="text-card-coral text-center text-xs font-bold">{{ error }}</p>

        <Button type="submit" class="w-full" :disabled="isLoading">
          {{ isLoading ? 'Memproses...' : 'Masuk' }}
        </Button>
      </form>
    </div>
  </div>
</template>
