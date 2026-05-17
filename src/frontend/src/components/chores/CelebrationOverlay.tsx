import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rotation: number
  rotationSpeed: number
  opacity: number
  shape: 'rect' | 'circle' | 'star'
  gravity: number
}

interface Firework {
  x: number
  y: number
  particles: FireworkParticle[]
  done: boolean
}

interface FireworkParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  opacity: number
  tail: { x: number; y: number }[]
}

const CONFETTI_COLORS = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
  '#C77DFF', '#FF9B54', '#00B4D8', '#F72585',
  '#7BF1A8', '#FFC6FF',
]

const FIREWORK_COLORS = [
  '#FFD700', '#FF4500', '#00FF7F', '#00BFFF',
  '#FF69B4', '#ADFF2F', '#FF6347', '#7B68EE',
]

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function createConfettiParticle(canvas: HTMLCanvasElement): Particle {
  const shapes: Particle['shape'][] = ['rect', 'circle', 'star']
  return {
    x: randomBetween(0, canvas.width),
    y: randomBetween(-150, -10),
    vx: randomBetween(-3, 3),
    vy: randomBetween(2, 6),
    size: randomBetween(6, 14),
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: randomBetween(0, Math.PI * 2),
    rotationSpeed: randomBetween(-0.1, 0.1),
    opacity: 1,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    gravity: randomBetween(0.05, 0.15),
  }
}

function createFirework(canvas: HTMLCanvasElement): Firework {
  const x = randomBetween(canvas.width * 0.2, canvas.width * 0.8)
  const y = randomBetween(canvas.height * 0.1, canvas.height * 0.5)
  const count = Math.floor(randomBetween(24, 40))
  const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]
  const particles: FireworkParticle[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const speed = randomBetween(3, 9)
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: randomBetween(3, 6),
      color,
      opacity: 1,
      tail: [],
    })
  }
  return { x, y, particles, done: false }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const spikes = 5
  const outerRadius = r
  const innerRadius = r * 0.4
  let rot = (Math.PI / 2) * 3
  const step = Math.PI / spikes
  ctx.beginPath()
  ctx.moveTo(cx, cy - outerRadius)
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(
      cx + Math.cos(rot) * outerRadius,
      cy + Math.sin(rot) * outerRadius,
    )
    rot += step
    ctx.lineTo(
      cx + Math.cos(rot) * innerRadius,
      cy + Math.sin(rot) * innerRadius,
    )
    rot += step
  }
  ctx.lineTo(cx, cy - outerRadius)
  ctx.closePath()
}

interface CelebrationOverlayProps {
  active: boolean
  message?: string
  duration?: number
  onDone?: () => void
}

const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  active,
  message,
  duration = 6500,
  onDone,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const confettiRef = useRef<Particle[]>([])
  const fireworksRef = useRef<Firework[]>([])
  const nextFireworkRef = useRef<number>(0)
  // Keep the latest onDone in a ref so changing it doesn't restart the animation.
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone }, [onDone])

  useEffect(() => {
    if (!active) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Seed initial confetti
    confettiRef.current = Array.from({ length: 120 }, () => createConfettiParticle(canvas))
    fireworksRef.current = []
    nextFireworkRef.current = 0
    startTimeRef.current = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current
      const remaining = duration - elapsed
      const fadeFraction = remaining < 800 ? remaining / 800 : 1

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Schedule fireworks every ~600 ms for first 2.5 s
      if (now > nextFireworkRef.current && elapsed < duration * 0.7) {
        fireworksRef.current.push(createFirework(canvas))
        nextFireworkRef.current = now + randomBetween(400, 800)
      }

      // Draw fireworks
      for (const fw of fireworksRef.current) {
        let allFaded = true
        for (const p of fw.particles) {
          p.tail.push({ x: p.x, y: p.y })
          if (p.tail.length > 5) p.tail.shift()
          p.x += p.vx
          p.y += p.vy
          p.vy += 0.18
          p.vx *= 0.97
          p.opacity -= 0.018
          if (p.opacity > 0) allFaded = false

          // Draw tail
          for (let t = 0; t < p.tail.length; t++) {
            const tOpacity = (t / p.tail.length) * p.opacity * 0.5 * fadeFraction
            ctx.globalAlpha = Math.max(0, tOpacity)
            ctx.fillStyle = p.color
            ctx.beginPath()
            ctx.arc(p.tail[t].x, p.tail[t].y, p.size * 0.5, 0, Math.PI * 2)
            ctx.fill()
          }

          ctx.globalAlpha = Math.max(0, p.opacity * fadeFraction)
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        }
        if (allFaded) fw.done = true
      }
      fireworksRef.current = fireworksRef.current.filter(fw => !fw.done)

      // Draw & update confetti
      for (const p of confettiRef.current) {
        p.x += p.vx
        p.y += p.vy
        p.vy += p.gravity
        p.vx *= 0.99
        p.rotation += p.rotationSpeed

        // Wrap around top when they fall off the bottom
        if (p.y > canvas.height + 20) {
          p.y = randomBetween(-150, -10)
          p.x = randomBetween(0, canvas.width)
          p.vy = randomBetween(2, 6)
          p.opacity = 1
        }

        if (elapsed > duration * 0.6) {
          p.opacity = Math.max(0, p.opacity - 0.012)
        }

        ctx.globalAlpha = Math.max(0, p.opacity * fadeFraction)
        ctx.fillStyle = p.color
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        } else if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          drawStar(ctx, 0, 0, p.size / 2)
          ctx.fill()
        }
        ctx.restore()
      }

      ctx.globalAlpha = 1

      if (elapsed < duration) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        onDoneRef.current?.()
      }
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [active, duration])

  if (!active) return null

  // Portal to document.body so position: fixed isn't trapped by any
  // transformed ancestor (e.g. react-grid-layout's widget containers on the
  // dashboard) — without this, the overlay would be clipped to the widget
  // instead of covering the whole viewport.
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        // pointerEvents: 'auto' on the container captures clicks for dismissal.
        // The canvas child uses pointerEvents: 'none' so clicks pass through it
        // to this container rather than being absorbed by the canvas element.
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={() => onDoneRef.current?.()}
      role="dialog"
      aria-modal="true"
      aria-label="Celebration"
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      {message && (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            borderRadius: '24px',
            padding: '1.5rem 2.5rem',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            textAlign: 'center',
            maxWidth: '80vw',
            animation: 'sky-pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
          <div
            style={{
              fontSize: '1.6rem',
              fontWeight: 700,
              color: 'var(--sky-charcoal, #2d3436)',
              letterSpacing: '-0.02em',
            }}
          >
            {message}
          </div>
          <div
            style={{
              marginTop: '0.75rem',
              fontSize: '0.95rem',
              color: 'var(--sky-text-secondary, #636e72)',
            }}
          >
            Tap anywhere to dismiss
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}

export default CelebrationOverlay
