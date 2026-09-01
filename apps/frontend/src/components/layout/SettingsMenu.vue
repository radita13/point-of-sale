<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { LogOut, RefreshCw, Settings, Store, X, Save, Lock, Unlock } from 'lucide-vue-next';
import { useAuthStore, useNetworkStore, useRoleStore } from '@/stores';
import { useSyncStore } from '@/stores/sync';
import { useStoreSettingsStore } from '@/stores/storeSettings';
import { useCartStore } from '@/stores/cart';
import { api } from '@/services/api';
import { useRoute } from 'vue-router';
import { toast } from 'vue-sonner';
import Button from '../ui/Button.vue';
import Input from '../ui/Input.vue';
import Label from '../ui/Label.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const network = useNetworkStore();
const sync = useSyncStore();
const storeSettings = useStoreSettingsStore();
const cart = useCartStore();
const role = useRoleStore();

const showPinModal = ref(false);
const pinInput = ref('');
const pinError = ref('');
const showSetPinModal = ref(false);
const newPin6Input = ref('');
const setPinError = ref('');
const oldPinInput = ref('');
const newPinInput = ref('');
const changePinError = ref('');

function handleToggleCashierMode() {
  open.value = false;
  if (role.isCashierMode) {
    pinInput.value = '';
    pinError.value = '';
    showPinModal.value = true;
  } else {
    if (!role.hasPinSet) {
      newPin6Input.value = '';
      setPinError.value = '';
      showSetPinModal.value = true;
    } else {
      role.enableCashierMode();
      toast.info('Mode Kasir Aktif. Menu sensitif (Inventaris, Laporan, AI) telah dikunci.');
      if (route.meta.ownerOnly) {
        router.push({ name: 'kasir' });
      }
    }
  }
}

async function confirmSetInitialPin() {
  if (!/^\d{6}$/.test(newPin6Input.value)) {
    setPinError.value = 'PIN harus berupa 6 digit angka!';
    return;
  }
  const ok = await role.setInitialPin(newPin6Input.value);
  if (ok) {
    showSetPinModal.value = false;
    role.enableCashierMode();
    toast.success('PIN 6 Digit berhasil dibuat & Mode Kasir Aktif!');
    if (route.meta.ownerOnly) {
      router.push({ name: 'kasir' });
    }
  } else {
    setPinError.value = 'Gagal menyimpan PIN. Masukkan 6 digit angka.';
  }
}

async function confirmUnlockCashierMode() {
  const ok = await role.disableCashierMode(pinInput.value);
  if (ok) {
    showPinModal.value = false;
    toast.success('Kembali ke Mode Owner (Akses Penuh).');
  } else {
    pinError.value = 'PIN Salah! Masukkan 6 digit PIN Owner yang benar.';
  }
}

async function handleSaveNewPin() {
  if (!/^\d{6}$/.test(newPinInput.value)) {
    changePinError.value = 'PIN Baru harus 6 digit angka!';
    return;
  }
  const ok = await role.setOwnerPin(oldPinInput.value, newPinInput.value);
  if (ok) {
    oldPinInput.value = '';
    newPinInput.value = '';
    changePinError.value = '';
    toast.success('PIN Owner 6-digit berhasil diperbarui!');
  } else {
    changePinError.value = 'PIN Lama salah!';
  }
}

const hasActiveCart = computed(() => {
  return route.name === 'kasir' && cart.items.length > 0;
});

const open = ref(false);
const showProfileModal = ref(false);

const profileForm = ref({ ...storeSettings.settings });

function openProfileModal() {
  profileForm.value = {
    ...storeSettings.settings,
    ownerName: auth.userMetadata?.fullName || storeSettings.settings.ownerName || '',
    phone: auth.userMetadata?.phone || storeSettings.settings.phone || '',
  };
  showProfileModal.value = true;
  open.value = false;
}

