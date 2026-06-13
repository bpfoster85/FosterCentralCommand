import { useEffect, useRef } from 'react'

// Quiet hours: background polling is suppressed between START (inclusive) and
// END (exclusive), local wall-clock time. User-initiated calls (page load,
// button click) still run — only the interval-driven refresh is paused so the
// API can scale to zero overnight.
export const QUIET_HOURS_START = 23 // 11 PM
export const QUIET_HOURS_END = 6 //  6 AM

export const isInQuietHours = (date: Date = new Date()): boolean => {
  if (QUIET_HOURS_START === QUIET_HOURS_END) return false
  const h = date.getHours()
  return QUIET_HOURS_START < QUIET_HOURS_END
    ? h >= QUIET_HOURS_START && h < QUIET_HOURS_END
    : h >= QUIET_HOURS_START || h < QUIET_HOURS_END
}

/**
 * Invokes `callback` on a fixed interval. The latest callback is always used
 * (via a ref) so changing it does not reset the timer.
 */
export const usePolling = (
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled: boolean = true,
) => {
  const cbRef = useRef(callback)

  useEffect(() => {
    cbRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return

    const tick = () => {
      if (isInQuietHours() || document.hidden) return
      void cbRef.current()
    }

    const id = window.setInterval(tick, intervalMs)

    // When the tab becomes visible again, refresh immediately so the user
    // isn't staring at stale data for up to `intervalMs`.
    const onVisibility = () => {
      if (!document.hidden && !isInQuietHours()) void cbRef.current()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [intervalMs, enabled])
}
