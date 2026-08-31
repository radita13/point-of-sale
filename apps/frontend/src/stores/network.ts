import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useSyncStore } from './sync';

export const useNetworkStore = defineStore('network', () => {
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);

  function setOnline(online: boolean) {
    if (isOnline.value === online) return;
    isOnline.value = online;
    if (online) {
      const sync = useSyncStore();
      sync.refreshCount();
      sync.runSync();
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => setOnline(true));
    window.addEventListener('offline', () => setOnline(false));
  }

  const networkBadgeStyle = computed(() =>
    isOnline.value ? 'bg-brand text-white' : 'bg-offline text-ink'
  );

  return { isOnline, setOnline, networkBadgeStyle };
});
