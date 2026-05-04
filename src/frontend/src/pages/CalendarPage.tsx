import React from 'react'
import { useProfiles } from '../hooks/useProfiles'
import CalendarWidget from '../components/calendar/CalendarWidget'

const CalendarPage: React.FC = () => {
  const { profiles } = useProfiles()

  return (
    <div style={{ flex: 1, overflow: 'hidden', height: '100%' }}>
      <CalendarWidget profiles={profiles} />
    </div>
  )
}

export default CalendarPage
