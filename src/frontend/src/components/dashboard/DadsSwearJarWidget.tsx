import React, { useEffect, useState } from 'react'
import { ProgressBar } from 'primereact/progressbar'
import { addDadsSwearJar, getDadsSwearJar } from '../../api/dashboard'

const SWEAR_JAR_GOAL = 20

const DadsSwearJarWidget: React.FC = () => {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await getDadsSwearJar()
        if (mounted) {
          setCount(data.count)
          setError(null)
        }
      } catch {
        if (mounted) setError('Unable to load count.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  const handleAdd = async () => {
    if (updating) return
    setUpdating(true)
    try {
      const data = await addDadsSwearJar(1)
      setCount(data.count)
      setError(null)
    } catch {
      setError('Unable to update count.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: loading || updating ? 'wait' : 'pointer',
        userSelect: 'none',
      }}
      role="button"
      tabIndex={0}
      aria-label="Add to Dad's Swear Jar"
      aria-disabled={loading || updating}
      onClick={handleAdd}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleAdd()
        }
      }}
    >
      <div className="sky-widget-header">
        <span style={{ fontWeight: 600, fontSize: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="pi pi-wallet" style={{ fontSize: '1.25rem' }} />
          Dad&apos;s Swear Jar
        </span>
      </div>
      <div
        className="sky-widget-body"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem' }}
      >
        {loading ? (
          <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(3rem, 9vw, 5rem)', fontWeight: 800, lineHeight: 1 }}>
              {count}
              <span style={{ fontSize: '0.45em', fontWeight: 600, color: 'var(--sky-text-secondary)' }}>/{SWEAR_JAR_GOAL}</span>
            </div>
            {error && <div style={{ color: 'var(--red-500)', fontSize: '0.9rem' }}>{error}</div>}
          </div>
        )}
      </div>
    </div>
  )
}

export default DadsSwearJarWidget
