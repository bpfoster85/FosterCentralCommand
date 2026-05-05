import React, { useEffect, useState } from 'react'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { Calendar } from 'primereact/calendar'
import { Dropdown } from 'primereact/dropdown'
import type { Chore, ChoreRecurrence, Profile } from '../../types'
import type { ChoreCreatePayload, ChoreUpdatePayload } from '../../api/chores'
import { DAY_LABELS_SHORT, fromDateKey, toDateKey } from '../../utils/choreSchedule'

interface StarPickerProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
}

/**
 * Tap-a-star picker. Click the Nth star to set the value to N. Hover/focus
 * preview is supported on devices that have it; keyboard arrow keys adjust.
 */
const StarPicker: React.FC<StarPickerProps> = ({ value, onChange, min, max }) => {
  const [hover, setHover] = useState<number | null>(null)
  const display = hover ?? value

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      onChange(Math.max(min, value - 1))
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      onChange(Math.min(max, value + 1))
    } else if (e.key === 'Home') {
      e.preventDefault(); onChange(min)
    } else if (e.key === 'End') {
      e.preventDefault(); onChange(max)
    }
  }

  return (
    <div
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label="Star value"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseLeave={() => setHover(null)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 0.75rem',
        borderRadius: 'var(--sky-radius-md, 12px)',
        background: 'var(--sky-surface-soft, rgba(160, 200, 220, 0.08))',
        outline: 'none',
      }}
    >
      <div style={{ display: 'flex', flex: 1, gap: '0.25rem' }}>
        {Array.from({ length: max - min + 1 }, (_, i) => {
          const n = min + i
          const filled = n <= display
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onBlur={() => setHover(null)}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              style={{
                flex: '1 1 0',
                minWidth: '36px',
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: filled ? 'var(--sky-amber)' : 'var(--sky-border, rgba(0,0,0,0.22))',
                transition: 'transform 0.1s ease, color 0.15s ease',
                transform: filled ? 'scale(1)' : 'scale(0.92)',
              }}
            >
              <i
                className={filled ? 'pi pi-star-fill' : 'pi pi-star'}
                style={{ fontSize: '1.5rem' }}
              />
            </button>
          )
        })}
      </div>
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.2rem 0.7rem',
          borderRadius: '999px',
          background: 'rgba(232, 185, 116, 0.18)',
          color: 'var(--sky-amber)',
          fontWeight: 700,
          fontSize: '0.9rem',
          minWidth: '3rem',
          justifyContent: 'center',
        }}
      >
        <i className="pi pi-star-fill" style={{ fontSize: '0.75rem' }} />
        {display}
      </span>
    </div>
  )
}

interface ChoreEditorDialogProps {
  visible: boolean
  profiles: Profile[]
  initialChore?: Chore | null
  defaultDate?: Date
  /** When true, exposes the star value field. Defaults to false. */
  allowEditStarValue?: boolean
  onClose: () => void
  onCreate?: (data: ChoreCreatePayload) => Promise<unknown>
  onUpdate?: (id: string, data: ChoreUpdatePayload) => Promise<unknown>
  onDelete?: (id: string) => Promise<unknown>
}

const RECURRENCE_OPTIONS: { label: string; value: ChoreRecurrence }[] = [
  { label: 'One time', value: 'None' },
  { label: 'Every day', value: 'Daily' },
  { label: 'Every other day', value: 'EveryOtherDay' },
  { label: 'Specific days', value: 'Weekly' },
]

const MIN_STAR = 1
const MAX_STAR = 10

