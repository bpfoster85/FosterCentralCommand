import { useEffect, useRef } from 'react'

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
    const id = window.setInterval(() => {
      void cbRef.current()
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs, enabled])
}
