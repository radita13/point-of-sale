import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase } from '@/services/supabase';
import { db } from '@/db/database';
import { api, setStoreId } from '@/services/api';
import { useStoreSettingsStore } from './storeSettings';
import { useRoleStore } from './role';

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false);
  const userEmail = ref<string | null>(null);
  const userMetadata = ref<{ fullName?: string; phone?: string } | null>(null);
  const ready = ref(false);
  const currentStoreId = ref<string | null>(null);

  async function checkUserChangeAndFetchStore(
    userId: string | null,
    meta?: { fullName?: string; phone?: string; ownerPinHash?: string }
  ) {
    const lastUser = localStorage.getItem('pos_last_user_id');
    const storeSettings = useStoreSettingsStore();
    const role = useRoleStore();

    if (userId && lastUser && lastUser !== userId) {
      console.log(
        '[Auth] User berubah dari',
        lastUser,
        'ke',
        userId,
        '- Menghapus data offline lama'
      );
      await db.delete();
      await db.open();
      role.resetRoleState();
      storeSettings.resetSettings();
    }

    if (userId) {
      localStorage.setItem('pos_last_user_id', userId);

      if (meta?.ownerPinHash) {
        localStorage.setItem('pos_owner_pin_hash', meta.ownerPinHash);
        role.ownerPinHash = meta.ownerPinHash;
      } else {
        localStorage.removeItem('pos_owner_pin_hash');
        role.ownerPinHash = null;
      }

      try {
        const res = await api.getMyStore();
        if (res?.store?.id) {
          currentStoreId.value = res.store.id;
          setStoreId(res.store.id);
          if (res.store.name) {
            storeSettings.updateSettings({
              storeName: res.store.name,
              ownerName: meta?.fullName || storeSettings.settings.ownerName,
              phone: meta?.phone || storeSettings.settings.phone,
            });
          }
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
        const parsedMeta = {
          fullName: meta.full_name || meta.name || undefined,
          phone: meta.phone || session.user.phone || undefined,
          ownerPinHash: meta.owner_pin_hash || undefined,
        };
        userMetadata.value = {
          fullName: parsedMeta.fullName,
          phone: parsedMeta.phone,
        };
        await checkUserChangeAndFetchStore(session.user.id, parsedMeta);
      } else {
        userMetadata.value = null;
      }

      supabase.auth.onAuthStateChange(async (_e, session) => {
        isAuthenticated.value = Boolean(session);
        userEmail.value = session?.user?.email ?? null;
        if (session?.user) {
          const meta = session.user.user_metadata ?? {};
          const parsedMeta = {
            fullName: meta.full_name || meta.name || undefined,
            phone: meta.phone || session.user.phone || undefined,
            ownerPinHash: meta.owner_pin_hash || undefined,
          };
          userMetadata.value = {
            fullName: parsedMeta.fullName,
            phone: parsedMeta.phone,
          };
          await checkUserChangeAndFetchStore(session.user.id, parsedMeta);
        } else {
          userMetadata.value = null;
        }
      });
    } else {
      isAuthenticated.value = true;
    }
    ready.value = true;
  }

  async function login(emailVal: string, passwordVal: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailVal.trim(),
      password: passwordVal,
    });
    if (error) throw error;

    if (data.session?.user) {
      isAuthenticated.value = true;
      userEmail.value = data.session.user.email ?? null;
      const meta = data.session.user.user_metadata ?? {};
      const parsedMeta = {
        fullName: meta.full_name || meta.name || undefined,
        phone: meta.phone || data.session.user.phone || undefined,
        ownerPinHash: meta.owner_pin_hash || undefined,
      };
      userMetadata.value = {
        fullName: parsedMeta.fullName,
        phone: parsedMeta.phone,
      };
      await checkUserChangeAndFetchStore(data.session.user.id, parsedMeta);
    }
  }

  async function logout() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    isAuthenticated.value = false;
    userEmail.value = null;
    userMetadata.value = null;
    currentStoreId.value = null;
    setStoreId('');

    localStorage.removeItem('pos_last_user_id');
    localStorage.removeItem('pos_owner_pin_hash');
    localStorage.removeItem('pos_cashier_mode');
    localStorage.removeItem('point_of_sale_store_settings');

    try {
      const role = useRoleStore();
      role.resetRoleState();
      const storeSettings = useStoreSettingsStore();
      storeSettings.resetSettings();
      await db.delete();
    } catch (e) {
      console.warn('[Auth] Gagal menghapus database lokal saat logout:', e);
    }
    window.location.reload();
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

  return {
    isAuthenticated,
    userEmail,
    userMetadata,
    currentStoreId,
    ready,
    init,
    login,
    logout,
    updateProfile,
  };
});