async function saveProfile() {
  if (!profileForm.value.storeName.trim()) {
    toast.error('Nama Toko tidak boleh kosong');
    return;
  }

  const newStoreName = profileForm.value.storeName.trim();

  storeSettings.updateSettings(profileForm.value);

  if (auth.isAuthenticated) {
    try {
      await Promise.all([
        auth.updateProfile({
          fullName: profileForm.value.ownerName.trim(),
          phone: profileForm.value.phone.trim(),
        }),
        api.updateMyStore(newStoreName),
      ]);
      toast.success('Profil Toko berhasil diperbarui!');
    } catch (err) {
      console.warn('Gagal sync profil toko ke server:', err);
      toast.warning('Profil disimpan di lokal perangkat, namun gagal sinkron ke server.');
    }
  } else {
    toast.info('Profil Toko berhasil disimpan di lokal perangkat.');
  }

  showProfileModal.value = false;
}

const totalPending = computed(() => sync.pendingCount + sync.pendingProducts);

const pendingText = computed(() => {
  if (sync.syncing) return 'Menyinkronkan...';
  if (totalPending.value === 0) return 'Semua data sudah tersinkron';
  return `${sync.pendingCount} transaksi, ${sync.pendingProducts} produk belum sync`;
});

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false;
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

function handleSync() {
  open.value = false;
  router.push({ name: 'sync' });
}

