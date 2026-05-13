import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // Background behind maskable icons (covers Android adaptive icon safe area).
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: {
        ...minimal2023Preset.maskable.resizeOptions,
        background: '#4a8b8b',
      },
    },
    // Background for the iOS apple-touch-icon (must be opaque).
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: {
        ...minimal2023Preset.apple.resizeOptions,
        background: '#4a8b8b',
      },
    },
  },
  images: ['public/pwa-icon-source.svg'],
})
