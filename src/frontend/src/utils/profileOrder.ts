import type { Profile } from '../types'

const CHORES_PROFILE_ORDER = ['ellinor', 'emrey', 'quinton', 'sarah', 'bryan']

/**
 * Stable sort that places known family members in the configured order for
 * chores displays. Unknown names sort after, alphabetically.
 */
export const sortProfilesForChores = (profiles: Profile[]): Profile[] => {
  const rank = (p: Profile): number => {
    const idx = CHORES_PROFILE_ORDER.indexOf(p.name.trim().toLowerCase())
    return idx === -1 ? CHORES_PROFILE_ORDER.length : idx
  }
  return [...profiles].sort((a, b) => {
    const diff = rank(a) - rank(b)
    if (diff !== 0) return diff
    return a.name.localeCompare(b.name)
  })
}
