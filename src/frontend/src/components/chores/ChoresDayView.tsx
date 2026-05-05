import React from 'react'
import { Checkbox } from 'primereact/checkbox'
import type { Chore, Profile } from '../../types'
import {
  choreOccursOn,
  isChoreApprovedOn,
  isChoreCompletedOn,
  isChorePendingOn,
} from '../../utils/choreSchedule'

interface ChoresDayViewProps {
  date: Date
  chores: Chore[]
  profiles: Profile[]
  onToggleComplete: (chore: Chore, date: Date) => void
}

/** Lightens a hex color by mixing with white. amount=0 → original, 1 → white. */
const tint = (hex: string, amount = 0.85): string => {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim())
  if (!m) return hex
  let h = m[1]
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const lr = Math.round(r + (255 - r) * amount)
  const lg = Math.round(g + (255 - g) * amount)
  const lb = Math.round(b + (255 - b) * amount)
  return `rgb(${lr}, ${lg}, ${lb})`
}

interface ProfileColumnProps {
  profile: Profile
  date: Date
  chores: Chore[]
  onToggleComplete: (chore: Chore, date: Date) => void
}

const ProfileColumn: React.FC<ProfileColumnProps> = ({ profile, date, chores, onToggleComplete }) => {
  const occurrences = chores
    .filter(c => c.assignedProfileId === profile.id && choreOccursOn(c, date))

  const total = occurrences.length
  const done = occurrences.filter(c => isChoreCompletedOn(c, date) || isChoreApprovedOn(c, date)).length

  const columnBg = tint(profile.color, 0.88)
  const cardBg = tint(profile.color, 0.78)
  const cardBgDone = tint(profile.color, 0.92)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: columnBg,
        borderRadius: '20px',
        padding: '1rem',
        gap: '0.75rem',
        minWidth: 0,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: profile.color,
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: '1.05rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {profile.name}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginTop: '0.2rem',
              padding: '0.15rem 0.6rem',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.7)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--sky-text-secondary)',
            }}
          >
            <i className="pi pi-check" style={{ fontSize: '0.7rem' }} />
            <span>{done}/{total}</span>
            <span style={{ margin: '0 0.1rem', opacity: 0.5 }}>·</span>
            <i className="pi pi-star-fill" style={{ color: 'var(--sky-amber)', fontSize: '0.7rem' }} />
            <span>{profile.totalStars ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Chore cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {total === 0 ? (
          <div
            style={{
              padding: '1.5rem 0.5rem',
              textAlign: 'center',
              color: 'var(--sky-text-secondary)',
              fontSize: '0.85rem',
              opacity: 0.7,
            }}
          >
            Nothing scheduled today.
          </div>
        ) : (
          occurrences.map(chore => {
            const completed = isChoreCompletedOn(chore, date)
            const approved = isChoreApprovedOn(chore, date)
            const pending = isChorePendingOn(chore, date)
            return (
              <div
                key={chore.id}
                style={{
                  background: completed || approved ? cardBgDone : cardBg,
                  borderRadius: '14px',
                  padding: '0.75rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: approved ? 0.7 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
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
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      marginTop: '0.3rem',
                      padding: '0.1rem 0.5rem',
                      borderRadius: '999px',
                      background: 'rgba(255,255,255,0.7)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'var(--sky-amber)',
                    }}
                  >
                    <i className="pi pi-star-fill" style={{ fontSize: '0.65rem' }} />
                    <span>{chore.starValue}</span>
                    {pending && (
                      <span
                        style={{
                          marginLeft: '0.35rem',
                          color: 'var(--sky-amber)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontSize: '0.6rem',
                        }}
                        title="Waiting for admin approval"
                      >
                        Pending
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <Checkbox
                    checked={completed}
                    onChange={() => onToggleComplete(chore, date)}
                    disabled={approved}
                    tooltip={approved ? 'Approved by admin — locked' : undefined}
                    tooltipOptions={{ position: 'top' }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

const ChoresDayView: React.FC<ChoresDayViewProps> = ({ date, chores, profiles, onToggleComplete }) => {
  if (profiles.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--sky-text-secondary)' }}>
        No profiles to show.
      </div>
    )
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${profiles.length}, minmax(260px, 1fr))`,
        gap: '1rem',
        width: '100%',
      }}
    >
      {profiles.map(p => (
        <ProfileColumn
          key={p.id}
          profile={p}
          date={date}
          chores={chores}
          onToggleComplete={onToggleComplete}
        />
      ))}
    </div>
  )
}

export default ChoresDayView
