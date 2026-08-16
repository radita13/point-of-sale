import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useNetworkStore = defineStore('network', () => {
  const isOnline = ref(navigator.onLine);

  function setOnline(online: boolean) {
    isOnline.value = online;
  }

  const networkBadgeStyle = computed(() =>
    isOnline.value ? 'bg-brand text-white' : 'bg-offline text-ink'
  );

  return { isOnline, setOnline, networkBadgeStyle };
});
