import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase } from '@/services/supabase';
import { db } from '@/db/database';
import { api, setStoreId } from '@/services/api';

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false);
  const userEmail = ref<string | null>(null);
  const userMetadata = ref<{ fullName?: string; phone?: string } | null>(null);
  const ready = ref(false);
  const currentStoreId = ref<string | null>(null);

  async function checkUserChangeAndFetchStore(userId: string | null) {
    const lastUser = localStorage.getItem('pos_last_user_id');
    if (userId && lastUser && lastUser !== userId) {
      console.log('[Auth] User berubah dari', lastUser, 'ke', userId, '- Menghapus data offline lama');
      await db.delete();
      await db.open();
    }
    if (userId) {
      localStorage.setItem('pos_last_user_id', userId);
      try {
        const res = await api.getMyStore();
        if (res?.store?.id) {
          currentStoreId.value = res.store.id;
          setStoreId(res.store.id);
        }
      } catch (err) {
        console.warn('[Auth] Gagal mengambil data store user:', err);
      }
    }
  }

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
        if (meta.owner_pin_hash) {
          localStorage.setItem('pos_owner_pin_hash', meta.owner_pin_hash);
        }
        await checkUserChangeAndFetchStore(session.user.id);
      } else {
        userMetadata.value = null;
      }

      supabase.auth.onAuthStateChange(async (_e, session) => {
        isAuthenticated.value = Boolean(session);
        userEmail.value = session?.user?.email ?? null;
        if (session?.user) {
          const meta = session.user.user_metadata ?? {};
          userMetadata.value = {
            fullName: meta.full_name || meta.name || undefined,
            phone: meta.phone || session.user.phone || undefined,
          };
          await checkUserChangeAndFetchStore(session.user.id);
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
    currentStoreId.value = null;
    localStorage.removeItem('pos_last_user_id');
    try {
      await db.delete();
    } catch (e) {
      console.warn('[Auth] Gagal menghapus database lokal saat logout:', e);
    }
    window.location.reload();
  }

  function loginDemo() {
    isAuthenticated.value = true;
    userEmail.value = null;
    userMetadata.value = null;
  }

  async function updateProfile(data: { fullName?: string; phone?: string; ownerPinHash?: string }) {
    if (!supabase) return;
    const { data: updated, error } = await supabase.auth.updateUser({
      data: {
        full_name: data.fullName,
        phone: data.phone,
        ...(data.ownerPinHash ? { owner_pin_hash: data.ownerPinHash } : {}),
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

  return { isAuthenticated, userEmail, userMetadata, currentStoreId, ready, init, logout, loginDemo, updateProfile };
});
