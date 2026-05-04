export interface Profile {
  id: string
  name: string
  email: string
  color: string
  avatarUrl?: string
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
