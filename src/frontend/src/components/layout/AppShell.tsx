import React, { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  clearAdminKey,
  clearFamilySession,
  getAdminKey,
  getFamilyName,
} from '../../api/apiClient'

const navItems = [
  { label: 'Dashboard', icon: 'pi pi-home', path: '/command-center' },
  { label: 'Calendar', icon: 'pi pi-calendar', path: '/calendar' },
  { label: 'Lists', icon: 'pi pi-list', path: '/lists' },
  { label: 'Chores', icon: 'pi pi-star', path: '/chores' },
  { label: 'Profiles', icon: 'pi pi-users', path: '/profiles' },
  { label: 'Admin', icon: 'pi pi-shield', path: '/admin' },
]

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/Denver',
})

const useMstClock = () => {
  const [time, setTime] = useState(() => TIME_FORMATTER.format(new Date()))
  useEffect(() => {
    // Sync the first tick to the next minute boundary, then tick every 60s.
    const now = new Date()
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()
    let intervalId: number | undefined
    const timeoutId = window.setTimeout(() => {
      setTime(TIME_FORMATTER.format(new Date()))
      intervalId = window.setInterval(() => {
        setTime(TIME_FORMATTER.format(new Date()))
      }, 60_000)
    }, msUntilNextMinute)
    return () => {
      window.clearTimeout(timeoutId)
      if (intervalId !== undefined) window.clearInterval(intervalId)
    }
  }, [])
  return time
}

const AppShell: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const time = useMstClock()
  const familyName = getFamilyName()
  const isAdmin = Boolean(getAdminKey())

  const isActive = (path: string) => location.pathname.startsWith(path)

  const handleLogout = () => {
    clearAdminKey()
    clearFamilySession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="fullscreen-container">
      {/* Pill Tab Navigation — always on top */}
      <nav className="sky-nav-tabs">
        <div className="sky-nav-clock" aria-label={`Current time, Mountain Time: ${time}`}>
          <span className="sky-nav-clock-time">{time.replace(' ', '')}</span>
          <span className="sky-nav-clock-zone">MST</span>
        </div>
        {navItems.map(item => (
          <button
            key={item.path}
            className={`sky-nav-tab ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <i className={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
        <button
          className="sky-nav-tab"
          onClick={handleLogout}
          title={
            familyName
              ? `Sign out${isAdmin ? ' (admin)' : ''} — ${familyName}`
              : 'Sign out'
          }
          style={{ marginLeft: 'auto' }}
        >
          <i className="pi pi-sign-out" />
          <span>{familyName ? `Sign out (${familyName}${isAdmin ? ' · admin' : ''})` : 'Sign out'}</span>
        </button>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  )
}

export default AppShell
