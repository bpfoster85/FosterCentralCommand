import React, { useState } from 'react'
import { Button } from 'primereact/button'

const STORAGE_KEY = 'fcc_dads_swear_jar_total'

const loadCount = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? Number.parseInt(stored, 10) : 0
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  } catch {
    return 0
  }
}

const DadsSwearJarWidget: React.FC = () => {
  const [count, setCount] = useState(loadCount)

  const handleAdd = () => {
    setCount(prev => {
      const next = prev + 1
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="sky-widget-header">
        <span style={{ fontWeight: 600, fontSize: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="pi pi-wallet" style={{ fontSize: '1.25rem' }} />
          Dad&apos;s Swear Jar
        </span>
      </div>
      <div
        className="sky-widget-body"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem', padding: '0.75rem' }}
      >
        <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.1 }}>{count}</div>
        <Button label="Add" icon="pi pi-plus" onClick={handleAdd} />
      </div>
    </div>
  )
}

export default DadsSwearJarWidget
