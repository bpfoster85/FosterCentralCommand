const LUMINANCE_R_WEIGHT = 0.299
const LUMINANCE_G_WEIGHT = 0.587
const LUMINANCE_B_WEIGHT = 0.114
const LUMINANCE_THRESHOLD = 0.6

export const LIGHT_TEXT_COLOR = '#ffffff'
export const DARK_TEXT_COLOR = '#2c3e3e'

export const getContrastText = (hex: string): string => {
  const m = hex.replace('#', '')
  if (m.length !== 6) return LIGHT_TEXT_COLOR
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  const luminance = (LUMINANCE_R_WEIGHT * r + LUMINANCE_G_WEIGHT * g + LUMINANCE_B_WEIGHT * b) / 255
  return luminance > LUMINANCE_THRESHOLD ? DARK_TEXT_COLOR : LIGHT_TEXT_COLOR
}

export const getProfileAvatarOverlay = (textColor: string): string =>
  textColor === LIGHT_TEXT_COLOR ? 'rgba(255,255,255,0.25)' : 'rgba(44,62,62,0.18)'

// Pick a readable text color (black/white) for a background composed of several
// colors (e.g. striped multi-profile events) by averaging their luminance.
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/
export const getContrastTextForColors = (hexes: string[]): string => {
  const valid = hexes.filter(h => HEX_COLOR_RE.test(h))
  if (valid.length === 0) return LIGHT_TEXT_COLOR
  let luminanceSum = 0
  for (const hex of valid) {
    const m = hex.replace('#', '')
    const r = parseInt(m.slice(0, 2), 16)
    const g = parseInt(m.slice(2, 4), 16)
    const b = parseInt(m.slice(4, 6), 16)
    luminanceSum += (LUMINANCE_R_WEIGHT * r + LUMINANCE_G_WEIGHT * g + LUMINANCE_B_WEIGHT * b) / 255
  }
  return luminanceSum / valid.length > LUMINANCE_THRESHOLD ? DARK_TEXT_COLOR : LIGHT_TEXT_COLOR
}

// Build a repeating diagonal-stripe background cycling through the given colors.
// Used to flag calendar events that belong to multiple profiles at a glance.
// A single color returns a solid fill; an empty list returns an empty string.
export const buildStripedBackground = (colors: string[], stripeWidth = 16): string => {
  const valid = colors.filter(Boolean)
  if (valid.length === 0) return ''
  if (valid.length === 1) return valid[0]
  const stops = valid
    .map((color, i) => `${color} ${i * stripeWidth}px, ${color} ${(i + 1) * stripeWidth}px`)
    .join(', ')
  return `repeating-linear-gradient(135deg, ${stops})`
}
