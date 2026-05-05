import { useEffect, useRef, type RefObject } from 'react'

interface UseSwipeOptions {
  /** Pixels of horizontal travel required to count as a swipe. Default 50. */
  minDistance?: number
  /** Max ratio of |dy/dx| permitted to still count as horizontal. Default 0.6. */
  maxVerticalRatio?: number
  /** Max touch duration in ms. Default 700. */
  maxDuration?: number
  /** Disable the gesture entirely. */
  disabled?: boolean
  /** Called on right-to-left finger motion. Typically advances "next". */
  onSwipeLeft?: () => void
  /** Called on left-to-right finger motion. Typically advances "previous". */
  onSwipeRight?: () => void
}

/**
 * Attaches passive touch listeners to a target element to detect horizontal
 * swipe gestures. Vertical scrolling stays untouched — we only fire when the
 * gesture is mostly horizontal AND exceeds `minDistance`.
 *
 * Pointer Events would be cleaner, but limiting to touch keeps mouse drags
 * (e.g. calendar event drag-resize) out of the way.
 */
export const useSwipe = (
  target: RefObject<HTMLElement | null>,
  {
    minDistance = 50,
    maxVerticalRatio = 0.6,
    maxDuration = 700,
    disabled = false,
    onSwipeLeft,
    onSwipeRight,
  }: UseSwipeOptions
): void => {
  const stateRef = useRef<{ x: number; y: number; t: number } | null>(null)

  useEffect(() => {
    if (disabled) return
    const el = target.current
    if (!el) return

    const handleStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        stateRef.current = null
        return
      }
      const t = e.touches[0]
      stateRef.current = { x: t.clientX, y: t.clientY, t: Date.now() }
    }

    const handleEnd = (e: TouchEvent) => {
      const start = stateRef.current
      stateRef.current = null
      if (!start) return

      const t = e.changedTouches[0]
      if (!t) return

      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      const elapsed = Date.now() - start.t

      if (elapsed > maxDuration) return
      if (Math.abs(dx) < minDistance) return
      if (Math.abs(dy) / Math.max(Math.abs(dx), 1) > maxVerticalRatio) return

      if (dx < 0) onSwipeLeft?.()
      else onSwipeRight?.()
    }

    const handleCancel = () => {
      stateRef.current = null
    }

    el.addEventListener('touchstart', handleStart, { passive: true })
    el.addEventListener('touchend', handleEnd, { passive: true })
    el.addEventListener('touchcancel', handleCancel, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleStart)
      el.removeEventListener('touchend', handleEnd)
      el.removeEventListener('touchcancel', handleCancel)
    }
  }, [target, minDistance, maxVerticalRatio, maxDuration, disabled, onSwipeLeft, onSwipeRight])
}

export default useSwipe
