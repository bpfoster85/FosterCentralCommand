import { useState } from 'react'

/**
 * Decide whether the app should render its own on-screen keyboard.
 *
 * Strategy:
 *  - Phones / tablets (mobile UA) already get a native keyboard from the OS,
 *    so we return false and let the platform handle it.
 *  - Touch-capable devices with a desktop UA (Windows kiosk PC driving a
 *    wall-mounted touchscreen, for example) won't auto-pop a keyboard, so we
 *    render our own.
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

    const ua = navigator.userAgent
    const isMobileUA = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua)
    if (isMobileUA) return false

    const coarse = window.matchMedia('(pointer: coarse)').matches
    const anyCoarse = window.matchMedia('(any-pointer: coarse)').matches

    // Desktop UA + any touch-capable pointer = kiosk-style touchscreen.
    // We use `anyCoarse` alone (without requiring no-hover) so that a 4K
    // wall-mounted display connected to a PC with a mouse still gets the
    // keyboard when the user touches the screen.
    return coarse || anyCoarse
  })

  return needs
}
