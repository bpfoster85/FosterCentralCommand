import React, { useEffect, useRef, useState } from 'react'
import type { Profile } from '../../types'

interface MobileProfilePickerProps {
  profiles: Profile[]
  value: string | null
  onChange: (id: string | null) => void
  allLabel?: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Inline collapsible profile selector for mobile. Renders a trigger button
 * that toggles an in-flow panel of profile rows. Because the panel is part
 * of the document flow (not an absolutely-positioned popup), it can never
 * overflow off the bottom of the viewport like a native <select> can.
 */
const MobileProfilePicker: React.FC<MobileProfilePickerProps> = ({
  profiles,
  value,
  onChange,
  allLabel = 'All profiles',
  className,
  style,
}) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node | null
      if (rootRef.current && t && !rootRef.current.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selected = value ? profiles.find(p => p.id === value) ?? null : null
  const totalStars = profiles.reduce((s, p) => s + (p.totalStars ?? 0), 0)
  const accent = selected?.color ?? 'var(--sky-amber)'

  const select = (id: string | null) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className={`sky-mobile-profile-picker ${className ?? ''}`}
      style={style}
    >
      <button
        type="button"
        className="sky-mobile-profile-picker__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        style={{ borderColor: accent }}
      >
        {selected ? (
          <>
            <span
              className="sky-mobile-profile-picker__avatar"
              style={{ background: selected.color }}
            >
              {selected.name.charAt(0).toUpperCase()}
            </span>
            <span className="sky-mobile-profile-picker__label">{selected.name}</span>
            <span className="sky-mobile-profile-picker__stars">
              <i className="pi pi-star-fill" />
              {selected.totalStars ?? 0}
            </span>
          </>
        ) : (
          <>
            <span
              className="sky-mobile-profile-picker__avatar"
              style={{ background: 'var(--sky-lagoon-deep)' }}
            >
              <i className="pi pi-users" style={{ fontSize: '0.8rem' }} />
            </span>
            <span className="sky-mobile-profile-picker__label">{allLabel}</span>
            <span className="sky-mobile-profile-picker__stars">
              <i className="pi pi-star-fill" />
              {totalStars}
            </span>
          </>
        )}
        <i
          className={`pi pi-chevron-${open ? 'up' : 'down'} sky-mobile-profile-picker__chevron`}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Profile"
          className="sky-mobile-profile-picker__panel"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === null}
              className={`sky-mobile-profile-picker__option ${value === null ? 'is-selected' : ''}`}
              onClick={() => select(null)}
            >
              <span
                className="sky-mobile-profile-picker__avatar"
                style={{ background: 'var(--sky-lagoon-deep)' }}
              >
                <i className="pi pi-users" style={{ fontSize: '0.8rem' }} />
              </span>
              <span className="sky-mobile-profile-picker__label">{allLabel}</span>
              <span className="sky-mobile-profile-picker__stars">
                <i className="pi pi-star-fill" />
                {totalStars}
              </span>
              {value === null && (
                <i className="pi pi-check sky-mobile-profile-picker__check" aria-hidden />
              )}
            </button>
          </li>
          {profiles.map(p => {
            const active = value === p.id
            return (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`sky-mobile-profile-picker__option ${active ? 'is-selected' : ''}`}
                  onClick={() => select(p.id)}
                >
                  <span
                    className="sky-mobile-profile-picker__avatar"
                    style={{ background: p.color }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="sky-mobile-profile-picker__label">{p.name}</span>
                  <span className="sky-mobile-profile-picker__stars">
                    <i className="pi pi-star-fill" />
                    {p.totalStars ?? 0}
                  </span>
                  {active && (
                    <i className="pi pi-check sky-mobile-profile-picker__check" aria-hidden />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default MobileProfilePicker
