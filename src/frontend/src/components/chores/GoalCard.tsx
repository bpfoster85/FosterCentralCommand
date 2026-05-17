import React from 'react'
import { ProgressBar } from 'primereact/progressbar'
import { Button } from 'primereact/button'
import type { Goal } from '../../types'

interface GoalCardProps {
  goal: Goal
  accentColor?: string
  onSpendStars?: (goal: Goal) => void
  onWinAward?: (goal: Goal) => void
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, accentColor, onSpendStars, onWinAward }) => {
  const target = Math.max(goal.starTarget, 0)
  const applied = goal.starsApplied ?? 0
  const progress = target > 0 ? Math.min(100, Math.round((applied / target) * 100)) : 0
  const attained = target > 0 && applied >= target && !goal.isAchieved
  const achieved = goal.isAchieved
  const canSpend = !achieved && !attained && !!onSpendStars

  return (
    <div
      className="sky-card sky-fade-in"
      role={canSpend ? 'button' : undefined}
      tabIndex={canSpend ? 0 : undefined}
      onClick={canSpend ? () => onSpendStars?.(goal) : undefined}
      onKeyDown={canSpend ? e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSpendStars?.(goal)
        }
      } : undefined}
      style={{
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        borderLeft: `4px solid ${achieved ? 'var(--sky-sage, #6bcb77)' : (accentColor ?? 'var(--sky-amber)')}`,
        opacity: achieved ? 0.75 : 1,
        cursor: canSpend ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          fontSize: '2rem',
          width: '52px',
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        aria-hidden
      >
        {goal.emoji || '⭐'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
            {goal.title}
          </span>
          {achieved && (
            <i
              className="pi pi-trophy"
              style={{ color: 'var(--sky-sage, #6bcb77)', fontSize: '1.1rem' }}
              aria-label="Goal achieved"
              title="Goal achieved!"
            />
          )}
        </div>
        {!achieved && (
          <div style={{ marginTop: '0.5rem' }}>
            <ProgressBar value={progress} style={{ height: '6px' }} showValue={false} />
            <div
              style={{
                marginTop: '0.3rem',
                fontSize: '0.78rem',
                color: 'var(--sky-text-secondary)',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <i className="pi pi-star-fill" style={{ color: 'var(--sky-amber)', fontSize: '0.8rem' }} />
              <span>
                {applied} / {target || '–'} stars
              </span>
            </div>
          </div>
        )}
        {achieved && (
          <div style={{ marginTop: '0.3rem', fontSize: '0.82rem', color: 'var(--sky-text-secondary)', fontStyle: 'italic' }}>
            Goal achieved! 🏆
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!achieved && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
          {attained && onWinAward && (
            <Button
              label="🏆 Win Award!"
              className="p-button-success p-button-sm"
              style={{ fontWeight: 700, whiteSpace: 'nowrap' }}
              onClick={() => onWinAward(goal)}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default GoalCard
