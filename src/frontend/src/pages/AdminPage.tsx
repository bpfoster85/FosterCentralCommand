import React, { useMemo, useState } from 'react'
import { Button } from 'primereact/button'
import { InputNumber } from 'primereact/inputnumber'
import { Dropdown } from 'primereact/dropdown'
import { ProgressBar } from 'primereact/progressbar'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { Toast } from 'primereact/toast'
import { useRef } from 'react'
import { useProfiles } from '../hooks/useProfiles'
import { useChores } from '../hooks/useChores'
import ChoreEditorDialog from '../components/chores/ChoreEditorDialog'
import type { Chore, Profile } from '../types'

interface PendingItem {
  chore: Chore
  dateKey: string
  profile: Profile | undefined
}

const formatDateKey = (key: string): string => {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

const AdminPage: React.FC = () => {
  const { profiles, loading: profilesLoading, refetch: refetchProfiles, adjustStars } = useProfiles()
  const {
    chores,
    loading: choresLoading,
    refetch: refetchChores,
    createChore,
    updateChore,
    deleteChore,
    toggleApprovalOnDate,
  } = useChores()

  const toast = useRef<Toast>(null)

  // Award-stars panel state
  const [awardProfileId, setAwardProfileId] = useState<string | null>(null)
  const [awardAmount, setAwardAmount] = useState<number>(1)

  // Chore editor dialog state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)

  // Manage-chores filter (null = all)
  const [filterProfileId, setFilterProfileId] = useState<string | null>(null)

  const filteredChores = useMemo(
    () => (filterProfileId ? chores.filter(c => c.assignedProfileId === filterProfileId) : chores),
    [chores, filterProfileId]
  )

  const pending: PendingItem[] = useMemo(() => {
    const items: PendingItem[] = []
    for (const c of chores) {
      const completedSet = new Set(c.completedDates)
      const approvedSet = new Set(c.approvedDates)
      for (const d of completedSet) {
        if (!approvedSet.has(d)) {
          items.push({
            chore: c,
            dateKey: d,
            profile: profiles.find(p => p.id === c.assignedProfileId),
          })
        }
      }
    }
    // Newest pending first
    items.sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))
    return items
  }, [chores, profiles])

  const handleApprove = async (item: PendingItem) => {
    await toggleApprovalOnDate(item.chore.id, item.dateKey)
    refetchProfiles()
    toast.current?.show({
      severity: 'success',
      summary: 'Approved',
      detail: `${item.profile?.name ?? 'Profile'} earned ${item.chore.starValue} ⭐`,
      life: 2500,
    })
  }

  const handleReject = (item: PendingItem) => {
    confirmDialog({
      message: `Reject "${item.chore.title}" for ${formatDateKey(item.dateKey)}? This will uncheck the completion for the assignee.`,
      header: 'Reject completion',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Reject',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        // Rejecting = toggle the user-side completion off. Since it is not yet approved,
        // no stars are involved; the entry is simply removed from completedDates.
        const apiClient = (await import('../api/chores')).toggleChoreCompleteOnDate
        await apiClient(item.chore.id, item.dateKey)
        await refetchChores()
        toast.current?.show({ severity: 'info', summary: 'Rejected', life: 2000 })
      },
    })
  }

  const handleAward = async () => {
    if (!awardProfileId || !awardAmount) return
    await adjustStars(awardProfileId, awardAmount)
    const profile = profiles.find(p => p.id === awardProfileId)
    toast.current?.show({
      severity: 'success',
      summary: awardAmount >= 0 ? 'Stars awarded' : 'Stars removed',
      detail: `${profile?.name ?? 'Profile'}: ${awardAmount >= 0 ? '+' : ''}${awardAmount} ⭐`,
      life: 2500,
    })
    setAwardAmount(1)
  }

  const openCreateChore = () => {
    setEditingChore(null)
    setEditorOpen(true)
  }

  const openEditChore = (chore: Chore) => {
    setEditingChore(chore)
    setEditorOpen(true)
  }

  const handleDeleteChore = (id: string) =>
    new Promise<void>(resolve => {
      confirmDialog({
        message: 'Delete this chore? Past completions and stars already awarded will be kept.',
        header: 'Confirm Delete',
        icon: 'pi pi-exclamation-triangle',
        acceptClassName: 'p-button-danger',
        accept: async () => {
          await deleteChore(id)
          resolve()
        },
        reject: () => resolve(),
      })
    })

  const profileOptions = profiles.map(p => ({ label: p.name, value: p.id }))

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Toast ref={toast} />
      <ConfirmDialog />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <i className="pi pi-shield" style={{ fontSize: '1.25rem', color: 'var(--sky-amber)' }} />
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Admin</h2>
      </div>

      {/* === Pending approvals === */}
      <section className="sky-card" style={{ padding: '1.25rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <i className="pi pi-check-circle" style={{ color: 'var(--sky-amber)' }} />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
            Pending Approvals
          </h3>
          <span
            style={{
              marginLeft: '0.5rem',
              padding: '0.1rem 0.55rem',
              borderRadius: '999px',
              background: pending.length > 0 ? 'var(--sky-amber)' : 'var(--surface-200, rgba(0,0,0,0.08))',
              color: pending.length > 0 ? '#fff' : 'var(--sky-text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {pending.length}
          </span>
        </header>

        {choresLoading || profilesLoading ? (
          <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
        ) : pending.length === 0 ? (
          <div style={{ padding: '0.75rem', color: 'var(--sky-text-secondary)' }}>
            Nothing waiting for approval.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {pending.map(item => (
              <div
                key={`${item.chore.id}_${item.dateKey}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 0.9rem',
                  borderLeft: `4px solid ${item.profile?.color ?? 'var(--sky-amber)'}`,
                  background: 'var(--sky-surface-soft, rgba(160, 200, 220, 0.08))',
                  borderRadius: 'var(--sky-radius-md, 12px)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: item.profile?.color ?? '#888',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {item.profile?.name.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{item.chore.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--sky-text-secondary)' }}>
                    {item.profile?.name ?? 'Unassigned'} · {formatDateKey(item.dateKey)}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '999px',
                    background: 'rgba(232, 185, 116, 0.18)',
                    color: 'var(--sky-amber)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}
                >
                  <i className="pi pi-star-fill" style={{ fontSize: '0.75rem' }} />
                  <span>{item.chore.starValue}</span>
                </div>
                <Button
                  label="Approve"
                  icon="pi pi-check"
                  className="p-button-sm"
                  onClick={() => handleApprove(item)}
                />
                <Button
                  icon="pi pi-times"
                  className="p-button-sm p-button-text p-button-danger"
                  onClick={() => handleReject(item)}
                  aria-label="Reject"
                  tooltip="Reject (uncheck completion)"
                  tooltipOptions={{ position: 'top' }}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* === Award stars === */}
      <section className="sky-card" style={{ padding: '1.25rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <i className="pi pi-star" style={{ color: 'var(--sky-amber)' }} />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>Award Stars</h3>
        </header>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.85rem' }}>
              Profile
            </label>
            <Dropdown
              value={awardProfileId}
              options={profileOptions}
              onChange={e => setAwardProfileId(e.value)}
              placeholder="Pick a profile"
              className="w-full"
            />
          </div>
          <div style={{ width: '240px' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.85rem' }}>
              Amount (negative to remove)
            </label>
            <InputNumber
              value={awardAmount}
              onValueChange={e => setAwardAmount(typeof e.value === 'number' ? e.value : 0)}
              showButtons
              buttonLayout="horizontal"
              incrementButtonIcon="pi pi-plus"
              decrementButtonIcon="pi pi-minus"
              inputStyle={{ width: '100%', textAlign: 'center' }}
              className="w-full"
            />
          </div>
          <Button
            label="Apply"
            icon="pi pi-check"
            disabled={!awardProfileId || awardAmount === 0}
            onClick={handleAward}
          />
        </div>

        {profiles.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {profiles.map(p => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.7rem',
                  borderRadius: '999px',
                  background: 'var(--sky-surface-soft, rgba(160, 200, 220, 0.08))',
                  borderLeft: `3px solid ${p.color}`,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    color: 'var(--sky-amber)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}
                >
                  <i className="pi pi-star-fill" style={{ fontSize: '0.7rem' }} />
                  {p.totalStars ?? 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* === Manage chores === */}
      <section className="sky-card" style={{ padding: '1.25rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <i className="pi pi-list" style={{ color: 'var(--sky-amber)' }} />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, flex: 1 }}>Chores</h3>
          <Button label="New Chore" icon="pi pi-plus" className="p-button-sm" onClick={openCreateChore} disabled={profiles.length === 0} />
        </header>

        {profiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setFilterProfileId(null)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '999px',
                border: filterProfileId === null
                  ? '2px solid var(--sky-lagoon-deep, #2c5d70)'
                  : '2px solid var(--sky-border, rgba(0,0,0,0.12))',
                background: filterProfileId === null ? 'var(--sky-lagoon-deep, #2c5d70)' : 'transparent',
                color: filterProfileId === null ? '#fff' : 'var(--sky-text-primary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              All ({chores.length})
            </button>
            {profiles.map(p => {
              const count = chores.filter(c => c.assignedProfileId === p.id).length
              const selected = filterProfileId === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFilterProfileId(p.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '999px',
                    border: `2px solid ${selected ? p.color : 'var(--sky-border, rgba(0,0,0,0.12))'}`,
                    background: selected ? p.color : 'transparent',
                    color: selected ? '#fff' : 'var(--sky-text-primary)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
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
                  {p.name} ({count})
                </button>
              )
            })}
          </div>
        )}

        {choresLoading ? (
          <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
        ) : chores.length === 0 ? (
          <div style={{ padding: '0.75rem', color: 'var(--sky-text-secondary)' }}>
            No chores yet. Create one to get started.
          </div>
        ) : filteredChores.length === 0 ? (
          <div style={{ padding: '0.75rem', color: 'var(--sky-text-secondary)' }}>
            No chores assigned to this profile.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredChores.map(c => {
              const owner = profiles.find(p => p.id === c.assignedProfileId)
              const recurrenceLabel =
                c.recurrence === 'None' ? 'One time' :
                c.recurrence === 'Daily' ? 'Every day' :
                c.recurrence === 'EveryOtherDay' ? 'Every other day' :
                c.recurrence === 'Weekly' ? 'Weekly' : c.recurrence
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 0.9rem',
                    borderLeft: `4px solid ${owner?.color ?? '#888'}`,
                    background: 'var(--sky-surface-soft, rgba(160, 200, 220, 0.08))',
                    borderRadius: 'var(--sky-radius-md, 12px)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--sky-text-secondary)' }}>
                      {owner?.name ?? 'Unassigned'} · {recurrenceLabel}
                      {c.recurrence === 'None' ? ` · due ${formatDateKey(c.dueDate.slice(0, 10))}` : ''}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: 'var(--sky-amber)',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                    }}
                  >
                    <i className="pi pi-star-fill" style={{ fontSize: '0.8rem' }} />
                    {c.starValue}
                  </div>
                  <Button icon="pi pi-pencil" className="p-button-text p-button-sm p-button-rounded" onClick={() => openEditChore(c)} aria-label="Edit" />
                  <Button
                    icon="pi pi-trash"
                    className="p-button-text p-button-sm p-button-rounded"
                    style={{ color: 'var(--sky-coral)' }}
                    onClick={() => handleDeleteChore(c.id)}
                    aria-label="Delete"
                  />
                </div>
              )
            })}
          </div>
        )}
      </section>

      <ChoreEditorDialog
        visible={editorOpen}
        profiles={profiles}
        initialChore={editingChore}
        allowEditStarValue
        onClose={() => setEditorOpen(false)}
        onCreate={async payload => { await createChore(payload) }}
        onUpdate={async (id, payload) => { await updateChore(id, payload) }}
        onDelete={handleDeleteChore}
      />
    </div>
  )
}

export default AdminPage
