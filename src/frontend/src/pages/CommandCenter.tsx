import React from 'react'
import { useProfiles } from '../hooks/useProfiles'
import DashboardGrid from '../components/dashboard/DashboardGrid'
import { ProgressBar } from 'primereact/progressbar'

const CommandCenter: React.FC = () => {
  const { profiles, loading } = useProfiles()

  if (loading) {
    return <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
  }

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DashboardGrid profiles={profiles} />
    </div>
  )
}

export default CommandCenter
