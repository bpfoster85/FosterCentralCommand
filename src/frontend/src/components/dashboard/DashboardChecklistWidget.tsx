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
  const [items, setItems] = useState<DashboardChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await getDashboardChecklist()
        if (mounted) {
          setItems(data.items)
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

  const toggleItem = async (itemId: string) => {
    if (savingId) return
    setSavingId(itemId)
    try {
      const data = await toggleDashboardChecklistItem(itemId, todayDateKey())
      setItems(data.items)
      setError(null)
      window.dispatchEvent(new CustomEvent('fcc-checklist-updated'))
    } catch {
      setError('Unable to update checklist.')
    } finally {
      setSavingId(null)
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
        ) : items.length === 0 ? (
          <div style={{ color: 'var(--sky-text-secondary)', fontSize: '0.85rem' }}>No checklist items.</div>
        ) : (
          items.map(item => (
            <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: savingId ? 'default' : 'pointer' }}>
              <input
                type="checkbox"
                checked={item.checkedToday}
                disabled={savingId !== null}
                onChange={() => toggleItem(item.id)}
              />
              <i className={item.logo} aria-hidden="true" />
              <span style={{ fontWeight: 500, lineHeight: 1.2 }}>{item.title}</span>
            </label>
          ))
        )}
        {error && <div style={{ color: 'var(--red-500)', fontSize: '0.8rem' }}>{error}</div>}
      </div>
    </div>
  )
}

export default DashboardChecklistWidget
