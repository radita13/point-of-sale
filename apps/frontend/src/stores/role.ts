import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from '@/services/supabase';

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const useRoleStore = defineStore('role', () => {
  const isCashierMode = ref(localStorage.getItem('pos_cashier_mode') === 'true');
  const ownerPinHash = ref<string | null>(localStorage.getItem('pos_owner_pin_hash'));

  async function syncPinFromSupabase() {
    if (!supabase) return;
    try {
      const { data } = await supabase.auth.getSession();
      const remoteHash = data.session?.user?.user_metadata?.owner_pin_hash;
      if (remoteHash && typeof remoteHash === 'string') {
        ownerPinHash.value = remoteHash;
        localStorage.setItem('pos_owner_pin_hash', remoteHash);
      } else {
        ownerPinHash.value = null;
        localStorage.removeItem('pos_owner_pin_hash');
      }
    } catch (e) {
      console.warn('[Role] Gagal sync PIN dari Supabase:', e);
    }
  }

  function resetRoleState() {
    isCashierMode.value = false;
    ownerPinHash.value = null;
    localStorage.removeItem('pos_cashier_mode');
    localStorage.removeItem('pos_owner_pin_hash');
  }

  syncPinFromSupabase();

  const currentRole = computed<'owner' | 'cashier'>(() =>
    isCashierMode.value ? 'cashier' : 'owner'
  );

  const hasPinSet = computed(() => Boolean(ownerPinHash.value));

  function enableCashierMode() {
    isCashierMode.value = true;
    localStorage.setItem('pos_cashier_mode', 'true');
  }

  async function setInitialPin(pin: string): Promise<boolean> {
    if (!/^\d{6}$/.test(pin)) return false;
    const hash = await hashPin(pin);
    ownerPinHash.value = hash;
    localStorage.setItem('pos_owner_pin_hash', hash);

    if (supabase) {
      try {
        await supabase.auth.updateUser({
          data: { owner_pin_hash: hash },
        });
      } catch (err) {
        console.warn('[Role] Gagal simpan PIN ke Supabase user_metadata:', err);
      }
    }
    return true;
  }

  async function disableCashierMode(pin: string): Promise<boolean> {
    if (!ownerPinHash.value) {
      await syncPinFromSupabase();
    }
    if (!ownerPinHash.value) return false;
    const inputHash = await hashPin(pin);
    if (inputHash === ownerPinHash.value) {
      isCashierMode.value = false;
      localStorage.setItem('pos_cashier_mode', 'false');
      return true;
    }
    return false;
  }

  async function verifyOwnerPin(pin: string): Promise<boolean> {
    if (!ownerPinHash.value) {
      await syncPinFromSupabase();
    }
    if (!ownerPinHash.value) return false;
    const inputHash = await hashPin(pin);
    return inputHash === ownerPinHash.value;
  }

  async function setOwnerPin(oldPin: string, newPin: string): Promise<boolean> {
    if (!/^\d{6}$/.test(newPin)) return false;
    const isValidOld = await verifyOwnerPin(oldPin);
    if (!isValidOld) return false;
    const newHash = await hashPin(newPin);
    ownerPinHash.value = newHash;
    localStorage.setItem('pos_owner_pin_hash', newHash);

    if (supabase) {
      try {
        await supabase.auth.updateUser({
          data: { owner_pin_hash: newHash },
        });
      } catch (err) {
        console.warn('[Role] Gagal update PIN ke Supabase user_metadata:', err);
      }
    }
    return true;
  }

  return {
    isCashierMode,
    ownerPinHash,
    currentRole,
    hasPinSet,
    enableCashierMode,
    setInitialPin,
    disableCashierMode,
    verifyOwnerPin,
    setOwnerPin,
    syncPinFromSupabase,
    resetRoleState,
  };
});
