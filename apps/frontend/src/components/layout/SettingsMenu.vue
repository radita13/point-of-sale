<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { LogOut, RefreshCw, Settings, Store, X, Save } from 'lucide-vue-next';
import { useAuthStore, useNetworkStore } from '@/stores';
import { useSyncStore } from '@/stores/sync';
import { useStoreSettingsStore } from '@/stores/storeSettings';
import { toast } from 'vue-sonner';

const router = useRouter();
const auth = useAuthStore();
const network = useNetworkStore();
const sync = useSyncStore();
const storeSettings = useStoreSettingsStore();

const open = ref(false);
const showProfileModal = ref(false);

const profileForm = ref({ ...storeSettings.settings });

function openProfileModal() {
  profileForm.value = { ...storeSettings.settings };
  showProfileModal.value = true;
  open.value = false;
}

function saveProfile() {
  if (!profileForm.value.storeName.trim()) {
    toast.error('Nama Toko tidak boleh kosong');
    return;
  }
  storeSettings.updateSettings(profileForm.value);
  toast.success('Profil Toko berhasil diperbarui!');
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
  <div class="fixed bottom-20 right-4 z-50 lg:bottom-6 lg:right-6">
    <div v-if="open" class="fixed inset-0" @click="open = false" />

    <Transition name="menu-pop">
      <div
        v-if="open"
        class="absolute bottom-16 right-0 w-64 overflow-hidden rounded-2xl border-2 border-ink bg-surface shadow-hard-lg"
      >
        <div class="flex items-center justify-between border-b-2 border-ink bg-ink px-3 py-2 text-white">
          <span class="text-xs font-extrabold uppercase tracking-wider">Pengaturan</span>
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
            @click="openProfileModal"
            class="neo-press flex w-full items-center gap-2.5 rounded-xl border-2 border-ink bg-canvas p-2.5 text-left"
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card-purple text-white">
              <Store class="h-4 w-4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-xs font-extrabold">Profil Toko</span>
              <span class="block truncate text-[10px] font-semibold text-gray-600">Nama, Alamat &amp; Kontak Struk</span>
            </span>
          </button>

          <button
            type="button"
            @click="handleSync"
            :disabled="sync.syncing"
            class="neo-press flex w-full items-center gap-2.5 rounded-xl border-2 border-ink bg-canvas p-2.5 text-left disabled:opacity-60"
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': sync.syncing }" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-xs font-extrabold">Sinkronkan Sekarang</span>
              <span class="block truncate text-[10px] font-semibold text-gray-600">{{ pendingText }}</span>
            </span>
            <span
              v-if="totalPending > 0"
              class="flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-card-coral px-1 text-[10px] font-black text-white"
            >
              {{ totalPending > 99 ? '99+' : totalPending }}
            </span>
          </button>

          <button
            type="button"
            @click="handleLogout"
            class="neo-press flex w-full items-center gap-2.5 rounded-xl border-2 border-ink bg-card-coral/10 p-2.5 text-card-coral"
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card-coral text-white">
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
      class="neo-press relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-brand text-white shadow-hard-md"
    >
      <Settings class="h-5 w-5 transition-transform duration-200" :class="{ 'rotate-45': open }" />
      <span
        v-if="!open && totalPending > 0"
        class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-card-coral px-1 text-[10px] font-black text-white"
      >
        {{ totalPending > 99 ? '99+' : totalPending }}
      </span>
    </button>

    <!-- Modal Form Profil Toko -->
    <div
      v-if="showProfileModal"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div class="w-full max-w-md rounded-2xl border-2 border-ink bg-surface p-5 shadow-hard-xl sm:p-6 text-left">
        <div class="mb-4 flex items-center justify-between border-b-2 border-ink pb-3">
          <h3 class="flex items-center gap-2 text-base font-extrabold">
            <Store class="h-5 w-5 text-brand" /> Profil &amp; Identitas Toko
          </h3>
          <button @click="showProfileModal = false" class="p-1 text-gray-600 hover:text-card-coral">
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="saveProfile" class="space-y-3 text-xs font-bold">
          <div>
            <label class="mb-1 block">Nama Toko</label>
            <input
              v-model="profileForm.storeName"
              placeholder="Contoh: TOKO BERKAH SEMBAKO"
              class="w-full rounded-xl border-2 border-ink bg-canvas px-3 py-2 text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label class="mb-1 block">Nama Pemilik (Owner)</label>
            <input
              v-model="profileForm.ownerName"
              placeholder="Contoh: Pak Budi"
              class="w-full rounded-xl border-2 border-ink bg-canvas px-3 py-2 text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label class="mb-1 block">Alamat Toko (Struk)</label>
            <input
              v-model="profileForm.address"
              placeholder="Contoh: Jl. Sembako Raya No. 88, Manado"
              class="w-full rounded-xl border-2 border-ink bg-canvas px-3 py-2 text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label class="mb-1 block">No. Telepon / WhatsApp (Struk)</label>
            <input
              v-model="profileForm.phone"
              placeholder="Contoh: Telp/WA: 0812-3456-7890"
              class="w-full rounded-xl border-2 border-ink bg-canvas px-3 py-2 text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label class="mb-1 block">Pesan Struk (Footer)</label>
            <textarea
              v-model="profileForm.receiptFooter"
              rows="2"
              placeholder="*** TERIMA KASIH ***"
              class="w-full rounded-xl border-2 border-ink bg-canvas px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div class="grid grid-cols-2 gap-2 border-t-2 border-ink pt-3">
            <button
              type="button"
              @click="showProfileModal = false"
              class="neo-press rounded-xl border-2 border-ink bg-canvas py-2 text-xs font-extrabold"
            >
              Batal
            </button>
            <button
              type="submit"
              class="neo-press flex items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-brand py-2 text-xs font-extrabold text-white shadow-hard-sm"
            >
              <Save class="h-4 w-4" /> Simpan Profil
            </button>
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
