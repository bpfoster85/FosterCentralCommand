import { useState } from 'react'

/**
 * Decide whether the app should render its own on-screen keyboard.
 *
 * Strategy:
 *  - Any touch-capable device (coarse primary pointer OR any coarse pointer)
 *    gets the on-screen keyboard.  This covers kiosk PCs with wall-mounted
 *    touchscreens, Windows tablets, iPads, and Android tablets used as fixed
 *    displays.
 *  - The result can be forced on/off via `localStorage.virtualKeyboard`
 *    (`'force'` or `'off'`) for testing on a regular desktop.
 *
 * The decision is computed once on first render and cached for the lifetime
 * of the component because the underlying capabilities don't change at
 * runtime.
 */
export function useNeedsVirtualKeyboard(): boolean {
  const [needs] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false

    const override = window.localStorage?.getItem('virtualKeyboard')
    if (override === 'force') return true
    if (override === 'off') return false

    const coarse = window.matchMedia('(pointer: coarse)').matches
    const anyCoarse = window.matchMedia('(any-pointer: coarse)').matches

    // Show the on-screen keyboard for any touch-capable device — kiosk PC,
    // wall-mounted touchscreen, or tablet — so the user can type without a
    // physical keyboard.  We intentionally skip the mobile-UA heuristic
    // because tablets (iPad, Android) are also used as fixed kiosk displays
    // and still need this keyboard.
    return coarse || anyCoarse
  })

  return needs
}
