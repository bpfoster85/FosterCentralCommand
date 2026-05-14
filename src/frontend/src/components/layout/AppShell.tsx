import React, { useEffect, useRef, useState } from 'react'
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
  { label: 'Goals', icon: 'pi pi-flag', path: '/goals' },
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  const isActive = (path: string) => location.pathname.startsWith(path)

  const visibleNavItems = navItems.filter(item => item.path !== '/admin' || isAdmin)

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Close on outside click / Escape.
  useEffect(() => {
    if (!mobileOpen) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null
      if (drawerRef.current && target && !drawerRef.current.contains(target)) {
        setMobileOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [mobileOpen])

  const handleLogout = () => {
    clearAdminKey()
    clearFamilySession()
    navigate('/login', { replace: true })
  }

  const signOutLabel = familyName
    ? `Sign out (${familyName}${isAdmin ? ' · admin' : ''})`
    : 'Sign out'

  const showClock = !location.pathname.startsWith('/admin')

  return (
    <div className="fullscreen-container">
      {/* Pill Tab Navigation — always on top */}
      <nav className={`sky-nav-tabs ${mobileOpen ? 'is-mobile-open' : ''}`} ref={drawerRef}>
        {/* Hamburger — mobile only */}
        <button
          type="button"
          className="sky-nav-hamburger"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="sky-nav-mobile-menu"
          onClick={() => setMobileOpen(o => !o)}
        >
          <i className={mobileOpen ? 'pi pi-times' : 'pi pi-bars'} />
        </button>

        {showClock && (
          <div className="sky-nav-clock" aria-label={`Current time, Mountain Time: ${time}`}>
            <span className="sky-nav-clock-time">{time.replace(' ', '')}</span>
            <span className="sky-nav-clock-zone">MST</span>
          </div>
        )}

        {/* Desktop pill row */}
        <div className="sky-nav-tabs-desktop">
          {visibleNavItems.map(item => (
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
            title={signOutLabel}
            style={{ marginLeft: 'auto' }}
          >
            <i className="pi pi-sign-out" />
            <span>{signOutLabel}</span>
          </button>
        </div>

        {/* Mobile drawer */}
        <div
          id="sky-nav-mobile-menu"
          className="sky-nav-mobile-menu"
          role="menu"
          aria-hidden={!mobileOpen}
        >
          {visibleNavItems.map(item => (
            <button
              key={item.path}
              role="menuitem"
              className={`sky-nav-mobile-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <i className={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
          <button
            role="menuitem"
            className="sky-nav-mobile-item"
            onClick={handleLogout}
          >
            <i className="pi pi-sign-out" />
            <span>{signOutLabel}</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  )
}

export default AppShell
