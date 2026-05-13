import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon-180x180.png',
        'pwa-64x64.png',
      ],
      manifest: {
        id: '/',
        name: 'Foster Central Command',
        short_name: 'FCC Admin',
        description: 'Family command center — calendar, lists, chores, profiles.',
        start_url: '/admin',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#4a8b8b',
        background_color: '#faf8f3',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Don't precache the bare HTML — the SW navigation fallback handles
        // SPA routing, and we don't want a stale cache after deploys.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/[^/]+\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fcc-api',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Enable the service worker in `npm run dev` so PWA features can be
        // tested locally without a production build.
        enabled: true,
        type: 'module',
      },
    }),
  ],
  optimizeDeps: {
    include: [
      '@fullcalendar/core',
      '@fullcalendar/daygrid',
      '@fullcalendar/timegrid',
      '@fullcalendar/list',
      '@fullcalendar/interaction',
      '@fullcalendar/google-calendar',
      '@fullcalendar/react',
    ]
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5076',
        changeOrigin: true
      }
    }
  }
})
