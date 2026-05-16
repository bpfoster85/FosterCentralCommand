import { useState, useEffect, useCallback } from 'react'
import type { CalendarEvent } from '../types'
import * as calendarApi from '../api/calendar'
import { usePolling } from './usePolling'

const POLL_INTERVAL_MS = 60_000

export const useCalendar = (filterEmails?: string[]) => {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async (start?: string, end?: string, silent: boolean = false) => {
    try {
      if (!silent) setLoading(true)
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
      if (!silent) setError('Failed to load calendar events')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [filterEmails])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  usePolling(() => fetchEvents(undefined, undefined, true), POLL_INTERVAL_MS)

  const syncCalendar = async () => {
    await calendarApi.syncCalendar()
    await fetchEvents()
  }

  return { events, loading, error, fetchEvents, syncCalendar }
}
