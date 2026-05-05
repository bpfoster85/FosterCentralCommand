import React, { useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { useCalendar } from '../../hooks/useCalendar'
import { useSwipe } from '../../hooks/useSwipe'
import { createCalendarEvent } from '../../api/calendar'
import type { CalendarEvent, Profile } from '../../types'

interface CalendarWidgetProps {
  profiles: Profile[]
}

type ViewMode = 'week' | 'month' | 'day'

// ---- Date helpers -----------------------------------------------------------
const startOfDay = (d: Date) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
const endOfDay = (d: Date) => {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}
const addDays = (d: Date, days: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}
const startOfWeek = (d: Date) => {
  // Week starts Sunday
  const x = startOfDay(d)
  x.setDate(x.getDate() - x.getDay())
  return x
}
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const DAY_NAME = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const MONTH_DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const TIME_FMT = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

// Format a Date as the local "YYYY-MM-DDTHH:mm" value expected by
// <input type="datetime-local"> (no timezone suffix, no seconds).
const toLocalInputValue = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface CreateEventForm {
  title: string
  start: string   // datetime-local (local time)
  end: string     // datetime-local (local time)
  allDay: boolean
  location: string
  description: string
}

const buildDefaultCreateForm = (anchor: Date): CreateEventForm => {
  const start = new Date(anchor)
  start.setHours(9, 0, 0, 0)
  const end = new Date(start)
  end.setHours(10, 0, 0, 0)
  return {
    title: '',
    start: toLocalInputValue(start),
    end: toLocalInputValue(end),
    allDay: false,
    location: '',
    description: '',
  }
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ profiles }) => {
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([])
  const [eventDetail, setEventDetail] = useState<any>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateEventForm>(() => buildDefaultCreateForm(new Date()))
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const calendarRef = useRef<FullCalendar>(null)
  const swipeContainerRef = useRef<HTMLDivElement>(null)

  const { events, loading, syncCalendar, fetchEvents } = useCalendar()

  // Auto-sync on mount, on window focus, and every 5 minutes. The backend
  // sync hits Google Calendar; results are cached, so frequent calls are cheap
  // for clients (we just refresh the cache periodically).
  const syncRef = useRef(syncCalendar)
  useEffect(() => { syncRef.current = syncCalendar }, [syncCalendar])
  useEffect(() => {
    let cancelled = false
    const run = () => {
      if (cancelled) return
      void syncRef.current()
    }
    run()
    const interval = window.setInterval(run, 5 * 60 * 1000)
    const onFocus = () => run()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  // Navigation between weeks/months/days is satisfied entirely from the
  // already-loaded events (-2w through +2m). No per-navigation fetch needed.

  const toggleProfile = (id: string) => {
    setSelectedProfileIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // Match event titles against profile names (case-insensitive, whole-word).
  const findProfileMatch = useMemo(() => {
    const patterns = profiles
      .filter(p => p.name)
      .map(p => ({
        profile: p,
        regex: new RegExp(`\\b${p.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`),
      }))
    return (title: string): Profile | undefined => {
      if (!title) return undefined
      const lower = title.toLowerCase()
      return patterns.find(({ regex }) => regex.test(lower))?.profile
    }
  }, [profiles])

  // Compute a readable text color (black/white) for a given hex background.
  const getContrastText = (hex: string): string => {
    const m = hex.replace('#', '')
    if (m.length !== 6) return '#ffffff'
    const r = parseInt(m.slice(0, 2), 16)
    const g = parseInt(m.slice(2, 4), 16)
    const b = parseInt(m.slice(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.6 ? '#2c3e3e' : '#ffffff'
  }

  // Per-profile event counts (and unmatched count).
  const { countsByProfileId, totalCount } = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of events) {
      const matched = findProfileMatch(e.title)
      if (matched) counts[matched.id] = (counts[matched.id] || 0) + 1
    }
    return { countsByProfileId: counts, totalCount: events.length }
  }, [events, findProfileMatch])

  // Apply selected-profile filter client-side (multi-select; empty = show all).
  const visibleEvents = useMemo(
    () => (selectedProfileIds.length === 0
      ? events
      : events.filter(e => {
          const matched = findProfileMatch(e.title)
          return matched ? selectedProfileIds.includes(matched.id) : false
        })),
    [events, selectedProfileIds, findProfileMatch]
  )

  // Bucket events by day for the current week (only used in week view).
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const eventsByDay = useMemo(() => {
    const buckets: CalendarEvent[][] = weekDays.map(() => [])
    for (const e of visibleEvents) {
      const evStart = new Date(e.start)
      const evEnd = e.end ? new Date(e.end) : evStart
      weekDays.forEach((day, i) => {
        const dayStart = startOfDay(day)
        const dayEnd = endOfDay(day)
        // Event overlaps this day if its end is after dayStart and start is before dayEnd
        if (evEnd >= dayStart && evStart <= dayEnd) {
          buckets[i].push(e)
        }
      })
    }
    // Sort each day chronologically
    for (const bucket of buckets) {
      bucket.sort((a, b) => +new Date(a.start) - +new Date(b.start))
    }
    return buckets
  }, [visibleEvents, weekDays])

  const calendarEvents = visibleEvents.map(e => {
    const matchedProfile = findProfileMatch(e.title)
    return {
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      allDay: e.allDay,
      backgroundColor: matchedProfile?.color,
      borderColor: matchedProfile?.color,
      textColor: matchedProfile ? getContrastText(matchedProfile.color) : undefined,
      extendedProps: {
        description: e.description,
        location: e.location,
        attendees: e.attendeeEmails,
        matchedProfileName: matchedProfile?.name,
        matchedProfileColor: matchedProfile?.color,
      },
    }
  })

  // Open the event detail dialog using the same shape FullCalendar provides.
  const openEventDetail = (e: CalendarEvent) => {
    const matchedProfile = findProfileMatch(e.title)
    setEventDetail({
      title: e.title,
      start: e.start,
      end: e.end,
      extendedProps: {
        description: e.description,
        location: e.location,
        attendees: e.attendeeEmails,
        matchedProfileName: matchedProfile?.name,
        matchedProfileColor: matchedProfile?.color,
      },
    })
  }

  const goPrevWeek = () => setWeekStart(prev => addDays(prev, -7))
  const goNextWeek = () => setWeekStart(prev => addDays(prev, 7))
  const goToday = () => setWeekStart(startOfWeek(new Date()))

  // Navigate based on the current view mode. In week view we move our own
  // weekStart; in month/day views FullCalendar owns the date so we delegate
  // to its imperative API.
  const navigatePrev = () => {
    if (viewMode === 'week') {
      goPrevWeek()
    } else {
      calendarRef.current?.getApi().prev()
    }
  }
  const navigateNext = () => {
    if (viewMode === 'week') {
      goNextWeek()
    } else {
      calendarRef.current?.getApi().next()
    }
  }

  // Wire horizontal swipe gestures to date navigation. Disabled while a modal
  // is open so the gesture doesn't fight with form interactions.
  useSwipe(swipeContainerRef, {
    disabled: createOpen || !!eventDetail,
    onSwipeLeft: navigateNext,
    onSwipeRight: navigatePrev,
  })

  const weekRangeLabel = `${MONTH_DAY.format(weekStart)} – ${MONTH_DAY.format(addDays(weekStart, 6))}`

  const submitCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (createSaving) return
    setCreateError(null)

    if (!createForm.title.trim()) {
      setCreateError('Title is required.')
      return
    }
    const startDate = new Date(createForm.start)
    const endDate = new Date(createForm.end)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setCreateError('Please enter valid start and end dates.')
      return
    }
    if (endDate < startDate) {
      setCreateError('End must be after start.')
      return
    }

    setCreateSaving(true)
    try {
      await createCalendarEvent({
        title: createForm.title.trim(),
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        allDay: createForm.allDay,
        description: createForm.description.trim() || undefined,
        location: createForm.location.trim() || undefined,
      })
      setCreateOpen(false)
      // Refresh the full window (-2w → +2m) so the new event appears
      await fetchEvents()
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message
      setCreateError(apiMessage || 'Failed to create event. Please try again.')
    } finally {
      setCreateSaving(false)
    }
  }

  return (
    <div ref={swipeContainerRef} style={{ height: '100%', display: 'flex', flexDirection: 'column', touchAction: 'pan-y' }}>
      {/* Header — profile filter + actions on a single row */}
      <div className="sky-widget-header">
        {/* Profile filter pills (multi-select) */}
        <div className="sky-profile-filter" role="group" aria-label="Filter by profile">
          <button
            type="button"
            aria-pressed={selectedProfileIds.length === 0}
            className={`sky-profile-pill ${selectedProfileIds.length === 0 ? 'active' : ''}`}
            onClick={() => setSelectedProfileIds([])}
          >
            <span>All</span>
            <span className="sky-profile-pill-count">{totalCount}</span>
          </button>
          {profiles.map(p => {
            const isActive = selectedProfileIds.includes(p.id)
            const count = countsByProfileId[p.id] || 0
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={isActive}
                className={`sky-profile-pill ${isActive ? 'active' : ''}`}
                onClick={() => toggleProfile(p.id)}
                style={
                  isActive
                    ? ({
                        background: p.color,
                        color: getContrastText(p.color),
                        borderColor: p.color,
                      } as React.CSSProperties)
                    : undefined
                }
              >
                <span
                  className="sky-profile-pill-dot"
                  style={{ background: p.color }}
                />
                <span>{p.name}</span>
                <span className="sky-profile-pill-count">{count}</span>
                {isActive && (
                  <i className="pi pi-check sky-profile-pill-check" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>

        {/* Inline actions */}
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', marginLeft: 'auto', flexShrink: 0 }}>
          {/* View-mode switch */}
          <div className="sky-view-switch" role="group" aria-label="Calendar view">
            {(['week', 'month', 'day'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                className={`sky-view-switch-btn ${viewMode === mode ? 'active' : ''}`}
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          {loading && (
            <i
              className="pi pi-spin pi-spinner"
              style={{ fontSize: '0.85rem', color: 'var(--sky-text-secondary)' }}
              aria-label="Syncing calendar"
            />
          )}
        </div>
      </div>

      {/* Calendar body */}
      {viewMode === 'week' ? (
        <div className="sky-week-grid">
          {weekDays.map((day, idx) => {
            const dayEvents = eventsByDay[idx]
            const today = isSameDay(day, new Date())
            return (
              <div
                key={day.toISOString()}
                className={`sky-day-tile ${today ? 'today' : ''}`}
              >
                <div className="sky-day-tile-header">
                  <span className="sky-day-tile-name">{DAY_NAME.format(day)}</span>
                  <span className="sky-day-tile-num">{day.getDate()}</span>
                </div>
                <div className="sky-day-tile-body">
                  {dayEvents.length === 0 ? (
                    <div className="sky-day-tile-empty">No events</div>
                  ) : (
                    dayEvents.map(e => {
                      const matched = findProfileMatch(e.title)
                      const color = matched?.color || 'var(--sky-lagoon-deep)'
                      return (
                        <button
                          key={e.id + day.toISOString()}
                          type="button"
                          className="sky-day-event"
                          style={{
                            borderLeftColor: color,
                            background: `${color}14`, // ~8% opacity
                          }}
                          onClick={() => openEventDetail(e)}
                        >
                          <div className="sky-day-event-time">
                            {e.allDay
                              ? 'All day'
                              : (() => {
                                  const startStr = TIME_FMT.format(new Date(e.start))
                                  if (!e.end) return startStr
                                  const endStr = TIME_FMT.format(new Date(e.end))
                                  return endStr === startStr ? startStr : `${startStr} – ${endStr}`
                                })()}
                          </div>
                          <div className="sky-day-event-title">{e.title}</div>
                          {e.location && (
                            <div className="sky-day-event-meta">
                              <i className="pi pi-map-marker" />
                              <span>{e.location}</span>
                            </div>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}

          {/* 8th tile — week navigation */}
          <div className="sky-day-tile sky-control-tile">
            <div className="sky-control-tile-range">{weekRangeLabel}</div>
            <div className="sky-control-tile-nav">
              <Button
                icon="pi pi-chevron-left"
                className="p-button-text p-button-rounded p-button-sm"
                onClick={goPrevWeek}
                tooltip="Previous week"
                tooltipOptions={{ position: 'bottom' }}
              />
              <Button
                label="Today"
                className="p-button-sm p-button-secondary"
                onClick={goToday}
              />
              <Button
                icon="pi pi-chevron-right"
                className="p-button-text p-button-rounded p-button-sm"
                onClick={goNextWeek}
                tooltip="Next week"
                tooltipOptions={{ position: 'bottom' }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', padding: '0.75rem' }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView={viewMode === 'month' ? 'dayGridMonth' : 'timeGridDay'}
            key={viewMode /* force remount on view change */}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: ''
            }}
            buttonText={{ today: 'Today' }}
            events={calendarEvents}
            height="100%"
            expandRows
            nowIndicator
            eventDisplay="block"
            displayEventTime
            displayEventEnd
            slotEventOverlap={false}
            slotMinTime="06:00:00"
            slotMaxTime="23:00:00"
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            slotLabelFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
            allDaySlot
            dayMaxEvents={3}
            eventMinHeight={56}
            eventShortHeight={56}
            eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
            scrollTime="07:00:00"
            eventClick={info => setEventDetail(info.event)}
          />
        </div>
      )}

      {/* Event Detail Dialog */}
      <Dialog
        visible={!!eventDetail}
        onHide={() => setEventDetail(null)}
        style={{ width: '90vw', maxWidth: '500px' }}
        showHeader={false}
        contentStyle={{ padding: 0 }}
      >
        {eventDetail && (() => {
          const headerColor: string | undefined = eventDetail.extendedProps?.matchedProfileColor
          const headerTextColor = headerColor ? getContrastText(headerColor) : 'var(--sky-text-primary)'
          const headerBg = headerColor || 'var(--sky-surface-soft)'
          return (
            <>
              {/* Custom colored header */}
              <div
                style={{
                  background: headerBg,
                  color: headerTextColor,
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {eventDetail.extendedProps?.matchedProfileName && (
                    <div
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        opacity: 0.85,
                        marginBottom: '0.35rem',
                      }}
                    >
                      {eventDetail.extendedProps.matchedProfileName}
                    </div>
                  )}
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '1.2rem',
                      fontWeight: 600,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.3,
                      color: headerTextColor,
                    }}
                  >
                    {eventDetail.title}
                  </h3>
                </div>
                <Button
                  icon="pi pi-times"
                  className="p-button-text p-button-rounded p-button-sm"
                  style={{ color: headerTextColor, flexShrink: 0 }}
                  onClick={() => setEventDetail(null)}
                  aria-label="Close"
                />
              </div>

              {/* Body */}
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <strong style={{ color: 'var(--sky-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>When</strong>
                  <p style={{ margin: '0.3rem 0 0 0' }}>
                    {new Date(eventDetail.start).toLocaleString()}
                    {eventDetail.end && (
                      <>
                        {' '}<span style={{ color: 'var(--sky-text-secondary)' }}>→</span>{' '}
                        {new Date(eventDetail.end).toLocaleString()}
                      </>
                    )}
                  </p>
                </div>

                {eventDetail.extendedProps.location && (
                  <div>
                    <strong style={{ color: 'var(--sky-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Location</strong>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventDetail.extendedProps.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sky-event-location"
                    >
                      <i className="pi pi-map-marker" />
                      <span>{eventDetail.extendedProps.location}</span>
                      <i className="pi pi-external-link sky-event-location-ext" />
                    </a>
                  </div>
                )}

                {eventDetail.extendedProps.description && (
                  <div>
                    <strong style={{ color: 'var(--sky-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</strong>
                    <div
                      style={{
                        margin: '0.3rem 0 0 0',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        lineHeight: 1.5,
                      }}
                      dangerouslySetInnerHTML={{ __html: eventDetail.extendedProps.description }}
                    />
                  </div>
                )}

                {eventDetail.extendedProps.attendees?.length > 0 && (
                  <div>
                    <strong style={{ color: 'var(--sky-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Attendees</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                      {eventDetail.extendedProps.attendees.map((email: string) => (
                        <span key={email} className="sky-person-chip">{email}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )
        })()}
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog
        visible={createOpen}
        onHide={() => !createSaving && setCreateOpen(false)}
        style={{ width: '90vw', maxWidth: '500px' }}
        showHeader={false}
        contentStyle={{ padding: 0 }}
        dismissableMask={!createSaving}
      >
        <form onSubmit={submitCreateEvent} className="sky-create-form">
          <div className="sky-create-form-header">
            <div>
              <div className="sky-create-form-overline">New Event</div>
              <h3 className="sky-create-form-title">Add to calendar</h3>
            </div>
            <Button
              type="button"
              icon="pi pi-times"
              className="p-button-text p-button-rounded p-button-sm"
              onClick={() => !createSaving && setCreateOpen(false)}
              aria-label="Close"
            />
          </div>

          <div className="sky-create-form-body">
            <label className="sky-field">
              <span className="sky-field-label">Title</span>
              <input
                type="text"
                className="sky-input"
                value={createForm.title}
                onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Soccer practice"
                autoFocus
                required
              />
            </label>

            <label className="sky-field sky-field-inline">
              <input
                type="checkbox"
                checked={createForm.allDay}
                onChange={e => setCreateForm(f => ({ ...f, allDay: e.target.checked }))}
              />
              <span>All day</span>
            </label>

            <div className="sky-field-row">
              <label className="sky-field">
                <span className="sky-field-label">Starts</span>
                <input
                  type={createForm.allDay ? 'date' : 'datetime-local'}
                  className="sky-input"
                  value={createForm.allDay ? createForm.start.slice(0, 10) : createForm.start}
                  onChange={e => {
                    const value = createForm.allDay ? `${e.target.value}T00:00` : e.target.value
                    setCreateForm(f => ({ ...f, start: value }))
                  }}
                  required
                />
              </label>
              <label className="sky-field">
                <span className="sky-field-label">Ends</span>
                <input
                  type={createForm.allDay ? 'date' : 'datetime-local'}
                  className="sky-input"
                  value={createForm.allDay ? createForm.end.slice(0, 10) : createForm.end}
                  onChange={e => {
                    const value = createForm.allDay ? `${e.target.value}T00:00` : e.target.value
                    setCreateForm(f => ({ ...f, end: value }))
                  }}
                  required
                />
              </label>
            </div>

            <label className="sky-field">
              <span className="sky-field-label">Location</span>
              <input
                type="text"
                className="sky-input"
                value={createForm.location}
                onChange={e => setCreateForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Optional"
              />
            </label>

            <label className="sky-field">
              <span className="sky-field-label">Description</span>
              <textarea
                className="sky-input sky-textarea"
                rows={3}
                value={createForm.description}
                onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional"
              />
            </label>

            {createError && <div className="sky-form-error">{createError}</div>}
          </div>

          <div className="sky-create-form-footer">
            <Button
              type="button"
              label="Cancel"
              className="p-button-text"
              onClick={() => setCreateOpen(false)}
              disabled={createSaving}
            />
            <Button
              type="submit"
              label="Create"
              icon="pi pi-check"
              loading={createSaving}
            />
          </div>
        </form>
      </Dialog>
    </div>
  )
}

export default CalendarWidget
