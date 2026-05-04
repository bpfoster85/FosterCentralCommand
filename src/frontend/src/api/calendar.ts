import apiClient from './apiClient'
import { CalendarEvent } from '../types'

export const getCalendarEvents = (params?: { start?: string; end?: string; profileEmails?: string[] }) =>
  apiClient.get<CalendarEvent[]>('/calendar/events', { params }).then(r => r.data)
export const syncCalendar = () => apiClient.post('/calendar/sync').then(r => r.data)
