import { useState, useEffect, useCallback } from 'react'
import { CalendarEvent } from '../types'
import * as calendarApi from '../api/calendar'

export const useCalendar = (filterEmails?: string[]) => {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async (start?: string, end?: string) => {
    try {
      setLoading(true)
      const data = await calendarApi.getCalendarEvents({
        start,
        end,
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
