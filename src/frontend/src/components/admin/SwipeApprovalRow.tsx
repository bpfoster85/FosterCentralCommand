import React, { useRef, useState } from 'react'

interface SwipeApprovalRowProps {
  /** Pixels of horizontal drag required to commit. Default 90. */
  threshold?: number
  onApprove: () => void
  onReject: () => void
  children: React.ReactNode
}

type Decision = 'approve' | 'reject'

/**
 * Bidirectional swipe row used for moderation:
 * - Swipe LEFT  → approve (green backdrop reveals on the right)
 * - Swipe RIGHT → reject  (red backdrop reveals on the left)
 *
 * Visually and behaviorally mirrors the lists' SwipeToDelete so the gesture
 * feels native on touch and works with mouse/pen too.
 */
const SwipeApprovalRow: React.FC<SwipeApprovalRowProps> = ({
  threshold = 90,
  onApprove,
  onReject,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef<number | null>(null)
  const lockedAxisRef = useRef<'x' | 'y' | null>(null)

  const [offset, setOffset] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [committed, setCommitted] = useState<Decision | null>(null)

  const reset = () => {
    startXRef.current = null
    lockedAxisRef.current = null
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (committed) return
    startXRef.current = e.clientX
    lockedAxisRef.current = null
    setAnimating(false)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (committed || startXRef.current === null) return
    const dx = e.clientX - startXRef.current
    const dy = (e as unknown as { movementY?: number }).movementY ?? 0

    if (lockedAxisRef.current === null) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return
      lockedAxisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (lockedAxisRef.current !== 'x') return

    setOffset(dx)
  }

  const finishSwipe = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    if (committed) return

    const width = containerRef.current?.offsetWidth ?? 0
    setAnimating(true)

    if (offset <= -threshold) {
      setCommitted('approve')
      setOffset(-width)
    } else if (offset >= threshold) {
      setCommitted('reject')
      setOffset(width)
    } else {
      setOffset(0)
    }
    reset()
  }

  const onTransitionEnd = () => {
    if (committed === 'approve') {
      onApprove()
    } else if (committed === 'reject') {
      onReject()
    } else {
      setAnimating(false)
    }
  }

  // Hint intensity grows with drag distance.
  const approveStrength = Math.max(0, Math.min(1, -offset / threshold))
  const rejectStrength = Math.max(0, Math.min(1, offset / threshold))

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'pan-y',
        userSelect: 'none',
        borderRadius: 'var(--sky-radius-md, 12px)',
      }}
    >
      {/* Reject backdrop (revealed when swiping RIGHT) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingLeft: '1rem',
          background: 'var(--sky-coral, #d64545)',
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.95rem',
          gap: '0.4rem',
          opacity: offset > 0 ? 1 : 0,
        }}
      >
        <i
          className="pi pi-times"
          style={{
            fontSize: '1.1rem',
            transform: `scale(${0.9 + rejectStrength * 0.3})`,
            transition: 'transform 0.1s ease',
          }}
        />
        <span>Reject</span>
      </div>

      {/* Approve backdrop (revealed when swiping LEFT) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '1rem',
          background: 'var(--sky-lagoon, #4caf7a)',
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.95rem',
          gap: '0.4rem',
          opacity: offset < 0 ? 1 : 0,
        }}
      >
        <span>Approve</span>
        <i
          className="pi pi-check"
          style={{
            fontSize: '1.1rem',
            transform: `scale(${0.9 + approveStrength * 0.3})`,
            transition: 'transform 0.1s ease',
          }}
        />
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

export default SwipeApprovalRow
