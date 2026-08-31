import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore, useRoleStore } from '@/stores';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/components/layout/AppShell.vue'),
      children: [
        { path: '', redirect: '/kasir' },
        {
          path: 'kasir',
          name: 'kasir',
          component: () => import('@/views/KasirView.vue'),
        },
        {
          path: 'inventaris',
          name: 'inventaris',
          component: () => import('@/views/InventarisView.vue'),
          meta: { ownerOnly: true },
        },
        {
          path: 'opname',
          name: 'opname',
          component: () => import('@/views/OpnameView.vue'),
        },
        {
          path: 'laporan',
          name: 'laporan',
          component: () => import('@/views/LaporanView.vue'),
          meta: { ownerOnly: true },
        },
        {
          path: 'ai',
          name: 'ai',
          component: () => import('@/views/AiView.vue'),
          meta: { ownerOnly: true },
        },
      ],
    },
    {
      path: '/sync',
      name: 'sync',
      component: () => import('@/views/SyncView.vue'),
    },
    { path: '/:pathMatch(.*)*', redirect: '/kasir' },
  ],
});

router.beforeEach((to) => {
  if (to.meta.public) return true;
  const auth = useAuthStore();
  if (!auth.isAuthenticated) return { name: 'login' };

  const role = useRoleStore();
  if (to.meta.ownerOnly && role.isCashierMode) {
    return { name: 'kasir' };
  }

  return true;
});

export default router;
