import apiClient from './apiClient'
import type { CalendarEvent } from '../types'

export interface CreateCalendarEventInput {
  title: string
  start: string  // ISO 8601
  end: string    // ISO 8601
  allDay: boolean
  description?: string
  location?: string
  attendeeEmails?: string[]
}

export const getCalendarEvents = (params?: { start?: string; end?: string; profileEmails?: string[] }) =>
  apiClient.get<CalendarEvent[]>('/calendar/events', { params }).then(r => r.data)
export const syncCalendar = () => apiClient.post('/calendar/sync').then(r => r.data)
export const createCalendarEvent = (input: CreateCalendarEventInput) =>
  apiClient.post<CalendarEvent>('/calendar/events', input).then(r => r.data)
