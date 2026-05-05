import React from 'react'
import { ProgressBar } from 'primereact/progressbar'
import type { Goal } from '../../types'

interface GoalCardProps {
  goal: Goal
  earnedStars: number
  accentColor?: string
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, earnedStars, accentColor }) => {
  const target = Math.max(goal.starTarget, 0)
  const progress = target > 0 ? Math.min(100, Math.round((earnedStars / target) * 100)) : 0
  const attained = target > 0 && earnedStars >= target

  return (
    <div
      className="sky-card sky-fade-in"
      style={{
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        borderLeft: `4px solid ${accentColor ?? 'var(--sky-amber)'}`,
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
          {attained && (
            <i
              className="pi pi-check-circle"
              style={{ color: 'var(--sky-amber)', fontSize: '1.1rem' }}
              aria-label="Goal attained"
              title="Goal attained"
            />
          )}
        </div>
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
              {earnedStars} / {target || '–'} stars
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GoalCard
