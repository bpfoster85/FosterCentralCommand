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

// WMO Weather interpretation codes → emoji + short label.
function wmoToDisplay(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: '☀️', label: 'Clear' }
  if (code <= 2) return { emoji: '⛅', label: 'Partly cloudy' }
  if (code === 3) return { emoji: '☁️', label: 'Overcast' }
  if (code <= 49) return { emoji: '🌫️', label: 'Foggy' }
  if (code <= 59) return { emoji: '🌦️', label: 'Drizzle' }
  if (code <= 69) return { emoji: '🌧️', label: 'Rain' }
  if (code <= 79) return { emoji: '❄️', label: 'Snow' }
  if (code <= 84) return { emoji: '🌧️', label: 'Showers' }
  if (code <= 86) return { emoji: '🌨️', label: 'Snow showers' }
  if (code <= 99) return { emoji: '⛈️', label: 'Thunderstorm' }
  return { emoji: '🌡️', label: 'Unknown' }
}

interface WeatherData {
  tempF: number
  emoji: string
  label: string
}

// South Jordan, Utah coordinates
const LAT = 40.5621
const LON = -111.9296
const WEATHER_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  `&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FDenver`

const useWeather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const fetchRef = useRef<(() => void) | undefined>(undefined)

  fetchRef.current = async () => {
    try {
      const resp = await fetch(WEATHER_URL)
      if (!resp.ok) return
      const json = await resp.json()
      const tempF: number = json.current?.temperature_2m ?? 0
      const code: number = json.current?.weather_code ?? 0
      const { emoji, label } = wmoToDisplay(code)
      setWeather({ tempF: Math.round(tempF), emoji, label })
    } catch {
      // silently ignore network errors
    }
  }

  useEffect(() => {
    fetchRef.current?.()
    // Re-fetch every 15 minutes
    const id = window.setInterval(() => fetchRef.current?.(), 15 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [])

  return weather
}

const AppShell: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const time = useMstClock()
  const weather = useWeather()
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
            {weather && (
              <span className="sky-nav-clock-weather" aria-label={`Weather: ${weather.label}, ${weather.tempF}°F`}>
                <span className="sky-nav-clock-weather-emoji" aria-hidden="true">{weather.emoji}</span>
                <span className="sky-nav-clock-weather-temp">{weather.tempF}°F</span>
              </span>
            )}
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
