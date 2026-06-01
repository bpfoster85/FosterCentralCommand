import React, { useEffect, useMemo, useState } from 'react'
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

const DAILY_REFRESH_HOUR = 4

const getDashboardChoreDate = (now: Date): Date => {
  const day = new Date(now)
  if (day.getHours() < DAILY_REFRESH_HOUR) day.setDate(day.getDate() - 1)
  day.setHours(0, 0, 0, 0)
  return day
}

const getNextRefreshTime = (now: Date): Date => {
  const next = new Date(now)
  next.setHours(DAILY_REFRESH_HOUR, 0, 0, 0)
  if (now >= next) next.setDate(next.getDate() + 1)
  return next
}

const ChoresDashboardWidget: React.FC<ChoresDashboardWidgetProps> = ({ profiles }) => {
  const { chores, loading, refetch, toggleCompleteOnDate } = useChores()

  const orderedProfiles = useMemo(() => sortProfilesForChores(profiles), [profiles])

  const [today, setToday] = useState<Date>(() => getDashboardChoreDate(new Date()))

  useEffect(() => {
    let refreshTimerId: number | undefined

    const scheduleDailyRefresh = () => {
      const now = new Date()
      const nextRefresh = getNextRefreshTime(now)
      const delay = Math.max(0, nextRefresh.getTime() - now.getTime())

      refreshTimerId = window.setTimeout(async () => {
        setToday(getDashboardChoreDate(new Date()))
        await refetch(true)
        scheduleDailyRefresh()
      }, delay)
    }

    scheduleDailyRefresh()

    return () => {
      if (refreshTimerId != null) window.clearTimeout(refreshTimerId)
    }
  }, [refetch])

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
