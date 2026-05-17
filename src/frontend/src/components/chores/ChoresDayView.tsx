import React, { useState } from 'react'
import { Checkbox } from 'primereact/checkbox'
import { Dialog } from 'primereact/dialog'
import type { Chore, Profile } from '../../types'
import {
  choreOccursOn,
  isChoreApprovedOn,
  isChoreCompletedOn,
  isChorePendingOn,
} from '../../utils/choreSchedule'
import { getContrastText } from '../../utils/colors'
import CelebrationOverlay from './CelebrationOverlay'

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
  onChoreClick: (chore: Chore) => void
}

const ProfileColumn: React.FC<ProfileColumnProps> = ({ profile, date, chores, onToggleComplete, onChoreClick }) => {
  const occurrences = chores
    .filter(c => c.assignedProfileId === profile.id && choreOccursOn(c, date))

  const total = occurrences.length
  const done = occurrences.filter(c => isChoreCompletedOn(c, date) || isChoreApprovedOn(c, date)).length

  const columnBg = tint(profile.color, 0.88)
  const cardBg = tint(profile.color, 0.78)
  const cardBgDone = tint(profile.color, 0.92)
  const profileTextColor = getContrastText(profile.color)

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
            color: profileTextColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              fontWeight: 700,
              fontSize: '1.15rem',
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
              gap: '0.35rem',
              padding: '0.25rem 0.7rem',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.7)',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--sky-text-secondary)',
              flexShrink: 0,
            }}
            title={`${done} of ${total} complete`}
          >
            <i className="pi pi-check" style={{ fontSize: '0.9rem' }} />
            <span>{done}/{total}</span>
            <span style={{ margin: '0 0.15rem', opacity: 0.5 }}>·</span>
            <i className="pi pi-star-fill" style={{ color: 'var(--sky-amber)', fontSize: '1rem' }} />
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
              fontSize: '1rem',
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
                role="button"
                tabIndex={0}
                onClick={() => onChoreClick(chore)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onChoreClick(chore)
                  }
                }}
                style={{
                  background: completed || approved ? cardBgDone : cardBg,
                  borderRadius: '14px',
                  padding: '0.75rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: approved ? 0.7 : 1,
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '1.15rem',
                      lineHeight: 1.3,
                      textDecoration: approved ? 'line-through' : 'none',
                      wordBreak: 'break-word',
                    }}
                    title={chore.title}
                  >
                    {chore.title}
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      marginTop: '0.4rem',
                      padding: '0.2rem 0.65rem',
                      borderRadius: '999px',
                      background: 'rgba(255,255,255,0.7)',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: 'var(--sky-amber)',
                    }}
                  >
                    <i className="pi pi-star-fill" style={{ fontSize: '0.9rem' }} />
                    <span>{chore.starValue}</span>
                    {pending && (
                      <span
                        style={{
                          marginLeft: '0.4rem',
                          color: 'var(--sky-amber)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontSize: '0.75rem',
                        }}
                        title="Waiting for admin approval"
                      >
                        Pending
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`sky-chore-checkbox-cell ${approved ? 'sky-chore-checkbox-cell--disabled' : ''}`}
                  onClick={e => e.stopPropagation()}
                >
                  <Checkbox
                    className="sky-chore-checkbox"
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
  const [selectedChore, setSelectedChore] = useState<Chore | null>(null)
  const [celebration, setCelebration] = useState<{ active: boolean; message: string }>({ active: false, message: '' })
  const selectedProfile = selectedChore
    ? profiles.find(p => p.id === selectedChore.assignedProfileId)
    : undefined
  const selectedProfileTextColor = selectedProfile ? getContrastText(selectedProfile.color) : '#ffffff'

  const handleToggleWithCelebration = (chore: Chore, d: Date) => {
    const wasCompleted = isChoreCompletedOn(chore, d)
    onToggleComplete(chore, d)
    // Only celebrate when marking complete (not un-completing)
    if (!wasCompleted && !isChoreApprovedOn(chore, d)) {
      const profile = profiles.find(p => p.id === chore.assignedProfileId)
      const name = profile ? profile.name : 'Great job'
      setCelebration({ active: true, message: `${name} completed "${chore.title}"! +${chore.starValue} ⭐` })
    }
  }

  if (profiles.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--sky-text-secondary)' }}>
        No profiles to show.
      </div>
    )
  }
  return (
    <>
      <CelebrationOverlay
        active={celebration.active}
        message={celebration.message}
        duration={15000}
        onDone={() => setCelebration({ active: false, message: '' })}
      />

      <div
        className="sky-chores-day-grid"
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
            onToggleComplete={handleToggleWithCelebration}
            onChoreClick={setSelectedChore}
          />
        ))}
      </div>

      <Dialog
        visible={!!selectedChore}
        onHide={() => setSelectedChore(null)}
        style={{ width: '90vw', maxWidth: '560px' }}
        showHeader={false}
        contentStyle={{ padding: 0 }}
        dismissableMask
      >
        {selectedChore && (
          <div>
            <div
              style={{
                background: selectedProfile?.color ?? 'var(--sky-amber)',
                color: selectedProfileTextColor,
                padding: '1.25rem 1.5rem',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
              }}
            >
              {selectedProfile && (
                <div
                  style={{
                    fontSize: '0.95rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    opacity: 0.9,
                    marginBottom: '0.5rem',
                  }}
                >
                  {selectedProfile.name}
                </div>
              )}
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.6rem',
                  lineHeight: 1.25,
                  fontWeight: 700,
                  wordBreak: 'break-word',
                }}
              >
                {selectedChore.title}
              </h3>
            </div>
            <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  alignSelf: 'flex-start',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '999px',
                  background: 'rgba(0, 0, 0, 0.04)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--sky-amber)',
                }}
              >
                <i className="pi pi-star-fill" style={{ fontSize: '1.1rem' }} />
                <span>{selectedChore.starValue}</span>
                {selectedChore.recurrence !== 'None' && (
                  <>
                    <span style={{ margin: '0 0.25rem', opacity: 0.4, color: 'var(--sky-text-secondary)' }}>·</span>
                    <span style={{ color: 'var(--sky-text-secondary)', fontWeight: 600, fontSize: '1rem' }}>
                      {selectedChore.recurrence}
                    </span>
                  </>
                )}
              </div>

              <div>
                <div
                  style={{
                    color: selectedProfile?.color ?? 'var(--sky-text-secondary)',
                    fontSize: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                  }}
                >
                  Description
                </div>
                {selectedChore.description?.trim() ? (
                  <div style={{ fontSize: '1.2rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                    {selectedChore.description}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: '1.1rem',
                      lineHeight: 1.5,
                      color: 'var(--sky-text-secondary)',
                      fontStyle: 'italic',
                    }}
                  >
                    No description for this chore.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}

export default ChoresDayView
