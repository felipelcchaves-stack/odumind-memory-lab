import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt' (not 'autoUpdate'): with skipWaiting/clientsClaim removed
      // below, a new service worker sits "waiting" instead of force-taking
      // over the page. autoUpdate + skipWaiting + clientsClaim used to fire
      // an unconditional window.location.reload() on activation, which
      // browsers tend to deliver right as a backgrounded tab regains focus -
      // that was the app's "refreshes when I switch back to the tab" bug.
      // Do not revert this to autoUpdate without re-reading that history.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'Isesemind - Domine os Odu Ifá',
        short_name: 'Isesemind',
        description: 'Sistema de memorização dos Odu Ifá com ciência e gamificação',
        theme_color: '#8B5CF6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-192.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-192.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-192.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-192.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['education', 'productivity'],
        shortcuts: [
          {
            name: 'Estudar',
            short_name: 'Estudar',
            description: 'Iniciar uma sessão de estudo',
            url: '/caminho-ifa',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'Ver seu progresso',
            url: '/dashboard',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          }
        ]
      },
      devOptions: {
        // Disabled: an active SW in dev was masking the app's own HMR/reload
        // behavior. Flip back to true temporarily only when testing
        // install/offline behavior locally.
        enabled: false,
        type: 'module',
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB
        cleanupOutdatedCaches: true,
        // sw.js is the Lovable-era notification service worker (public/push-notifications-sw.js);
        // inject it into the generated worker instead of letting two files fight over the sw.js name.
        importScripts: ['push-notifications-sw.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-accordion',
            '@radix-ui/react-avatar',
            '@radix-ui/react-progress',
          ],
          'chart-vendor': ['recharts'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'editor-vendor': ['react-quill', 'turndown', 'react-markdown'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
}));
