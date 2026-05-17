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
