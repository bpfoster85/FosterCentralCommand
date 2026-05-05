import React, { useMemo } from 'react'
import { Checkbox } from 'primereact/checkbox'
import type { Chore, Profile } from '../../types'
import {
  DAY_LABELS_SHORT,
  buildWeek,
  choreOccursOn,
  isChoreApprovedOn,
  isChoreCompletedOn,
  isChorePendingOn,
  isSameDay,
  toDateKey,
} from '../../utils/choreSchedule'

interface ChoresWeekViewProps {
  weekStart: Date
  chores: Chore[]
  profiles: Profile[]
  groupBy: 'profile' | 'day'
  onToggleComplete: (chore: Chore, date: Date) => void
  onEditChore?: (chore: Chore) => void
}

interface DayColumnProps {
  date: Date
  chores: Chore[]
  profiles: Profile[]
  onToggleComplete: (chore: Chore, date: Date) => void
  onEditChore?: (chore: Chore) => void
  showProfileName?: boolean
}

const DayColumn: React.FC<DayColumnProps> = ({ date, chores, profiles, onToggleComplete, onEditChore, showProfileName }) => {
  const today = isSameDay(date, new Date())
  const dayLabel = DAY_LABELS_SHORT[date.getDay()]
  const dayNum = date.getDate()

  const occurrences = chores.filter(c => choreOccursOn(c, date))

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        background: today ? 'var(--sky-surface-soft, rgba(160, 200, 220, 0.08))' : undefined,
        borderRadius: 'var(--sky-radius-md, 12px)',
        padding: '0.5rem',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '0.4rem 0',
          marginBottom: '0.5rem',
          borderBottom: today ? '2px solid var(--sky-amber)' : '1px solid var(--surface-border, rgba(0,0,0,0.08))',
        }}
      >
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sky-text-secondary)', fontWeight: 600 }}>
          {dayLabel}
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: today ? 'var(--sky-amber)' : 'inherit' }}>
          {dayNum}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minHeight: '60px' }}>
        {occurrences.length === 0 ? (
          <div style={{ fontSize: '0.75rem', color: 'var(--sky-text-secondary)', textAlign: 'center', padding: '0.5rem 0', opacity: 0.5 }}>
            —
          </div>
        ) : (
          occurrences.map(chore => {
            const profile = profiles.find(p => p.id === chore.assignedProfileId)
            const accent = profile?.color ?? 'var(--sky-amber)'
            const completed = isChoreCompletedOn(chore, date)
            const approved = isChoreApprovedOn(chore, date)
            const pending = isChorePendingOn(chore, date)
            return (
              <div
                key={chore.id}
                className="sky-card"
                style={{
                  padding: '0.5rem 0.6rem',
                  borderLeft: `4px solid ${accent}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  opacity: approved ? 0.55 : 1,
                  cursor: onEditChore ? 'pointer' : 'default',
                }}
                onClick={() => onEditChore?.(chore)}
              >
                <div onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={completed}
                    onChange={() => onToggleComplete(chore, date)}
                    disabled={approved}
                    tooltip={approved ? 'Approved by admin — locked' : undefined}
                    tooltipOptions={{ position: 'top' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      lineHeight: 1.25,
                      textDecoration: approved ? 'line-through' : 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={chore.title}
                  >
                    {chore.title}
                  </div>
                  {showProfileName && profile && (
                    <div style={{ fontSize: '0.7rem', color: profile.color, fontWeight: 600, marginTop: '0.1rem' }}>
                      {profile.name}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      marginTop: '0.2rem',
                      fontSize: '0.7rem',
                      color: 'var(--sky-text-secondary)',
                    }}
                  >
                    <i className="pi pi-star-fill" style={{ color: 'var(--sky-amber)', fontSize: '0.65rem' }} />
                    <span>{chore.starValue}</span>
                    {chore.recurrence !== 'None' && (
                      <>
                        <span style={{ margin: '0 0.2rem' }}>·</span>
                        <i className="pi pi-refresh" style={{ fontSize: '0.65rem' }} />
                      </>
                    )}
                    {pending && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          color: 'var(--sky-amber)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                        title="Waiting for admin approval"
                      >
                        Pending
                      </span>
                    )}
                    {approved && (
                      <i
                        className="pi pi-verified"
                        style={{ marginLeft: 'auto', color: 'var(--sky-amber)', fontSize: '0.85rem' }}
                        title="Approved"
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

const ChoresWeekView: React.FC<ChoresWeekViewProps> = ({ weekStart, chores, profiles, groupBy, onToggleComplete, onEditChore }) => {
  const days = useMemo(() => buildWeek(weekStart), [weekStart])

  if (groupBy === 'day') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: '0.5rem',
          width: '100%',
        }}
      >
        {days.map(d => (
          <DayColumn
            key={toDateKey(d)}
            date={d}
            chores={chores}
            profiles={profiles}
            onToggleComplete={onToggleComplete}
            onEditChore={onEditChore}
            showProfileName
          />
        ))}
      </div>
    )
  }

  // groupBy === 'profile' — one row per profile, 7 columns per row
  const profilesWithChores = profiles.filter(p =>
    chores.some(c => c.assignedProfileId === p.id)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header row of day labels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '160px repeat(7, minmax(0, 1fr))',
          gap: '0.5rem',
          alignItems: 'center',
        }}
      >
        <div />
        {days.map(d => {
          const today = isSameDay(d, new Date())
          return (
            <div
              key={toDateKey(d)}
              style={{
                textAlign: 'center',
                padding: '0.4rem 0',
                borderBottom: today ? '2px solid var(--sky-amber)' : '1px solid var(--surface-border, rgba(0,0,0,0.08))',
              }}
            >
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sky-text-secondary)', fontWeight: 600 }}>
                {DAY_LABELS_SHORT[d.getDay()]}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: today ? 'var(--sky-amber)' : 'inherit' }}>
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {profilesWithChores.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--sky-text-secondary)' }}>
          No chores scheduled for the visible profiles this week.
        </div>
      ) : (
        profilesWithChores.map(profile => {
          const profileChores = chores.filter(c => c.assignedProfileId === profile.id)
          return (
            <div
              key={profile.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '160px repeat(7, minmax(0, 1fr))',
                gap: '0.5rem',
                alignItems: 'stretch',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  borderLeft: `4px solid ${profile.color}`,
                  background: 'var(--sky-surface-soft, rgba(160, 200, 220, 0.08))',
                  borderRadius: 'var(--sky-radius-md, 12px)',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: profile.color,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {profile.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: 'var(--sky-text-secondary)' }}>
                    <i className="pi pi-star-fill" style={{ color: 'var(--sky-amber)', fontSize: '0.7rem' }} />
                    <span>{profile.totalStars ?? 0}</span>
                  </div>
                </div>
              </div>

              {days.map(d => (
                <DayColumn
                  key={toDateKey(d)}
                  date={d}
                  chores={profileChores}
                  profiles={profiles}
                  onToggleComplete={onToggleComplete}
                  onEditChore={onEditChore}
                />
              ))}
            </div>
          )
        })
      )}
    </div>
  )
}

export default ChoresWeekView
