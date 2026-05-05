import React, { useState, useCallback } from 'react'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import type { Profile, DashboardLayout } from '../../types'
import CalendarWidget from '../calendar/CalendarWidget'
import GroceryWidget from '../lists/GroceryWidget'

interface DashboardGridProps {
  profiles: Profile[]
}

const DEFAULT_LAYOUTS: DashboardLayout[] = [
  { i: 'calendar', x: 0, y: 0, w: 10, h: 8, minW: 4, minH: 4 },
  { i: 'grocery', x: 10, y: 0, w: 2, h: 8, minW: 2, minH: 4 },
]

const STORAGE_KEY = 'fcc_dashboard_layout_v3'

const loadLayout = (): DashboardLayout[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed: DashboardLayout[] = stored ? JSON.parse(stored) : []
    if (parsed.length === 0) return DEFAULT_LAYOUTS
    // Drop any retired widgets (e.g. 'favorites') and append any new defaults.
    const allowed = new Set(DEFAULT_LAYOUTS.map(d => d.i))
    const filtered = parsed.filter(l => allowed.has(l.i))
    const ids = new Set(filtered.map(l => l.i))
    const missing = DEFAULT_LAYOUTS.filter(d => !ids.has(d.i))
    return missing.length > 0 ? [...filtered, ...missing] : filtered
  } catch {
    return DEFAULT_LAYOUTS
  }
}

const DashboardGrid: React.FC<DashboardGridProps> = ({ profiles }) => {
  const [layouts] = useState<DashboardLayout[]>(loadLayout)
  const [containerWidth, setContainerWidth] = useState(window.innerWidth)

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    ro.observe(node)
  }, [])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'auto', position: 'relative' }}>
      {/* Grid */}
      <GridLayout
        className="layout"
        layout={layouts}
        width={containerWidth}
        gridConfig={{
          cols: 12,
          rowHeight: 60,
          margin: [16, 16],
          containerPadding: [16, 16],
        }}
        dragConfig={{ enabled: false }}
        resizeConfig={{ enabled: false }}
        style={{ minHeight: '100%' }}
      >
        {/* Calendar Panel */}
        <div key="calendar" className="sky-widget sky-fade-in">
          <CalendarWidget profiles={profiles} />
        </div>

        {/* Grocery Quick Add */}
        <div key="grocery" className="sky-widget sky-fade-in">
          <GroceryWidget profiles={profiles} />
        </div>
      </GridLayout>
    </div>
  )
}

export default DashboardGrid
