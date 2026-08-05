import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { Toaster } from 'vue-sonner';
import App from './App.vue';
import router from './router';
import { queryClient } from './lib/queryClient';
import { seedProductsIfEmpty } from './db/seed';
import { db } from './db/database';
import { useAuthStore } from './stores';
import { useSyncStore } from './stores/sync';
import './style.css';

async function bootstrap() {
  const pinia = createPinia();
  const app = createApp(App);
  app.use(pinia);
  app.use(VueQueryPlugin, { queryClient });

  const auth = useAuthStore();
  await auth.init();

  const wasCleared = sessionStorage.getItem('pos_local_cleared') === '1';
  if (wasCleared) {
    sessionStorage.removeItem('pos_local_cleared');
  } else {
    const productCount = await db.products.count();
    if (productCount === 0) {
      if (navigator.onLine) {
        const restored = await useSyncStore().restoreProductsFromServer();
        if (restored === 0) await seedProductsIfEmpty();
      } else {
        await seedProductsIfEmpty();
      }
    }
  }

  await useSyncStore().ensurePendingStockDirty();

  app.use(router);
  app.component('Toaster', Toaster);
  app.mount('#app');
}

bootstrap();