import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { KeyboardReact } from 'react-simple-keyboard'
import 'react-simple-keyboard/build/css/index.css'
import { useNeedsVirtualKeyboard } from '../../hooks/useNeedsVirtualKeyboard'
import './VirtualKeyboard.scss'

type LayoutName = 'default' | 'shift' | 'numeric'

interface VirtualKeyboardContextValue {
  /** Whether the on-screen keyboard is enabled for this device. */
  enabled: boolean
  /** Hide the keyboard immediately (also blurs the focused input). */
  hide: () => void
}

const VirtualKeyboardContext = createContext<VirtualKeyboardContextValue>({
  enabled: false,
  hide: () => {},
})

// eslint-disable-next-line react-refresh/only-export-components
export function useVirtualKeyboard(): VirtualKeyboardContextValue {
  return useContext(VirtualKeyboardContext)
}

type EditableElement = HTMLInputElement | HTMLTextAreaElement

const TEXTUAL_INPUT_TYPES = new Set([
  'text',
  'search',
  'email',
  'url',
  'tel',
  'password',
  'number',
  '',
])

function isEditable(el: EventTarget | null): el is EditableElement {
  if (el instanceof HTMLTextAreaElement) {
    return !el.readOnly && !el.disabled
  }
  if (el instanceof HTMLInputElement) {
    return (
      !el.readOnly && !el.disabled && TEXTUAL_INPUT_TYPES.has(el.type)
    )
  }
  return false
}

function isOptedOut(el: EditableElement): boolean {
  // Allow individual inputs to opt out via data-virtual-keyboard="off".
  return el.dataset.virtualKeyboard === 'off'
}

function pickInitialLayout(el: EditableElement): LayoutName {
  if (el instanceof HTMLInputElement) {
    if (
      el.type === 'number' ||
      el.type === 'tel' ||
      el.inputMode === 'numeric' ||
      el.inputMode === 'decimal' ||
      el.inputMode === 'tel'
    ) {
      return 'numeric'
    }
  }
  return 'default'
}

/**
 * Push a new value into a controlled React input/textarea so that the
 * component's `onChange` handler fires. React tracks the previous value on
 * the DOM node, so we have to use the native value setter to bypass that
 * cache before dispatching an `input` event.
 */