async function handleLogout() {
  open.value = false;
  await auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div
    class="fixed right-4 z-50 transition-all duration-200 lg:right-6 lg:bottom-6"
    :class="hasActiveCart ? 'bottom-37.5 lg:bottom-6' : 'bottom-20 lg:bottom-6'"
  >
    <div v-if="open" class="fixed inset-0" @click="open = false" />

    <Transition name="menu-pop">
      <div
        v-if="open"
        class="border-ink bg-surface shadow-hard-lg absolute right-0 bottom-16 w-64 overflow-hidden rounded-2xl border-2"
      >
        <div
          class="border-ink bg-ink flex items-center justify-between border-b-2 px-3 py-2 text-white"
        >
          <span class="text-xs font-extrabold tracking-wider uppercase">Pengaturan</span>
          <span
            class="rounded-full border border-white/40 px-2 py-0.5 text-[9px] font-black"
            :class="network.isOnline ? 'bg-card-green' : 'bg-offline text-ink'"
          >
            {{ network.isOnline ? 'ONLINE' : 'OFFLINE' }}
          </span>
        </div>

        <div class="space-y-1.5 p-2">
          <button
            type="button"
            @click="handleToggleCashierMode"
            class="neo-press border-ink bg-canvas flex w-full cursor-pointer items-center gap-2.5 rounded-xl border-2 p-2.5 text-left"
          >
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
              :class="role.isCashierMode ? 'bg-card-coral' : 'bg-card-green'"
            >
              <Lock v-if="role.isCashierMode" class="h-4 w-4" />
              <Unlock v-else class="h-4 w-4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-xs font-extrabold">{{
                role.isCashierMode ? 'Mode Kasir (Aktif)' : 'Mode Owner (Akses Penuh)'
              }}</span>
              <span class="block truncate text-[10px] font-semibold text-gray-600">
                {{
                  role.isCashierMode
                    ? 'Klik untuk kembali ke Mode Owner'
                    : 'Kunci menu sensitif untuk kasir'
                }}
              </span>
            </span>
          </button>

          <button
            v-if="!role.isCashierMode"
            type="button"
            @click="openProfileModal"
            class="neo-press border-ink bg-canvas flex w-full cursor-pointer items-center gap-2.5 rounded-xl border-2 p-2.5 text-left"
          >
            <span
              class="bg-card-purple flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
            >
              <Store class="h-4 w-4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-xs font-extrabold">Profil Toko</span>
              <span class="block truncate text-[10px] font-semibold text-gray-600"
                >Nama, Alamat &amp; Kontak Struk</span
              >
            </span>
          </button>

          <button
            v-if="!role.isCashierMode"
            type="button"
            @click="handleSync"
            :disabled="sync.syncing"
            class="neo-press border-ink bg-canvas flex w-full cursor-pointer items-center gap-2.5 rounded-xl border-2 p-2.5 text-left disabled:opacity-60"
          >
            <span
              class="bg-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
            >
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': sync.syncing }" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-xs font-extrabold">Sinkronkan Sekarang</span>
              <span class="block truncate text-[10px] font-semibold text-gray-600">{{
                pendingText
              }}</span>
            </span>
            <span
              v-if="totalPending > 0"
              class="border-ink bg-card-coral flex h-5 min-w-5 items-center justify-center rounded-full border-2 px-1 text-[10px] font-black text-white"
            >
              {{ totalPending > 99 ? '99+' : totalPending }}
            </span>
          </button>

          <button
            type="button"
            @click="handleLogout"
            class="neo-press border-ink bg-card-coral/10 text-card-coral flex w-full cursor-pointer items-center gap-2.5 rounded-xl border-2 p-2.5"
          >
            <span
              class="bg-card-coral flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
            >
              <LogOut class="h-4 w-4" />
            </span>
            <span class="text-xs font-extrabold">Keluar</span>
          </button>
        </div>
      </div>
    </Transition>

    <button
      type="button"
      @click="open = !open"
      :title="open ? 'Tutup pengaturan' : 'Pengaturan'"
      :aria-expanded="open"
      class="neo-press border-ink bg-brand shadow-hard-md relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 text-white"
    >
      <Settings class="h-5 w-5 transition-transform duration-200" :class="{ 'rotate-45': open }" />
      <span
        v-if="!open && totalPending > 0"
        class="border-ink bg-card-coral absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 px-1 text-[10px] font-black text-white"
      >
        {{ totalPending > 99 ? '99+' : totalPending }}
      </span>
    </button>

    <!-- Modal Form Profil Toko -->
    <div
      v-if="showProfileModal"
      class="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        class="border-ink bg-surface shadow-hard-xl w-full max-w-md rounded-2xl border-2 p-5 text-left sm:p-6"
      >
        <div class="border-ink mb-4 flex items-center justify-between border-b-2 pb-3">
          <h3 class="flex items-center gap-2 text-base font-extrabold">
            <Store class="text-brand h-5 w-5" /> Profil &amp; Identitas Toko
          </h3>
          <button @click="showProfileModal = false" class="hover:text-card-coral p-1 text-gray-600">
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="saveProfile" class="space-y-3 text-xs font-bold">
          <div>
            <Label for="storeName" class="mb-1 block">Nama Toko</Label>
            <Input
              v-model="profileForm.storeName"
              placeholder="Contoh: Toko Sembako Berkah"
              class="text-xs font-extrabold"
            />
          </div>

          <div>
            <Label for="ownerName" class="mb-1 block">Nama Pemilik (Owner)</Label>
            <Input
              v-model="profileForm.ownerName"
              placeholder="Contoh: Pak Budi"
              class="text-xs font-extrabold"
            />
          </div>

          <div>
            <Label for="cashierName" class="mb-1 block">Nama Kasir Bertugas</Label>
            <Input
              v-model="profileForm.cashierName"
              placeholder="Contoh: Siti / Kasir 1"
              class="text-xs font-extrabold"
            />
          </div>

          <div>
            <Label for="address" class="mb-1 block">Alamat Toko</Label>
            <Input
              v-model="profileForm.address"
              placeholder="Contoh: Jl. Sembako Raya No. 88, Manado"
              class="text-xs font-extrabold"
            />
          </div>

          <div>
            <Label for="phone" class="mb-1 block">No. Telepon / WhatsApp</Label>
            <Input
              v-model="profileForm.phone"
              placeholder="Contoh: 0812-3456-7890"
              class="text-xs font-extrabold"
            />
          </div>

          <div class="border-ink border-t-2 pt-2">
            <Label class="mb-1 block">PIN Toko (Owner)</Label>
            <div class="grid grid-cols-2 gap-2">
              <Input
                v-model="oldPinInput"
                type="password"
                maxlength="6"
                placeholder="PIN Lama (6 digit)"
                class="text-xs font-extrabold"
              />
              <Input
                v-model="newPinInput"
                type="password"
                maxlength="6"
                placeholder="PIN Baru (6 digit)"
                class="text-xs font-extrabold"
              />
            </div>
            <p v-if="changePinError" class="text-card-coral mt-1 text-[10px] font-bold">
              {{ changePinError }}
            </p>
            <Button
              type="button"
              size="icon"
              @click="handleSaveNewPin"
              class="mt-2 w-full text-xs font-extrabold"
            >
              Ubah PIN
            </Button>
          </div>

          <div>
            <Label for="receiptFooter" class="mb-1 block">Pesan Struk (Footer)</Label>
            <textarea
              v-model="profileForm.receiptFooter"
              rows="2"
              placeholder="*** TERIMA KASIH ***"
              class="border-ink bg-canvas focus:ring-brand w-full rounded-xl border-2 px-3 py-2 text-xs font-semibold focus:ring-2 focus:outline-none"
            />
          </div>

          <div class="border-ink grid grid-cols-2 gap-2 border-t-2 pt-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              @click="showProfileModal = false"
              class="text-xs font-extrabold"
            >
              Batal
            </Button>
            <Button type="submit" size="md" class="text-xs font-extrabold">
              <Save class="h-4 w-4" /> Simpan
            </Button>
          </div>
        </form>
      </div>
    </div>
    <!-- Modal Set Initial PIN Owner 6 Digit -->
    <div
      v-if="showSetPinModal"
      class="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        class="border-ink bg-surface shadow-hard-xl w-full max-w-xs rounded-2xl border-2 p-5 text-center"
      >
        <div
          class="border-ink bg-card-green shadow-hard-sm mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border-2 text-white"
        >
          <Lock class="h-6 w-6" />
        </div>
        <h3 class="text-sm font-extrabold">Buat PIN Owner (6 Digit)</h3>
        <p class="mb-4 text-[11px] font-bold text-gray-500">
          PIN ini digunakan untuk membuka kembali Mode Owner dari Mode Kasir.
        </p>

        <form @submit.prevent="confirmSetInitialPin" class="space-y-3">
          <Input
            v-model="newPin6Input"
            type="password"
            maxlength="6"
            pattern="[0-9]*"
            inputmode="numeric"
            placeholder="Contoh: 123456"
            class="border-ink bg-canvas focus:ring-brand w-full rounded-xl border-2 px-3 py-2 text-center text-base font-extrabold tracking-widest focus:ring-2 focus:outline-none"
            autofocus
          />
          <p v-if="setPinError" class="text-card-coral text-[11px] font-bold">{{ setPinError }}</p>

          <div class="grid grid-cols-2 gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              @click="showSetPinModal = false"
              class="text-xs font-extrabold"
            >
              Batal
            </Button>
            <Button type="submit" size="md" class="text-xs font-extrabold">Aktifkan</Button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Verification PIN Owner -->
    <div
      v-if="showPinModal"
      class="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        class="border-ink bg-surface shadow-hard-xl w-full max-w-xs rounded-2xl border-2 p-5 text-center"
      >
        <div
          class="border-ink bg-card-coral shadow-hard-sm mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border-2 text-white"
        >
          <Lock class="h-6 w-6" />
        </div>
        <h3 class="text-sm font-extrabold">Masukkan PIN Owner</h3>
        <p class="mb-4 text-[11px] font-bold text-gray-500">
          Ketik PIN untuk kembali ke Mode Owner
        </p>

        <form @submit.prevent="confirmUnlockCashierMode" class="space-y-3">
          <Input
            v-model="pinInput"
            type="password"
            maxlength="6"
            placeholder="PIN 6 Digit"
            class="text-center text-sm font-extrabold"
            autofocus
          />
          <p v-if="pinError" class="text-card-coral text-[11px] font-bold">{{ pinError }}</p>

          <div class="grid grid-cols-2 gap-3 pt-2">
            <Button type="button" variant="secondary" size="md" @click="showPinModal = false">
              Batal
            </Button>
            <Button type="submit" variant="primary" size="md"> Buka Kunci </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-pop-enter-active,
.menu-pop-leave-active {
  transition:
    opacity 0.15s ease-out,
    transform 0.15s ease-out;
}
.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.97);
}
</style>
