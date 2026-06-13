import React, { useEffect, useRef, useState } from 'react'
import { ProgressBar } from 'primereact/progressbar'
import { OverlayPanel } from 'primereact/overlaypanel'
import { getDashboardChecklist, toggleDashboardChecklistItem } from '../../api/dashboard'
import type { DashboardChecklistItem } from '../../types'

const todayDateKey = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const LONG_PRESS_MS = 500

const DashboardChecklistWidget: React.FC = () => {
  const [item, setItem] = useState<DashboardChecklistItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [popupTitle, setPopupTitle] = useState<string>('')

  const overlayRef = useRef<OverlayPanel>(null)
  const longPressTimer = useRef<number | null>(null)
  const longPressFiredRef = useRef(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await getDashboardChecklist()
        if (mounted) {
          setItem(data.item)
          setError(null)
        }
      } catch {
        if (mounted) setError('Unable to load checklist.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  useEffect(() => () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const toggle = async () => {
    if (saving || !item) return
    setSaving(true)
    try {
      const data = await toggleDashboardChecklistItem(todayDateKey())
      setItem(data.item)
      setError(null)
      window.dispatchEvent(new CustomEvent('fcc-checklist-updated'))
    } catch {
      setError('Unable to update checklist.')
    } finally {
      setSaving(false)
    }
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, title: string) => {
    longPressFiredRef.current = false
    const target = e.currentTarget
    const syntheticEvent = { currentTarget: target } as unknown as React.SyntheticEvent
    cancelLongPress()
    longPressTimer.current = window.setTimeout(() => {
      longPressFiredRef.current = true
      setPopupTitle(title)
      overlayRef.current?.show(syntheticEvent, target)
    }, LONG_PRESS_MS)
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    cancelLongPress()
    if (longPressFiredRef.current) {
      e.preventDefault()
      longPressFiredRef.current = false
      return
    }
    toggle()
  }

  const items: DashboardChecklistItem[] = item ? [item] : []

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        className="sky-widget-body"
        style={{
          flex: 1,
          padding: '0.25rem 0.4rem',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'center',
          justifyContent: items.length > 0 ? 'flex-start' : 'center',
          gap: '0.5rem',
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        {loading ? (
          <ProgressBar mode="indeterminate" style={{ height: '4px', width: '100%' }} />
        ) : items.length === 0 ? (
          <div style={{ color: 'var(--sky-text-secondary)', fontSize: '0.8rem' }}>No checklist item configured.</div>
        ) : (
          items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={handleClick}
              onPointerDown={(e) => handlePointerDown(e, it.title)}
              onPointerUp={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onPointerCancel={cancelLongPress}
              onContextMenu={(e) => e.preventDefault()}
              disabled={saving}
              aria-label={it.title}
              aria-pressed={it.checkedToday}
              title={it.title}
              style={{
                flex: '0 0 auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.25rem',
                height: '2.25rem',
                border: 'none',
                borderRadius: '0.5rem',
                background: it.checkedToday ? 'var(--green-500, #22c55e)' : 'rgba(255,255,255,0.06)',
                color: it.checkedToday ? '#fff' : 'inherit',
                cursor: saving ? 'default' : 'pointer',
                touchAction: 'manipulation',
                userSelect: 'none',
                transition: 'background 0.15s ease',
              }}
            >
              <i className={it.logo} aria-hidden="true" style={{ fontSize: '1.2rem' }} />
            </button>
          ))
        )}
        {error && <div style={{ color: 'var(--red-500)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>{error}</div>}
      </div>
      <OverlayPanel ref={overlayRef} dismissable showCloseIcon={false}>
        <div style={{ fontWeight: 600, padding: '0.15rem 0.25rem' }}>{popupTitle}</div>
      </OverlayPanel>
    </div>
  )
}

export default DashboardChecklistWidget
