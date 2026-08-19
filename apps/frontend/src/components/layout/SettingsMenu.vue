<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { LogOut, RefreshCw, Settings, Store, X, Save } from 'lucide-vue-next';
import { useAuthStore, useNetworkStore } from '@/stores';
import { useSyncStore } from '@/stores/sync';
import { useStoreSettingsStore } from '@/stores/storeSettings';
import { useCartStore } from '@/stores/cart';
import { useRoute } from 'vue-router';
import { toast } from 'vue-sonner';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const network = useNetworkStore();
const sync = useSyncStore();
const storeSettings = useStoreSettingsStore();
const cart = useCartStore();

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

  storeSettings.updateSettings(profileForm.value);

  if (auth.isAuthenticated) {
    try {
      await auth.updateProfile({
        fullName: profileForm.value.ownerName.trim(),
        phone: profileForm.value.phone.trim(),
      });
      toast.success('Profil Toko & Akun Supabase berhasil diperbarui!');
    } catch (err) {
      console.warn('Gagal sync ke Supabase Auth:', err);
      toast.success('Profil Toko disimpan (lokal).');
    }
  } else {
    toast.success('Profil Toko berhasil diperbarui!');
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
      class="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
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
            <label class="mb-1 block">Nama Toko</label>
            <input
              v-model="profileForm.storeName"
              placeholder="Contoh: TOKO BERKAH SEMBAKO"
              class="border-ink bg-canvas focus:ring-brand w-full rounded-xl border-2 px-3 py-2 text-xs font-extrabold focus:ring-2 focus:outline-none"
            />
          </div>

          <div>
            <label class="mb-1 block">Nama Pemilik (Owner)</label>
            <input
              v-model="profileForm.ownerName"
              placeholder="Contoh: Pak Budi"
              class="border-ink bg-canvas focus:ring-brand w-full rounded-xl border-2 px-3 py-2 text-xs font-extrabold focus:ring-2 focus:outline-none"
            />
          </div>

          <div>
            <label class="mb-1 block">Alamat Toko (Struk)</label>
            <input
              v-model="profileForm.address"
              placeholder="Contoh: Jl. Sembako Raya No. 88, Manado"
              class="border-ink bg-canvas focus:ring-brand w-full rounded-xl border-2 px-3 py-2 text-xs font-extrabold focus:ring-2 focus:outline-none"
            />
          </div>

          <div>
            <label class="mb-1 block">No. Telepon / WhatsApp (Struk)</label>
            <input
              v-model="profileForm.phone"
              placeholder="Contoh: Telp/WA: 0812-3456-7890"
              class="border-ink bg-canvas focus:ring-brand w-full rounded-xl border-2 px-3 py-2 text-xs font-extrabold focus:ring-2 focus:outline-none"
            />
          </div>

          <div>
            <label class="mb-1 block">Pesan Struk (Footer)</label>
            <textarea
              v-model="profileForm.receiptFooter"
              rows="2"
              placeholder="*** TERIMA KASIH ***"
              class="border-ink bg-canvas focus:ring-brand w-full rounded-xl border-2 px-3 py-2 text-xs font-semibold focus:ring-2 focus:outline-none"
            />
          </div>

          <div class="border-ink grid grid-cols-2 gap-2 border-t-2 pt-3">
            <button
              type="button"
              @click="showProfileModal = false"
              class="neo-press border-ink bg-canvas rounded-xl border-2 py-2 text-xs font-extrabold"
            >
              Batal
            </button>
            <button
              type="submit"
              class="neo-press border-ink bg-brand shadow-hard-sm flex items-center justify-center gap-1.5 rounded-xl border-2 py-2 text-xs font-extrabold text-white"
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
