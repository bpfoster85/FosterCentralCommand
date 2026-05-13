import React, { useState, useCallback, useEffect, useRef } from 'react'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import type { Profile, DashboardLayout } from '../../types'
import CalendarWidget from '../calendar/CalendarWidget'
import GroceryWidget from '../lists/GroceryWidget'
import ChoresDashboardWidget from './ChoresDashboardWidget'

interface DashboardGridProps {
  profiles: Profile[]
}

// Top row (calendar + grocery) is sized to ~80% of the viewport so the chores
// section below peeks just enough to hint that more content is scrollable.
const TOP_ROWS = 7
const CHORES_ROWS = 8

const DEFAULT_LAYOUTS: DashboardLayout[] = [
  { i: 'calendar', x: 0, y: 0, w: 10, h: TOP_ROWS, minW: 4, minH: 4 },
  { i: 'grocery', x: 10, y: 0, w: 2, h: TOP_ROWS, minW: 2, minH: 4 },
  { i: 'chores', x: 0, y: TOP_ROWS, w: 12, h: CHORES_ROWS, minW: 6, minH: 4 },
]

const STORAGE_KEY = 'fcc_dashboard_layout_v5'

const loadLayout = (): DashboardLayout[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed: DashboardLayout[] = stored ? JSON.parse(stored) : []
    if (parsed.length === 0) return DEFAULT_LAYOUTS
    // Drop any retired widgets and append any new defaults.
    const allowed = new Set(DEFAULT_LAYOUTS.map(d => d.i))
    const filtered = parsed.filter(l => allowed.has(l.i))
    const ids = new Set(filtered.map(l => l.i))
    const missing = DEFAULT_LAYOUTS.filter(d => !ids.has(d.i))
    return missing.length > 0 ? [...filtered, ...missing] : filtered
  } catch {
    return DEFAULT_LAYOUTS
  }
}

const MARGIN: [number, number] = [16, 16]
const CONTAINER_PADDING: [number, number] = [16, 16]
// Fraction of the viewport that the calendar/grocery row should occupy.
// Anything below this is the chores "peek" area.
const TOP_SECTION_VIEWPORT_FRACTION = 0.85
// Long-press hold (ms) before mouse-drag scroll engages. Lets normal clicks
// pass through; only sustained presses turn into a drag-to-scroll.
const DRAG_HOLD_MS = 220
// Pixels of travel during the hold window that also engages drag (so a quick
// drag works even if the user doesn't deliberately wait).
const DRAG_MOVE_THRESHOLD = 6

const DashboardGrid: React.FC<DashboardGridProps> = ({ profiles }) => {
  const [layouts] = useState<DashboardLayout[]>(loadLayout)
  const [containerWidth, setContainerWidth] = useState(window.innerWidth)
  const [containerHeight, setContainerHeight] = useState(window.innerHeight)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  const containerElRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    containerElRef.current = node
    if (!node) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
        setContainerHeight(entry.contentRect.height)
        setIsMobile(entry.contentRect.width < 768)
      }
    })
    ro.observe(node)
  }, [])

  // Long-press drag-to-scroll for mouse input (touch uses native scrolling).
  const dragStateRef = useRef<{
    pressed: boolean
    dragging: boolean
    startY: number
    startScroll: number
    holdTimer: number | null
    moved: boolean
  }>({ pressed: false, dragging: false, startY: 0, startScroll: 0, holdTimer: null, moved: false })
  const suppressNextClickRef = useRef(false)

  // Capture-phase click suppressor: if we just finished a drag, swallow the
  // next click so children don't fire (e.g. opening event/chore dialogs).
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suppressNextClickRef.current) {
        e.stopPropagation()
        e.preventDefault()
        suppressNextClickRef.current = false
      }
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [])

  const endDrag = useCallback(() => {
    const state = dragStateRef.current
    if (state.holdTimer != null) {
      window.clearTimeout(state.holdTimer)
      state.holdTimer = null
    }
    if (state.dragging) {
      suppressNextClickRef.current = true
      const el = containerElRef.current
      if (el) el.style.cursor = ''
      document.body.style.userSelect = ''
    }
    state.pressed = false
    state.dragging = false
    state.moved = false
  }, [])

  const beginDragMode = useCallback(() => {
    const state = dragStateRef.current
    if (!state.pressed || state.dragging) return
    state.dragging = true
    const el = containerElRef.current
    if (el) el.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const el = containerElRef.current
    if (!el) return
    const state = dragStateRef.current
    state.pressed = true
    state.dragging = false
    state.moved = false
    state.startY = e.clientY
    state.startScroll = el.scrollTop
    if (state.holdTimer != null) window.clearTimeout(state.holdTimer)
    state.holdTimer = window.setTimeout(beginDragMode, DRAG_HOLD_MS)
  }, [beginDragMode])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const state = dragStateRef.current
    if (!state.pressed) return
    const dy = e.clientY - state.startY
    if (!state.dragging) {
      // Engage early if movement exceeds threshold while still in the hold
      // window, so a quick swipe with the mouse also scrolls.
      if (Math.abs(dy) > DRAG_MOVE_THRESHOLD) beginDragMode()
      else return
    }
    state.moved = true
    const el = containerElRef.current
    if (!el) return
    el.scrollTop = state.startScroll - dy
  }, [beginDragMode])

  // Size rowHeight so the top row (calendar + grocery) consumes ~85% of the
  // viewport. The chores section below then occupies the remaining space and
  // overflows, producing the peek-a-boo affordance.
  const topSectionTarget = containerHeight * TOP_SECTION_VIEWPORT_FRACTION
  const topSectionAvailable =
    topSectionTarget - CONTAINER_PADDING[1] - (TOP_ROWS - 1) * MARGIN[1]
  const rowHeight = Math.max(20, Math.floor(topSectionAvailable / TOP_ROWS))

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      style={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch',
        cursor: 'grab',
      }}
    >
      {isMobile ? (
        // Mobile: simple vertical stack of widgets — react-grid-layout's
        // 12-column model squishes content too small on phones.
        <div
          className="sky-dashboard-stack"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            padding: '1rem',
          }}
        >
          <div className="sky-widget sky-fade-in" style={{ minHeight: '70vh' }}>
            <CalendarWidget profiles={profiles} />
          </div>
          <div className="sky-widget sky-fade-in" style={{ minHeight: '50vh' }}>
            <GroceryWidget profiles={profiles} />
          </div>
          <div className="sky-widget sky-fade-in" style={{ minHeight: '70vh' }}>
            <ChoresDashboardWidget profiles={profiles} />
          </div>
        </div>
      ) : (
        <GridLayout
          className="layout"
          layout={layouts}
          width={containerWidth}
          gridConfig={{
            cols: 12,
            rowHeight,
            margin: MARGIN,
            containerPadding: CONTAINER_PADDING,
          }}
          dragConfig={{ enabled: false }}
          resizeConfig={{ enabled: false }}
        >
          {/* Calendar Panel */}
          <div key="calendar" className="sky-widget sky-fade-in">
            <CalendarWidget profiles={profiles} />
          </div>

          {/* Grocery Quick Add */}
          <div key="grocery" className="sky-widget sky-fade-in">
            <GroceryWidget profiles={profiles} />
          </div>

          {/* Chores (peek-a-boo below the fold) */}
          <div key="chores" className="sky-widget sky-fade-in">
            <ChoresDashboardWidget profiles={profiles} />
          </div>
        </GridLayout>
      )}
    </div>
  )
}

export default DashboardGrid
