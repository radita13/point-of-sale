<script setup lang="ts">
import { computed, onBeforeMount, onUnmounted } from 'vue';
import { Store } from 'lucide-vue-next';
import Badge from '@/components/ui/Badge.vue';
import SettingsMenu from '@/components/layout/SettingsMenu.vue';
import BottomNavigation from '@/components/layout/BottomNavigation.vue';
import { useNetworkStore, useAuthStore } from '@/stores';
import { useSyncStore } from '@/stores/sync';
import { useStoreSettingsStore } from '@/stores/storeSettings';

const network = useNetworkStore();
const auth = useAuthStore();
const sync = useSyncStore();
const storeSettings = useStoreSettingsStore();

const displayOwnerName = computed(() => {
  const customName = storeSettings.settings.ownerName?.trim();
  if (customName) return customName.toUpperCase();
  const supabaseName = auth.userMetadata?.fullName?.trim();
  if (supabaseName) return supabaseName.toUpperCase();
  return '-';
});

let syncTimer: number | undefined;

function handleOnline() {
  network.setOnline(true);
  sync.refreshCount();
  sync.runSync();
}

function handleOffline() {
  network.setOnline(false);
}

onBeforeMount(() => {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  sync.refreshCount();
  syncTimer = window.setInterval(() => {
    if (navigator.onLine) sync.runSync();
  }, 30_000);
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  if (syncTimer) window.clearInterval(syncTimer);
});
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
            <p class="text-ink/50 text-[11px] font-bold">
              <span class="text-ink/70 font-extrabold">Owner: </span>
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

    <main class="mx-auto max-w-7xl p-3 sm:p-6">
      <router-view />
    </main>

    <BottomNavigation />
  </div>
</template>
