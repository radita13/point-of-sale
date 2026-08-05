<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores';
import PwaInstallBanner from '@/components/pwa/PwaInstallBanner.vue';

const route = useRoute();
void route;
void useAuthStore();
</script>

<template>
  <router-view />
  <PwaInstallBanner />
  <Toaster
    position="bottom-right"
    :toast-options="{
      style: {
        background: '#121212',
        color: '#ffffff',
        border: '2px solid #ffffff',
        boxShadow: '6px 6px 0px #121212',
        borderRadius: '0.75rem',
        fontWeight: 700,
        fontSize: '0.75rem',
        fontFamily: '\'Plus Jakarta Sans\', sans-serif'
      }
    }"
  />
</template>