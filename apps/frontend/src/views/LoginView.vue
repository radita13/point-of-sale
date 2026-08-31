<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Store } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleLogin() {
  if (!supabase) {
    auth.loginDemo();
    router.push({ name: 'kasir' });
    return;
  }
  error.value = '';
  loading.value = true;
  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    });
    if (signInError) throw signInError;
    toast.success('Selamat datang!');
    router.push({ name: 'kasir' });
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Gagal masuk. Cek email/password.';
  } finally {
    loading.value = false;
  }
}
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
          <label class="mb-1 block text-xs font-extrabold tracking-wider uppercase">Email</label>
          <Input v-model="email" type="email" placeholder="kasir@pointofsale.id" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-extrabold tracking-wider uppercase">Password</label>
          <Input v-model="password" type="password" placeholder="••••••••" />
        </div>

        <p v-if="error" class="text-card-coral text-center text-xs font-bold">{{ error }}</p>

        <Button type="submit" class="w-full" :disabled="loading">
          {{ loading ? 'Memproses...' : 'Masuk' }}
        </Button>
      </form>
    </div>
  </div>
</template>
