import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Point of Sale',
        short_name: 'POS',
        description: 'Kasir offline-first untuk warung sembako',
        theme_color: '#eee8db',
        background_color: '#eee8db',
        display: 'standalone',
        orientation: 'any',
        lang: 'id',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    // Utamakan source .ts (.mts/.ts) di atas artifact .js (lihat tsconfig noEmit)
    extensions: ['.mts', '.ts', '.mjs', '.js', '.jsx', '.tsx', '.json', '.vue'],
  },
  server: {
    port: 5173,
  },
});