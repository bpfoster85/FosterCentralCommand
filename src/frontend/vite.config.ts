import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Foster Central Command',
        short_name: 'FCC',
        description: 'Family command center - calendar, lists, and more',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        display: 'fullscreen',
        orientation: 'any',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
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