function writeValueToElement(el: EditableElement, next: string): void {
  const prototype =
    el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  if (setter) {
    setter.call(el, next)
  } else {
    el.value = next
  }
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

interface SimpleKeyboardInstance {
  setInput: (input: string) => void
  clearInput: () => void
}

const KEYBOARD_LAYOUTS = {
  default: [
    '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
    '{tab} q w e r t y u i o p [ ] \\',
    "{lock} a s d f g h j k l ; ' {enter}",
    '{shift} z x c v b n m , . / {shift}',
    '{numeric} @ {space} .com',
  ],
  shift: [
    '~ ! @ # $ % ^ &amp; * ( ) _ + {bksp}',
    '{tab} Q W E R T Y U I O P { } |',
    '{lock} A S D F G H J K L : " {enter}',
    '{shift} Z X C V B N M &lt; &gt; ? {shift}',
    '{numeric} @ {space} .com',
  ],
  numeric: [
    '1 2 3',
    '4 5 6',
    '7 8 9',
    '{abc} 0 {bksp}',
  ],
}

const KEYBOARD_DISPLAY = {
  '{bksp}': '⌫',
  '{enter}': '⏎',
  '{shift}': '⇧',
  '{lock}': '⇪',
  '{tab}': 'tab',
  '{space}': 'space',
  '{numeric}': '123',
  '{abc}': 'ABC',
}

interface Props {
  children: ReactNode
}

export function VirtualKeyboardProvider({ children }: Props) {
  const enabled = useNeedsVirtualKeyboard()
  const [target, setTarget] = useState<EditableElement | null>(null)
  const [layoutName, setLayoutName] = useState<LayoutName>('default')
  const keyboardRef = useRef<SimpleKeyboardInstance | null>(null)

  // Track focus globally and decide whether to show the keyboard.
  useEffect(() => {
    if (!enabled) return

    const onFocusIn = (e: FocusEvent): void => {
      const el = e.target
      if (isEditable(el) && !isOptedOut(el)) {
        setTarget(el)
        setLayoutName(pickInitialLayout(el))
      }
    }

    const onFocusOut = (): void => {
      // Defer so that focus moving between two inputs (or to a keyboard
      // button that immediately returns focus) doesn't flicker the overlay.
      window.setTimeout(() => {
        const active = document.activeElement
        if (!isEditable(active) || isOptedOut(active)) {
          setTarget(null)
        }
      }, 50)
    }

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setTarget(null)
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [enabled])

  // Sync the keyboard's internal buffer with the focused element's value
  // and scroll the input into view above the keyboard.
  useEffect(() => {
    if (!target) return
    keyboardRef.current?.setInput(target.value ?? '')

    // Track both animation frame IDs so we can cancel them on cleanup.
    let raf2: number | undefined

    // Wait two frames: one for the keyboard overlay to mount and measure its
    // height, another for the layout to settle after any scroll.
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        const overlayEl = document.querySelector<HTMLElement>('.virtual-keyboard-overlay')
        const keyboardHeight = overlayEl ? overlayEl.getBoundingClientRect().height : 300
        const MARGIN = 20 // gap between input bottom and keyboard top

        const rect = target.getBoundingClientRect()
        const visibleBottom = window.innerHeight - keyboardHeight - MARGIN

        if (rect.bottom > visibleBottom) {
          const delta = rect.bottom - visibleBottom

          // Walk up the DOM to find the nearest scrollable container.
          let parent = target.parentElement
          let scrolled = false
          while (parent && parent !== document.body) {
            const { overflowY } = window.getComputedStyle(parent)
            if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
              parent.scrollTop += delta
              scrolled = true
              break
            }
            parent = parent.parentElement
          }
          if (!scrolled) {
            window.scrollBy({ top: delta, behavior: 'smooth' })
          }
        }
      })
    })

    return () => {
      window.cancelAnimationFrame(raf1)
      if (raf2 !== undefined) window.cancelAnimationFrame(raf2)
    }
  }, [target])

  // Add a body class while visible so global styles can shift focused content
  // up if needed.
  useEffect(() => {
    if (!target) return
    document.body.classList.add('virtual-keyboard-open')
    return () => document.body.classList.remove('virtual-keyboard-open')
  }, [target])

  const handleChange = (next: string): void => {
    if (!target) return
    writeValueToElement(target, next)
  }

  const handleKeyPress = (button: string): void => {
    if (button === '{shift}' || button === '{lock}') {
      setLayoutName(prev => (prev === 'default' ? 'shift' : 'default'))
      return
    }
    if (button === '{numeric}') {
      setLayoutName('numeric')
      return
    }
    if (button === '{abc}') {
      setLayoutName('default')
      return
    }
    if (button === '{enter}') {
      if (target instanceof HTMLInputElement && target.form) {
        target.form.requestSubmit()
      }
      return
    }
    // After a regular character on the shift layer, fall back to default.
    if (layoutName === 'shift' && !button.startsWith('{')) {
      setLayoutName('default')
    }
  }

  const hide = (): void => {
    if (target) target.blur()
    setTarget(null)
  }

  const ctxValue: VirtualKeyboardContextValue = { enabled, hide }

  return (
    <VirtualKeyboardContext.Provider value={ctxValue}>
      {children}
      {enabled && target && (
        <div
          className="virtual-keyboard-overlay"
          role="dialog"
          aria-label="On-screen keyboard"
          // Prevent mousedown from stealing focus from the active input.
          onMouseDown={e => e.preventDefault()}
          onTouchStart={e => e.stopPropagation()}
        >
          <div className="virtual-keyboard-toolbar">
            <button
              type="button"
              className="virtual-keyboard-toolbar__btn"
              onClick={() =>
                setLayoutName(prev =>
                  prev === 'numeric' ? 'default' : 'numeric',
                )
              }
            >
              {layoutName === 'numeric' ? 'ABC' : '123'}
            </button>
            <span className="virtual-keyboard-toolbar__spacer" />
            <button
              type="button"
              className="virtual-keyboard-toolbar__btn"
              onClick={hide}
              aria-label="Close keyboard"
            >
              Close
            </button>
          </div>
          <KeyboardReact
            keyboardRef={(r: SimpleKeyboardInstance) => {
              keyboardRef.current = r
            }}
            layoutName={layoutName}
            layout={KEYBOARD_LAYOUTS}
            display={KEYBOARD_DISPLAY}
            mergeDisplay
            preventMouseDownDefault
            stopMouseDownPropagation
            physicalKeyboardHighlight={false}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            theme="hg-theme-default hg-layout-default virtual-keyboard"
          />
        </div>
      )}
    </VirtualKeyboardContext.Provider>
  )
}
