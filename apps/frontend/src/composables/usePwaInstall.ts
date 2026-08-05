import { ref, onMounted, onUnmounted } from 'vue';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const isInstalled = ref(false);
const isDismissed = ref(false);

export function usePwaInstall() {
  const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

  function handleBeforeInstallPrompt(e: Event) {
    e.preventDefault();
    deferredPrompt.value = e as BeforeInstallPromptEvent;
  }

  function handleAppInstalled() {
    isInstalled.value = true;
    deferredPrompt.value = null;
  }

  onMounted(() => {
    isInstalled.value = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
  });

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  });

  async function promptInstall() {
    if (!deferredPrompt.value) return;
    await deferredPrompt.value.prompt();
    const choice = await deferredPrompt.value.userChoice;
    if (choice.outcome === 'accepted') isInstalled.value = true;
    deferredPrompt.value = null;
  }

  function dismiss() {
    isDismissed.value = true;
  }

  return {
    canInstall: deferredPrompt,
    isInstalled,
    isDismissed,
    isIos,
    promptInstall,
    dismiss,
  };
}
