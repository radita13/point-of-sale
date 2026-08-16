import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase } from '@/services/supabase';

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false);
  const userEmail = ref<string | null>(null);
  const userMetadata = ref<{ fullName?: string; phone?: string } | null>(null);
  const ready = ref(false);

  async function init() {
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      isAuthenticated.value = Boolean(session);
      userEmail.value = session?.user?.email ?? null;
      if (session?.user) {
        const meta = session.user.user_metadata ?? {};
        userMetadata.value = {
          fullName: meta.full_name || meta.name || undefined,
          phone: meta.phone || session.user.phone || undefined,
        };
      } else {
        userMetadata.value = null;
      }

      supabase.auth.onAuthStateChange((_e, session) => {
        isAuthenticated.value = Boolean(session);
        userEmail.value = session?.user?.email ?? null;
        if (session?.user) {
          const meta = session.user.user_metadata ?? {};
          userMetadata.value = {
            fullName: meta.full_name || meta.name || undefined,
            phone: meta.phone || session.user.phone || undefined,
          };
        } else {
          userMetadata.value = null;
        }
      });
    } else {
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
    userMetadata.value = null;
  }

  function loginDemo() {
    isAuthenticated.value = true;
    userEmail.value = null;
    userMetadata.value = null;
  }

  async function updateProfile(data: { fullName?: string; phone?: string }) {
    if (!supabase) return;
    const { data: updated, error } = await supabase.auth.updateUser({
      data: {
        full_name: data.fullName,
        phone: data.phone,
      },
    });

    if (error) throw error;

    if (updated.user) {
      const meta = updated.user.user_metadata ?? {};
      userMetadata.value = {
        fullName: meta.full_name || meta.name || undefined,
        phone: meta.phone || updated.user.phone || undefined,
      };
    }
  }

  return { isAuthenticated, userEmail, userMetadata, ready, init, logout, loginDemo, updateProfile };
});
