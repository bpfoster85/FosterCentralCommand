import React, { useRef, useState } from 'react'
import { Button } from 'primereact/button'
import { ProgressBar } from 'primereact/progressbar'
import { useProfiles } from '../hooks/useProfiles'
import { useChores } from '../hooks/useChores'
import { useSwipe } from '../hooks/useSwipe'
import ChoresDayView from '../components/chores/ChoresDayView'
import MobileProfilePicker from '../components/profiles/MobileProfilePicker'
import type { Chore, Profile } from '../types'
import { addDays, toDateKey } from '../utils/choreSchedule'

const DAY_LABEL_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}

const startOfDay = (d: Date): Date => {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const ChoresPage: React.FC = () => {
  const { profiles, loading: profilesLoading, refetch: refetchProfiles } = useProfiles()
  const { chores, loading: choresLoading, toggleCompleteOnDate } = useChores()

  const [day, setDay] = useState<Date>(() => startOfDay(new Date()))
  const [profileFilter, setProfileFilter] = useState<string | null>(null) // null = all

  const swipeRef = useRef<HTMLDivElement>(null)
  useSwipe(swipeRef, {
    onSwipeLeft: () => setDay(prev => addDays(prev, 1)),
    onSwipeRight: () => setDay(prev => addDays(prev, -1)),
  })

  const isToday = isSameDay(day, new Date())

  const visibleProfiles: Profile[] = profileFilter
    ? profiles.filter(p => p.id === profileFilter)
    : profiles

  const handleToggle = async (chore: Chore, date: Date) => {
    await toggleCompleteOnDate(chore.id, toDateKey(date))
    refetchProfiles()
  }

  return (
    <div ref={swipeRef} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '1rem', touchAction: 'pan-y' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>Chores</span>

        {/* Day navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.5rem' }}>
          <Button
            icon="pi pi-chevron-left"
            className="p-button-text p-button-sm p-button-rounded"
            onClick={() => setDay(addDays(day, -1))}
            aria-label="Previous day"
          />
          <Button
            label="Today"
            className={`p-button-sm ${isToday ? '' : 'p-button-text'}`}
            onClick={() => setDay(startOfDay(new Date()))}
          />
          <Button
            icon="pi pi-chevron-right"
            className="p-button-text p-button-sm p-button-rounded"
            onClick={() => setDay(addDays(day, 1))}
            aria-label="Next day"
          />
          <span
            style={{
              marginLeft: '0.5rem',
              fontSize: '0.95rem',
              color: 'var(--sky-text-secondary)',
              fontWeight: 500,
            }}
          >
            {day.toLocaleDateString(undefined, DAY_LABEL_FORMAT)}
          </span>
        </div>
      </div>

      {/* Profile filter pills */}
      {profiles.length > 0 && (
        <>
          {/* Mobile: inline collapsible picker */}
          <div className="sky-profile-filter-select" style={{ marginBottom: '1rem' }}>
            <MobileProfilePicker
              profiles={profiles}
              value={profileFilter}
              onChange={setProfileFilter}
            />
          </div>

          {/* Desktop: pill row */}
          <div className="sky-profile-filter sky-profile-filter-pills" style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              className="sky-profile-pill"
              onClick={() => setProfileFilter(null)}
              style={{
                background: profileFilter === null ? 'var(--sky-amber)' : undefined,
                color: profileFilter === null ? '#fff' : undefined,
                borderColor: profileFilter === null ? 'var(--sky-amber)' : undefined,
                fontWeight: 700,
              }}
            >
              <span>All</span>
            </button>
            {profiles.map(p => {
              const active = p.id === profileFilter
              return (
                <button
                  key={p.id}
                  type="button"
                  className="sky-profile-pill"
                  onClick={() => setProfileFilter(p.id)}
                  style={{
                    background: active ? p.color : undefined,
                    color: active ? '#fff' : undefined,
                    borderColor: active ? p.color : undefined,
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: active ? 'rgba(255,255,255,0.25)' : p.color,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span>{p.name}</span>
                  <span style={{ fontSize: '1.05rem', opacity: 0.9, marginLeft: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    <i className="pi pi-star-fill" style={{ fontSize: '1.05rem', color: active ? '#fff' : 'var(--sky-amber)' }} />
                    <span style={{ fontSize: '0.95rem' }}>{p.totalStars ?? 0}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Loading or empty state */}
      {profilesLoading ? (
        <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
      ) : profiles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--sky-text-secondary)' }}>
          <i className="pi pi-users" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }} />
          <p>No profiles yet. Add a family member first to assign chores.</p>
        </div>
      ) : (
        <div className="scroll-container" style={{ flex: 1 }}>
          {/* Day view */}
          <section>
            {choresLoading ? (
              <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
            ) : (
              <ChoresDayView
                date={day}
                chores={chores}
                profiles={visibleProfiles}
                onToggleComplete={handleToggle}
              />
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default ChoresPage
