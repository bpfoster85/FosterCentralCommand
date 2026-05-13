// Generates PWA icon PNGs from public/pwa-icon-source.svg using @resvg/resvg-js.
// Sharp does not have a working native or wasm build on win32-arm64, so we use
// resvg-js (Rust + prebuilt binaries) for rendering.
//
// Outputs (in public/):
//   - favicon.ico               (32x32 transparent — written as PNG bytes; modern browsers accept PNG-in-ICO)
//   - pwa-64x64.png             (transparent)
//   - pwa-192x192.png           (transparent)
//   - pwa-512x512.png           (transparent — used for `any`)
//   - maskable-icon-512x512.png (teal background, 80% safe area)
//   - apple-touch-icon-180x180.png (teal background, no transparency — iOS rule)
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const srcSvg = readFileSync(resolve(root, 'public', 'pwa-icon-source.svg'), 'utf8')

const SAFE_BG = '#4a8b8b' // matches manifest theme_color (sky-lagoon-deep)

/**
 * Render the source SVG at a given pixel size, optionally with an opaque
 * background (required for apple-touch-icon and maskable icons).
 */
function render(size, { background } = {}) {
  const opts = {
    fitTo: { mode: 'width', value: size },
    background, // undefined => transparent
    font: { loadSystemFonts: true },
  }
  const resvg = new Resvg(srcSvg, opts)
  return resvg.render().asPng()
}

/**
 * For maskable icons: inset the source so it sits inside the 80% safe area
 * (Android may crop the outer 10% on each edge), then add the solid bg.
 */
function renderMaskable(size) {
  const safe = Math.round(size * 0.8)
  const inner = render(safe, { background: undefined })
  // Compose: paint a solid square, place the inner PNG centered.
  // resvg-js outputs raw PNG, so we use a wrapper SVG to do the compositing.
  const innerB64 = inner.toString('base64')
  const composite = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="${SAFE_BG}" />
    <image x="${(size - safe) / 2}" y="${(size - safe) / 2}" width="${safe}" height="${safe}"
           href="data:image/png;base64,${innerB64}" />
  </svg>`
  const resvg = new Resvg(composite, { fitTo: { mode: 'width', value: size } })
  return resvg.render().asPng()
}

const targets = [
  { file: 'pwa-64x64.png', buf: render(64) },
  { file: 'pwa-192x192.png', buf: render(192) },
  { file: 'pwa-512x512.png', buf: render(512) },
  { file: 'apple-touch-icon-180x180.png', buf: render(180, { background: SAFE_BG }) },
  { file: 'maskable-icon-512x512.png', buf: renderMaskable(512) },
  // Convenience aliases for older browsers / iOS variants.
  { file: 'apple-touch-icon.png', buf: render(180, { background: SAFE_BG }) },
  { file: 'favicon-32x32.png', buf: render(32) },
]

for (const t of targets) {
  const out = resolve(root, 'public', t.file)
  writeFileSync(out, t.buf)
  console.log(`wrote ${t.file} (${t.buf.length} bytes)`)
}
