export interface Profile {
  id: string
  name: string
  email: string
  color: string
  avatarUrl?: string
  totalStars: number
  createdAt: string
  updatedAt: string
}

export interface CalendarEvent {
  id: string
  googleEventId: string
  title: string
  start: string
  end: string
  allDay: boolean
  description?: string
  location?: string
  attendeeEmails: string[]
  calendarId: string
  updatedAt: string
}

export interface ShoppingList {
  id: string
  title: string
  description?: string
  isFavorite: boolean
  createdByProfileId: string
  createdAt: string
  updatedAt: string
  itemCount?: number
  checkedCount?: number
}

export interface ListItem {
  id: string
  listId: string
  title: string
  description?: string
  isChecked: boolean
  startDate?: string
  endDate?: string
  attendeeProfileIds: string[]
  createdByProfileId: string
  createdAt: string
  updatedAt: string
}

export interface DashboardLayout {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

export interface DadsSwearJar {
  count: number
  updatedAt: string
}

export interface DashboardChecklistItem {
  id: string
  title: string
  logo: string
  checkedToday: boolean
  lastCompletedAtUtc?: string | null
}

export interface DashboardChecklist {
  items: DashboardChecklistItem[]
}

export interface DashboardChecklistDayMark {
  itemId: string
  logo: string
}

export interface DashboardChecklistCalendarMarks {
  dayMarks: Record<string, DashboardChecklistDayMark[]>
}

export interface Goal {
  id: string
  profileId: string
  title: string
  emoji: string
  starTarget: number
  starsApplied: number
  isAchieved: boolean
  createdAt: string
  updatedAt: string
}

export type ChoreRecurrence = 'None' | 'Daily' | 'EveryOtherDay' | 'Weekly'

export interface Chore {
  id: string
  title: string
  description?: string
  assignedProfileId: string
  starValue: number
  dueDate: string
  recurrence: ChoreRecurrence
  recurrenceDaysOfWeek: number[]
  recurrenceEndDate?: string | null
  completedDates: string[]
  approvedDates: string[]
  createdAt: string
  updatedAt: string
}

export type StarLedgerReason =
  | 'ChoreApproved'
  | 'ChoreUnapproved'
  | 'ChoreUncompleted'
  | 'GoalSpent'
  | 'CustomAward'
  | 'ManualAdjustment'

export type StarLedgerSourceType = 'Chore' | 'Goal' | 'Manual'

export interface StarLedgerEntry {
  id: string
  profileId: string
  profileName: string
  profileColor: string
  delta: number
  reason: StarLedgerReason
  sourceType: StarLedgerSourceType
  sourceId?: string | null
  sourceTitle: string
  occurrenceDate?: string | null
  note?: string | null
  createdAt: string
}
