import React, { useEffect, useState } from 'react'
import { Button } from 'primereact/button'
import { ProgressBar } from 'primereact/progressbar'
import { addDadsSwearJar, getDadsSwearJar } from '../../api/dashboard'

const DadsSwearJarWidget: React.FC = () => {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await getDadsSwearJar()
        if (mounted) setCount(data.count)
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
    } finally {
      setUpdating(false)
    }
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
        {loading ? (
          <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
        ) : (
          <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.1 }}>{count}</div>
        )}
        <Button label="Add" icon="pi pi-plus" onClick={handleAdd} disabled={loading || updating} />
      </div>
    </div>
  )
}

export default DadsSwearJarWidget
