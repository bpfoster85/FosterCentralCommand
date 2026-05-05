import React, { useRef, useState } from 'react'

interface SwipeToDeleteProps {
  /** Pixels of leftward drag required to commit the delete. */
  threshold?: number
  onDelete: () => void
  children: React.ReactNode
}

/**
 * Swipe-left-to-delete row. Uses pointer events so mouse drag, pen, and
 * touch all work the same way. The row translates with the pointer; if
 * released past the threshold it snaps to fully-swiped, fades, and calls
 * <c>onDelete</c>; otherwise it springs back.
 */
const SwipeToDelete: React.FC<SwipeToDeleteProps> = ({
  threshold = 80,
  onDelete,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef<number | null>(null)
  const lockedAxisRef = useRef<'x' | 'y' | null>(null)

  const [offset, setOffset] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [committed, setCommitted] = useState(false)

  const reset = () => {
    startXRef.current = null
    lockedAxisRef.current = null
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (committed) return
    startXRef.current = e.clientX
    lockedAxisRef.current = null
    setAnimating(false)
    // Capture so we keep getting move/up even if the pointer leaves the row.
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (committed || startXRef.current === null) return
    const dx = e.clientX - startXRef.current
    const dy = (e as unknown as { movementY?: number }).movementY ?? 0

    // First meaningful move locks the gesture axis so we don't fight
    // vertical scroll.
    if (lockedAxisRef.current === null) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return
      lockedAxisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (lockedAxisRef.current !== 'x') return

    // Only allow leftward drag — no point dragging right.
    setOffset(Math.min(0, dx))
  }

  const finishSwipe = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    if (committed) return

    const width = containerRef.current?.offsetWidth ?? 0
    setAnimating(true)
    if (-offset >= threshold) {
      setCommitted(true)
      // Slide all the way out, then fire the delete on transition end.
      setOffset(-width)
    } else {
      setOffset(0)
    }
    reset()
  }

  const onTransitionEnd = () => {
    if (committed) {
      onDelete()
    } else {
      setAnimating(false)
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'pan-y',
        userSelect: 'none',
      }}
    >
      {/* Red "delete" backdrop revealed as the row slides left */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '1rem',
          background: 'var(--sky-coral, #d64545)',
          color: '#fff',
          fontWeight: 600,
          fontSize: '0.85rem',
          gap: '0.4rem',
        }}
      >
        <i className="pi pi-trash" />
        <span>Delete</span>
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishSwipe}
        onPointerCancel={finishSwipe}
        onTransitionEnd={onTransitionEnd}
        style={{
          position: 'relative',
          transform: `translateX(${offset}px)`,
          transition: animating ? 'transform 180ms ease-out' : 'none',
          background: 'var(--surface-card, var(--sky-surface, #fff))',
          cursor: 'grab',
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default SwipeToDelete
