import React, { useMemo } from 'react'
import { ProgressBar } from 'primereact/progressbar'
import { useChores } from '../../hooks/useChores'
import ChoresDayView from '../chores/ChoresDayView'
import type { Chore, Profile } from '../../types'
import { toDateKey } from '../../utils/choreSchedule'
import { sortProfilesForChores } from '../../utils/profileOrder'

interface ChoresDashboardWidgetProps {
  profiles: Profile[]
}

const TODAY_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
}

const ChoresDashboardWidget: React.FC<ChoresDashboardWidgetProps> = ({ profiles }) => {
  const { chores, loading, toggleCompleteOnDate } = useChores()

  const orderedProfiles = useMemo(() => sortProfilesForChores(profiles), [profiles])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const handleToggle = async (chore: Chore, date: Date) => {
    await toggleCompleteOnDate(chore.id, toDateKey(date))
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="sky-widget-header">
        <span style={{ fontWeight: 600, fontSize: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="pi pi-check-square" style={{ fontSize: '1.25rem' }} />
          Today's Chores
        </span>
        <span style={{ fontSize: '1rem', color: 'var(--sky-text-secondary)', fontWeight: 500 }}>
          {today.toLocaleDateString(undefined, TODAY_FORMAT)}
        </span>
      </div>

      <div className="sky-widget-body" style={{ overflow: 'auto', padding: '1rem' }}>
        {loading ? (
          <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
        ) : (
          <ChoresDayView
            date={today}
            chores={chores}
            profiles={orderedProfiles}
            onToggleComplete={handleToggle}
          />
        )}
      </div>
    </div>
  )
}

export default ChoresDashboardWidget
