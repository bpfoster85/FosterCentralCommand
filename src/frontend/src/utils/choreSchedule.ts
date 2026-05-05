import type { Chore } from '../types'

/** Returns "yyyy-MM-dd" for the given date in *local* time (no timezone shifts). */
export const toDateKey = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parses a "yyyy-MM-dd" string (or full ISO) into a local-midnight Date. */
export const fromDateKey = (key: string): Date => {
  const datePart = key.length >= 10 ? key.slice(0, 10) : key
  const [y, m, d] = datePart.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** True if two dates fall on the same calendar day in local time. */
export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

/** Start of week (Sunday) for the given date in local time. */
export const startOfWeek = (d: Date): Date => {
  const result = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  result.setDate(result.getDate() - result.getDay())
  return result
}

/** Returns 7 consecutive days starting at the given date. */
export const buildWeek = (start: Date): Date[] => {
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    days.push(d)
  }
  return days
}

export const addDays = (d: Date, n: number): Date => {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  r.setDate(r.getDate() + n)
  return r
}

/**
 * Determines whether a chore has an occurrence on the given local date.
 *  - None:           occurrence iff date == dueDate
 *  - Daily:          occurrence iff dueDate <= date <= recurrenceEndDate (or open)
 *  - EveryOtherDay:  occurrence iff (date - dueDate) is an even number of days, within range
 *  - Weekly:         occurrence iff date's dayOfWeek is in recurrenceDaysOfWeek and within range
 */
export const choreOccursOn = (chore: Chore, date: Date): boolean => {
  const due = fromDateKey(chore.dueDate)
  const end = chore.recurrenceEndDate ? fromDateKey(chore.recurrenceEndDate) : null
  // Strip time portions for comparison (already date-only, but be defensive).
  const dKey = toDateKey(date)
  const dueKey = toDateKey(due)
  const endKey = end ? toDateKey(end) : null

  if (chore.recurrence === 'None') {
    return dKey === dueKey
  }

  if (dKey < dueKey) return false
  if (endKey && dKey > endKey) return false

  if (chore.recurrence === 'Daily') return true

  if (chore.recurrence === 'EveryOtherDay') {
    const dayMs = 1000 * 60 * 60 * 24
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    const start = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()
    const diffDays = Math.round((target - start) / dayMs)
    return diffDays >= 0 && diffDays % 2 === 0
  }

  if (chore.recurrence === 'Weekly') {
    return chore.recurrenceDaysOfWeek.includes(date.getDay())
  }

  return false
}

export const isChoreCompletedOn = (chore: Chore, date: Date): boolean =>
  chore.completedDates.includes(toDateKey(date))

export const isChoreApprovedOn = (chore: Chore, date: Date): boolean =>
  chore.approvedDates.includes(toDateKey(date))

/** A completed-but-not-yet-approved occurrence is "pending". */
export const isChorePendingOn = (chore: Chore, date: Date): boolean => {
  const key = toDateKey(date)
  return chore.completedDates.includes(key) && !chore.approvedDates.includes(key)
}

export const DAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_LABELS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
