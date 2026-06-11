import React, { useEffect, useState } from 'react'
import { ProgressBar } from 'primereact/progressbar'
import { getDashboardChecklist, toggleDashboardChecklistItem } from '../../api/dashboard'
import type { DashboardChecklistItem } from '../../types'

const todayDateKey = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const DashboardChecklistWidget: React.FC = () => {
  const [item, setItem] = useState<DashboardChecklistItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="sky-widget-header">
        <span style={{ fontWeight: 600, fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="pi pi-check-square" style={{ fontSize: '1.05rem' }} />
          Checklist
        </span>
      </div>
      <div className="sky-widget-body" style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', overflowY: 'auto' }}>
        {loading ? (
          <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
        ) : !item ? (
          <div style={{ color: 'var(--sky-text-secondary)', fontSize: '0.85rem' }}>No checklist item configured.</div>
        ) : (
          <button
            type="button"
            onClick={toggle}
            disabled={saving}
            aria-pressed={item.checkedToday}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              width: '100%',
              padding: '0.35rem 0.25rem',
              border: 'none',
              background: 'transparent',
              color: 'inherit',
              cursor: saving ? 'default' : 'pointer',
              textAlign: 'left',
            }}
          >
            <i
              className={item.logo}
              aria-hidden="true"
              style={{
                fontSize: '1.15rem',
                color: item.checkedToday ? 'var(--green-500, #22c55e)' : 'inherit',
                width: '1.25rem',
                textAlign: 'center',
              }}
            />
            <span
              style={{
                fontWeight: item.checkedToday ? 700 : 500,
                lineHeight: 1.2,
                opacity: item.checkedToday ? 0.6 : 1,
              }}
            >
              {item.title}
            </span>
          </button>
        )}
        {error && <div style={{ color: 'var(--red-500)', fontSize: '0.8rem' }}>{error}</div>}
      </div>
    </div>
  )
}

export default DashboardChecklistWidget
