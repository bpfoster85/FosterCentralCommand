import { useEffect, useRef, useState, type RefObject } from 'react'

interface UsePullToRefreshOptions {
  /** Async callback invoked when the gesture exceeds the threshold. */
  onRefresh: () => void | Promise<void>
  /** Pixels of downward travel required to trigger refresh. Default 70. */
  threshold?: number
  /** Cap on visible pull distance, in pixels. Default 110. */
  maxDistance?: number
  /** Disable the gesture entirely. */
  disabled?: boolean
}

interface PullState {
  /** Current visible pull distance in pixels (0 when idle). */
  distance: number
  /** True once threshold is reached during the current gesture. */
  ready: boolean
  /** True while the refresh callback is running. */
  refreshing: boolean
}

/**
 * Pull-to-refresh for a vertically scrollable element. Only engages when the
 * element is already scrolled to the very top, so it doesn't fight normal
 * scrolling. Caller renders the indicator using the returned state.
 */
export const usePullToRefresh = (
  target: RefObject<HTMLElement | null>,
  { onRefresh, threshold = 70, maxDistance = 110, disabled = false }: UsePullToRefreshOptions,
): PullState => {
  const [state, setState] = useState<PullState>({ distance: 0, ready: false, refreshing: false })
  const startYRef = useRef<number | null>(null)
  const activeRef = useRef(false)
  const readyRef = useRef(false)
  const refreshingRef = useRef(false)

  useEffect(() => {
    if (disabled) return
    const el = target.current
    if (!el) return

    const handleStart = (e: TouchEvent) => {
      if (refreshingRef.current) return
      if (e.touches.length !== 1) return
      if (el.scrollTop > 0) return
      startYRef.current = e.touches[0].clientY
      activeRef.current = false
      readyRef.current = false
    }

    const handleMove = (e: TouchEvent) => {
      if (refreshingRef.current) return
      const startY = startYRef.current
      if (startY == null) return
      const dy = e.touches[0].clientY - startY
      if (dy <= 0) {
        if (activeRef.current) {
          activeRef.current = false
          readyRef.current = false
          setState(s => ({ ...s, distance: 0, ready: false }))
        }
        return
      }
      // Only treat as a pull once the user has dragged a little, so taps
      // and tiny finger jitter don't trigger any visual movement.
      if (!activeRef.current && dy < 6) return
      activeRef.current = true

      // Resistance: linear up to threshold, then dampened beyond.
      const resisted = dy <= threshold ? dy : threshold + (dy - threshold) * 0.4
      const distance = Math.min(resisted, maxDistance)
      const ready = distance >= threshold
      readyRef.current = ready
      setState({ distance, ready, refreshing: false })
    }

    const handleEnd = async () => {
      if (refreshingRef.current) return
      const wasReady = activeRef.current && readyRef.current
      activeRef.current = false
      startYRef.current = null
      readyRef.current = false

      if (!wasReady) {
        setState(s => ({ ...s, distance: 0, ready: false }))
        return
      }

      refreshingRef.current = true
      setState({ distance: threshold, ready: true, refreshing: true })
      try {
        await onRefresh()
      } finally {
        refreshingRef.current = false
        setState({ distance: 0, ready: false, refreshing: false })
      }
    }

    el.addEventListener('touchstart', handleStart, { passive: true })
    el.addEventListener('touchmove', handleMove, { passive: true })
    el.addEventListener('touchend', handleEnd, { passive: true })
    el.addEventListener('touchcancel', handleEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleStart)
      el.removeEventListener('touchmove', handleMove)
      el.removeEventListener('touchend', handleEnd)
      el.removeEventListener('touchcancel', handleEnd)
    }
  }, [target, onRefresh, threshold, maxDistance, disabled])

  return state
}
