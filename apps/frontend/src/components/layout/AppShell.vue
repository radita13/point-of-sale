<script setup lang="ts">
import { computed, onBeforeMount, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Store, Package, ClipboardCheck, BarChart3, Sparkles } from 'lucide-vue-next';
import Badge from '@/components/ui/Badge.vue';
import SettingsMenu from '@/components/layout/SettingsMenu.vue';
import { useNetworkStore, useAuthStore, useRoleStore } from '@/stores';
import { useSyncStore } from '@/stores/sync';
import { useStoreSettingsStore } from '@/stores/storeSettings';

const route = useRoute();
const router = useRouter();
const network = useNetworkStore();
const auth = useAuthStore();
const sync = useSyncStore();
const storeSettings = useStoreSettingsStore();
const role = useRoleStore();

const displayOwnerName = computed(() => {
  const supabaseName = auth.userMetadata?.fullName?.trim();
  if (supabaseName) return supabaseName.toUpperCase();
  const customName = storeSettings.settings.ownerName?.trim();
  if (customName) return customName.toUpperCase();
  return '-';
});
let syncTimer: number | undefined;

function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && network.isOnline) {
    sync.runSync();
  }
}

onBeforeMount(() => {
  sync.refreshCount();
  syncTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible' && network.isOnline) {
      sync.runSync();
    }
  }, 30_000);
  document.addEventListener('visibilitychange', handleVisibilityChange);
});
onUnmounted(() => {
  if (syncTimer) window.clearInterval(syncTimer);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});

const allTabs = [
  { key: 'kasir', label: 'Kasir', icon: Store, ownerOnly: false },
  { key: 'inventaris', label: 'Inventaris', icon: Package, ownerOnly: true },
  { key: 'opname', label: 'Opname', icon: ClipboardCheck, ownerOnly: false },
  { key: 'laporan', label: 'Laporan', icon: BarChart3, ownerOnly: true },
  { key: 'ai', label: 'Asisten AI', icon: Sparkles, ownerOnly: true },
];

const tabs = computed(() => {
  if (role.isCashierMode) {
    return allTabs.filter((t) => !t.ownerOnly);
  }
  return allTabs;
});

const activeTab = computed(() => route.name as string);

function activeClasses(key: string) {
  switch (key) {
    case 'inventaris':
      return 'bg-card-green text-white border-ink shadow-hard-sm';
    case 'opname':
      return 'bg-offline text-ink border-ink shadow-hard-sm';
    case 'laporan':
      return 'bg-card-coral text-white border-ink shadow-hard-sm';
    case 'ai':
      return 'bg-card-purple text-white border-ink shadow-hard-sm';
    default:
      return 'bg-brand text-white border-ink shadow-hard-sm';
  }
}

function go(key: string) {
  router.push({ name: key });
}
</script>

<template>
  <div class="bg-canvas min-h-dvh pb-20 lg:pb-0">
    <!-- Top header -->
    <header class="sticky top-0 z-30 mx-auto max-w-7xl px-3 pt-3 sm:px-6">
      <div
        class="border-ink bg-surface shadow-hard-md flex items-center justify-between gap-3 rounded-2xl border-2 p-3 sm:p-4"
      >
        <div class="flex items-center gap-3">
          <div
            class="border-ink bg-brand shadow-hard-sm flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 text-white"
          >
            <Store class="h-5 w-5" />
          </div>
          <div class="leading-tight">
            <h1 class="text-base font-extrabold sm:text-lg">
              {{ storeSettings.settings.storeName }}
            </h1>
            <p class="text-ink/75 text-[11px] font-bold">
              <span class="text-ink font-extrabold">Owner: </span>
              {{ displayOwnerName }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Badge
            :class="network.isOnline ? 'bg-brand text-white' : 'bg-offline text-ink'"
            class="h-9 rounded-xl px-3"
          >
            <span
              class="h-2 w-2 rounded-full"
              :class="network.isOnline ? 'animate-pulse bg-white' : 'bg-red-600'"
            />
            {{ network.isOnline ? 'ONLINE' : 'OFFLINE' }}
          </Badge>
        </div>
      </div>
    </header>

    <SettingsMenu />

    <!-- Desktop tab nav -->
    <nav class="mx-auto mt-3 hidden max-w-7xl px-6 lg:block">
      <div
        class="border-ink bg-surface shadow-hard-md flex items-center gap-2 rounded-2xl border-2 p-3"
      >
        <button
          v-for="t in tabs"
          :key="t.key"
          @click="go(t.key)"
          :class="activeTab === t.key ? activeClasses(t.key) : 'bg-canvas text-ink hover:bg-ink/10'"
          class="neo-press border-ink flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 px-3 text-xs font-extrabold whitespace-nowrap"
        >
          <component :is="t.icon" class="h-4 w-4 shrink-0" />
          <span>{{ t.label }}</span>
        </button>
      </div>
    </nav>

    <main class="mx-auto max-w-7xl px-3 py-4 sm:px-6">
      <router-view />
    </main>

    <!-- Mobile bottom nav -->
    <nav
      class="border-ink bg-surface fixed inset-x-0 bottom-0 z-40 border-t-2 px-1 py-1.5 lg:hidden"
    >
      <div class="flex items-center justify-around text-center">
        <button
          v-for="t in tabs"
          :key="t.key"
          @click="go(t.key)"
          :class="activeTab === t.key ? activeClasses(t.key) : 'text-ink border-transparent'"
          class="flex flex-1 flex-col items-center justify-center rounded-xl border-2 px-1 py-1 text-[10px] font-extrabold transition-all"
        >
          <component :is="t.icon" class="mb-0.5 h-4 w-4" />
          <span>{{ t.label }}</span>
        </button>
      </div>
    </nav>
  </div>
</template>
