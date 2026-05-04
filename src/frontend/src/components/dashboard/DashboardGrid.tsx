import React, { useState, useCallback } from 'react'
import GridLayout, { Layout } from 'react-grid-layout'
import { Button } from 'primereact/button'
import { ToggleButton } from 'primereact/togglebutton'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Profile, DashboardLayout } from '../../types'
import CalendarWidget from '../calendar/CalendarWidget'
import ListsWidget from '../lists/ListsWidget'

interface DashboardGridProps {
  profiles: Profile[]
}

const DEFAULT_LAYOUTS: DashboardLayout[] = [
  { i: 'calendar', x: 0, y: 0, w: 8, h: 8, minW: 4, minH: 4 },
  { i: 'favorites', x: 8, y: 0, w: 4, h: 4, minW: 2, minH: 3 },
  { i: 'lists', x: 8, y: 4, w: 4, h: 4, minW: 2, minH: 3 },
]

const STORAGE_KEY = 'fcc_dashboard_layout'

const loadLayout = (): DashboardLayout[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : DEFAULT_LAYOUTS
  } catch {
    return DEFAULT_LAYOUTS
  }
}

const DashboardGrid: React.FC<DashboardGridProps> = ({ profiles }) => {
  const [layouts, setLayouts] = useState<DashboardLayout[]>(loadLayout)
  const [editMode, setEditMode] = useState(false)
  const [fullscreenPanel, setFullscreenPanel] = useState<string | null>(null)
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

  const handleLayoutChange = (newLayout: Layout[]) => {
    const updated = newLayout.map(l => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h, minW: l.minW, minH: l.minH }))
    setLayouts(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const resetLayout = () => {
    setLayouts(DEFAULT_LAYOUTS)
    localStorage.removeItem(STORAGE_KEY)
  }

  if (fullscreenPanel) {
    return (
      <div style={{ width: '100vw', height: '100%', overflow: 'hidden' }}>
        {fullscreenPanel === 'calendar' && (
          <CalendarWidget profiles={profiles} isFullscreen onToggleFullscreen={() => setFullscreenPanel(null)} />
        )}
        {(fullscreenPanel === 'lists' || fullscreenPanel === 'favorites') && (
          <ListsWidget
            profiles={profiles}
            favoritesOnly={fullscreenPanel === 'favorites'}
            isFullscreen
            onToggleFullscreen={() => setFullscreenPanel(null)}
          />
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'auto', position: 'relative' }}>
      {/* Dashboard Controls */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--surface-ground)',
        padding: '0.5rem 1rem',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        borderBottom: '1px solid var(--surface-border)'
      }}>
        <span style={{ flex: 1, fontWeight: 600 }}>Dashboard</span>
        <ToggleButton
          onLabel="Done Editing"
          offLabel="Edit Layout"
          onIcon="pi pi-check"
          offIcon="pi pi-pencil"
          checked={editMode}
          onChange={e => setEditMode(e.value)}
          className="p-button-sm"
        />
        {editMode && (
          <Button label="Reset Layout" icon="pi pi-refresh" className="p-button-sm p-button-secondary" onClick={resetLayout} />
        )}
      </div>

      {/* Grid */}
      <GridLayout
        className="layout"
        layout={layouts}
        cols={12}
        rowHeight={60}
        width={containerWidth}
        onLayoutChange={handleLayoutChange}
        isDraggable={editMode}
        isResizable={editMode}
        margin={[8, 8]}
        containerPadding={[8, 8]}
        style={{ minHeight: '100%' }}
      >
        {/* Calendar Panel */}
        <div key="calendar" style={{ background: 'var(--surface-card)', borderRadius: '8px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
          <CalendarWidget
            profiles={profiles}
            onToggleFullscreen={() => setFullscreenPanel('calendar')}
          />
        </div>

        {/* Favorite Lists Panel */}
        <div key="favorites" style={{ background: 'var(--surface-card)', borderRadius: '8px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
          <ListsWidget
            profiles={profiles}
            favoritesOnly
            onToggleFullscreen={() => setFullscreenPanel('favorites')}
          />
        </div>

        {/* All Lists Panel */}
        <div key="lists" style={{ background: 'var(--surface-card)', borderRadius: '8px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
          <ListsWidget
            profiles={profiles}
            onToggleFullscreen={() => setFullscreenPanel('lists')}
          />
        </div>
      </GridLayout>
    </div>
  )
}

export default DashboardGrid