const ChoreEditorDialog: React.FC<ChoreEditorDialogProps> = ({
  visible,
  profiles,
  initialChore,
  defaultDate,
  allowEditStarValue = false,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const editing = !!initialChore
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  // Multi-select when creating (one chore is created per selected profile);
  // single-select when editing (a chore has exactly one assignee).
  const [assignedProfileIds, setAssignedProfileIds] = useState<string[]>([])
  const [starValue, setStarValue] = useState<number>(1)
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [recurrence, setRecurrence] = useState<ChoreRecurrence>('None')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const [endDate, setEndDate] = useState<Date | null>(null)

  useEffect(() => {
    if (!visible) return
    if (initialChore) {
      setTitle(initialChore.title)
      setDescription(initialChore.description ?? '')
      setAssignedProfileIds([initialChore.assignedProfileId])
      setStarValue(Math.min(MAX_STAR, Math.max(MIN_STAR, initialChore.starValue)))
      setDueDate(fromDateKey(initialChore.dueDate))
      setRecurrence(initialChore.recurrence)
      setDaysOfWeek(initialChore.recurrenceDaysOfWeek ?? [])
      setEndDate(initialChore.recurrenceEndDate ? fromDateKey(initialChore.recurrenceEndDate) : null)
    } else {
      setTitle('')
      setDescription('')
      setAssignedProfileIds([])
      setStarValue(1)
      setDueDate(defaultDate ?? new Date())
      setRecurrence('None')
      setDaysOfWeek([])
      setEndDate(null)
    }
  }, [visible, initialChore, defaultDate, profiles])

  const canSave = title.trim().length > 0 && assignedProfileIds.length > 0 && !!dueDate &&
    (recurrence !== 'Weekly' || daysOfWeek.length > 0)

  const toggleProfile = (id: string) => {
    if (editing) {
      // Editing a single chore — selecting another profile reassigns it.
      setAssignedProfileIds([id])
      return
    }
    setAssignedProfileIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    if (!canSave || !dueDate || assignedProfileIds.length === 0) return
    const basePayload: Omit<ChoreCreatePayload, 'assignedProfileId'> = {
      title: title.trim(),
      description: description.trim() || undefined,
      starValue,
      dueDate: toDateKey(dueDate),
      recurrence,
      recurrenceDaysOfWeek: recurrence === 'Weekly' ? daysOfWeek : [],
      recurrenceEndDate: endDate ? toDateKey(endDate) : null,
    }
    if (editing && initialChore && onUpdate) {
      await onUpdate(initialChore.id, { ...basePayload, assignedProfileId: assignedProfileIds[0] })
    } else if (onCreate) {
      // One chore per selected profile.
      for (const profileId of assignedProfileIds) {
        await onCreate({ ...basePayload, assignedProfileId: profileId })
      }
    }
    onClose()
  }

  const handleDelete = async () => {
    if (!editing || !initialChore || !onDelete) return
    await onDelete(initialChore.id)
    onClose()
  }

  return (
    <Dialog
      header={editing ? 'Edit Chore' : 'New Chore'}
      visible={visible}
      onHide={onClose}
      style={{ width: '92vw', maxWidth: '820px' }}
      footer={
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
          <div>
            {editing && onDelete && (
              <Button
                label="Delete"
                icon="pi pi-trash"
                className="p-button-text p-button-danger"
                onClick={handleDelete}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button label="Cancel" className="p-button-text" onClick={onClose} />
            <Button label={editing ? 'Save' : 'Create'} onClick={handleSave} disabled={!canSave} />
          </div>
        </div>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          columnGap: '1rem',
          rowGap: '1rem',
        }}
      >
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Title *</label>
          <InputText value={title} onChange={e => setTitle(e.target.value)} className="w-full" placeholder="e.g. Mow the yard" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description</label>
          <InputTextarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Assigned to *{!editing && (
              <span style={{ color: 'var(--sky-text-secondary)', fontWeight: 400, marginLeft: '0.4rem' }}>
                (select one or more — a chore is created for each)
              </span>
            )}
          </label>
          {profiles.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--sky-text-secondary)' }}>
              No profiles available — create one first.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {profiles.map(p => {
                const selected = assignedProfileIds.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    role={editing ? 'radio' : 'checkbox'}
                    aria-checked={selected}
                    onClick={() => toggleProfile(p.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '999px',
                      border: `2px solid ${selected ? p.color : 'var(--sky-border, rgba(0,0,0,0.12))'}`,
                      background: selected ? p.color : 'transparent',
                      color: selected ? '#fff' : 'var(--sky-text-primary)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: selected ? '#fff' : p.color,
                      }}
                    />
                    {p.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        {allowEditStarValue && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Star value
              <span style={{ color: 'var(--sky-text-secondary)', fontWeight: 400, marginLeft: '0.4rem' }}>
                (tap a star to set)
              </span>
            </label>
            <StarPicker value={starValue} onChange={setStarValue} min={MIN_STAR} max={MAX_STAR} />
            <small style={{ display: 'block', marginTop: '0.4rem', color: 'var(--sky-text-secondary)' }}>
              Stars awarded each time an occurrence is approved.
            </small>
          </div>
        )}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            {recurrence === 'None' ? 'Due date *' : 'Start date *'}
          </label>
          <Calendar
            value={dueDate}
            onChange={e => setDueDate(e.value as Date | null)}
            dateFormat="mm/dd/yy"
            className="w-full"
            showIcon
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            End date {recurrence !== 'None' && <span style={{ color: 'var(--sky-text-secondary)', fontWeight: 400 }}>(optional)</span>}
          </label>
          <Calendar
            value={endDate}
            onChange={e => setEndDate(e.value as Date | null)}
            dateFormat="mm/dd/yy"
            className="w-full"
            showIcon
            showButtonBar
            disabled={recurrence === 'None'}
            placeholder={recurrence === 'None' ? 'Only for repeating chores' : undefined}
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Repeat</label>
          <Dropdown
            value={recurrence}
            options={RECURRENCE_OPTIONS}
            onChange={e => setRecurrence(e.value)}
            className="w-full"
          />
        </div>
        {recurrence === 'Weekly' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Days of week *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {DAY_LABELS_SHORT.map((label, value) => {
                const selected = daysOfWeek.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    onClick={() =>
                      setDaysOfWeek(prev =>
                        prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value].sort((a, b) => a - b)
                      )
                    }
                    style={{
                      flex: '1 1 0',
                      minWidth: '44px',
                      padding: '0.55rem 0.25rem',
                      borderRadius: '999px',
                      border: selected
                        ? '2px solid var(--sky-amber)'
                        : '2px solid var(--sky-border, rgba(0,0,0,0.12))',
                      background: selected ? 'var(--sky-amber)' : 'transparent',
                      color: selected ? '#fff' : 'var(--sky-text-primary)',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            {daysOfWeek.length === 0 && (
              <small style={{ color: 'var(--sky-text-secondary)' }}>
                Pick at least one day.
              </small>
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}

export default ChoreEditorDialog
