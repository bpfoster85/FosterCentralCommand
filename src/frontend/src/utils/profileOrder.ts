import type { Profile } from '../types'

const CHORES_PROFILE_ORDER = ['ellinor', 'emrey', 'quinton', 'sarah', 'bryan']
const CHORES_HIDDEN_PROFILES = new Set(['sarah', 'bryan'])

export const isHiddenChoreProfile = (name: string): boolean =>
  CHORES_HIDDEN_PROFILES.has(name.trim().toLowerCase())

/**
 * Stable sort that places known family members in the configured order for
 * chores displays. Hidden parent profiles (Sarah, Bryan) are filtered out.
 * Unknown names sort after, alphabetically.
 */
export const sortProfilesForChores = (profiles: Profile[]): Profile[] => {
  const rank = (p: Profile): number => {
    const idx = CHORES_PROFILE_ORDER.indexOf(p.name.trim().toLowerCase())
    return idx === -1 ? CHORES_PROFILE_ORDER.length : idx
  }
  return profiles
    .filter(p => !isHiddenChoreProfile(p.name))
    .sort((a, b) => {
      const diff = rank(a) - rank(b)
      if (diff !== 0) return diff
      return a.name.localeCompare(b.name)
    })
}
