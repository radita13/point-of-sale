import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from '@/services/supabase';

export const useNetworkStore = defineStore('network', () => {
  const isOnline = ref(navigator.onLine);

  function setOnline(online: boolean) {
    isOnline.value = online;
  }

  const networkBadgeStyle = computed(() =>
    isOnline.value ? 'bg-brand text-white' : 'bg-offline text-ink',
  );

  return { isOnline, setOnline, networkBadgeStyle };
});

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false);
  const userEmail = ref<string | null>(null);
  const ready = ref(false);

  async function init() {
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      isAuthenticated.value = Boolean(data.session);
      userEmail.value = data.session?.user?.email ?? null;
      supabase.auth.onAuthStateChange((_e, session) => {
        isAuthenticated.value = Boolean(session);
        userEmail.value = session?.user?.email ?? null;
      });
    } else {
      // dev fallback tanpa Supabase: anggap sudah login (FE bisa jalan sendiri)
      isAuthenticated.value = true;
    }
    ready.value = true;
  }

  async function logout() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    isAuthenticated.value = false;
    userEmail.value = null;
  }

  function loginDemo() {
    isAuthenticated.value = true;
    userEmail.value = null;
  }

  return { isAuthenticated, userEmail, ready, init, logout, loginDemo };
});