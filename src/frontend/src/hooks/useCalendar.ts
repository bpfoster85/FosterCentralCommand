import { useState, useEffect, useCallback } from 'react'
import type { CalendarEvent } from '../types'
import * as calendarApi from '../api/calendar'

export const useCalendar = (filterEmails?: string[]) => {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async (start?: string, end?: string) => {
    try {
      setLoading(true)
      // Default window: 2 weeks back through 2 months forward. This matches
      // the backend sync window so the cache covers the whole range and the
      // UI can navigate without extra network calls.
      const DAY_MS = 24 * 60 * 60 * 1000
      const startDate = start || new Date(Date.now() - 14 * DAY_MS).toISOString()
      const endDate = end || new Date(Date.now() + 60 * DAY_MS).toISOString()
      
      const data = await calendarApi.getCalendarEvents({
        start: startDate,
        end: endDate,
        profileEmails: filterEmails && filterEmails.length > 0 ? filterEmails : undefined
      })
      setEvents(data)
      setError(null)
    } catch (err) {
      setError('Failed to load calendar events')
    } finally {
      setLoading(false)
    }
  }, [filterEmails])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const syncCalendar = async () => {
    await calendarApi.syncCalendar()
    await fetchEvents()
  }

  return { events, loading, error, fetchEvents, syncCalendar }
}
