import React, { useEffect, useMemo, useState } from 'react'
import { Button } from 'primereact/button'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { ProgressBar } from 'primereact/progressbar'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { Slider } from 'primereact/slider'
import { Toast } from 'primereact/toast'
import { useRef } from 'react'
import { useProfiles } from '../hooks/useProfiles'
import { useChores } from '../hooks/useChores'
import ChoreEditorDialog from '../components/chores/ChoreEditorDialog'
import MobileProfilePicker from '../components/profiles/MobileProfilePicker'
import { getMyFamily, updateFamily, type FamilyDto } from '../api/families'
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

  // Single profile selector that drives BOTH the Award Stars panel and the
  // Manage Chores list filter. null = "All" (chores list shows everything;
  // awarding stars is disabled).
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [awardAmount, setAwardAmount] = useState<number>(1)

  // Family settings panel state
  const [family, setFamily] = useState<FamilyDto | null>(null)
  const [calendarId, setCalendarId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [serviceAccount, setServiceAccount] = useState('')
  const [savingFamily, setSavingFamily] = useState(false)

  useEffect(() => {
    let cancelled = false
    getMyFamily()
      .then(f => {
        if (cancelled || !f) return
        setFamily(f)
        setCalendarId(f.googleCalendarId ?? '')
      })
      .catch(() => {
        /* surfaced elsewhere via 401 handler */
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Chore editor dialog state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)

  const filteredChores = useMemo(
    () => (selectedProfileId ? chores.filter(c => c.assignedProfileId === selectedProfileId) : chores),
    [chores, selectedProfileId]
  )

  const selectedProfile = useMemo(
    () => profiles.find(p => p.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
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
    if (!selectedProfileId || !awardAmount) return
    await adjustStars(selectedProfileId, awardAmount)
    const profile = profiles.find(p => p.id === selectedProfileId)
    toast.current?.show({
      severity: 'success',
      summary: awardAmount >= 0 ? 'Stars awarded' : 'Stars removed',
      detail: `${profile?.name ?? 'Profile'}: ${awardAmount >= 0 ? '+' : ''}${awardAmount} ⭐`,
      life: 2500,
    })
    setAwardAmount(1)
  }

  const handleSaveFamily = async (
    patch: { calendarId?: string; apiKey?: string; serviceAccount?: string }
  ) => {
    if (!family) return 
    setSavingFamily(true)
    try {
      const body: Record<string, string | null> = {}
      if (patch.calendarId !== undefined) body.googleCalendarId = patch.calendarId
      if (patch.apiKey !== undefined) body.googleApiKey = patch.apiKey
      if (patch.serviceAccount !== undefined) body.googleServiceAccountJson = patch.serviceAccount

      const updated = await updateFamily(family.id, body)
      setFamily(updated)
      setCalendarId(updated.googleCalendarId ?? '')
      // Clear secret inputs after a successful save so we don't keep them in memory.
      if (patch.apiKey !== undefined) setApiKey('')
      if (patch.serviceAccount !== undefined) setServiceAccount('')

      toast.current?.show({
        severity: 'success',
        summary: 'Family updated',
        life: 2500,
      })
    } catch (err) {
      toast.current?.show({
        severity: 'error',
        summary: 'Update failed',
        detail: err instanceof Error ? err.message : 'See console for details.',
        life: 4000,
      })
    } finally {
      setSavingFamily(false)
    }
  }

  const validateServiceAccountJson = (raw: string): string | null => {
    if (!raw.trim()) return null
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.type !== 'service_account' || !parsed?.client_email) {
        return 'JSON does not look like a service account key (missing type/client_email).'
      }
      return null
    } catch {
      return 'Not valid JSON.'
    }
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

  return (
    <div className="admin-page" style={{ flex: 1, overflow: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Toast ref={toast} />
      <ConfirmDialog />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <i className="pi pi-shield" style={{ fontSize: '1.25rem', color: 'var(--sky-amber)' }} />
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Admin</h2>
        <Button
          label="New Chore"
          icon="pi pi-plus"
          onClick={openCreateChore}
          disabled={profiles.length === 0}
          style={{ marginLeft: 'auto' }}
        />
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

      {/* === Profile selector (drives Award Stars + Manage Chores) === */}
      <section className="sky-card" style={{ padding: '1.25rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <i className="pi pi-users" style={{ color: 'var(--sky-amber)' }} />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
            Profile
          </h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--sky-text-secondary)', marginLeft: '0.5rem' }}>
            Filters Award Stars and Chores below
          </span>
        </header>

        {profiles.length === 0 ? (
          <div style={{ padding: '0.75rem', color: 'var(--sky-text-secondary)' }}>
            No profiles available.
          </div>
        ) : (
          <>
            {/* Mobile: inline collapsible picker */}
            <div className="sky-profile-filter-select">
              <MobileProfilePicker
                profiles={profiles}
                value={selectedProfileId}
                onChange={setSelectedProfileId}
              />
            </div>

            {/* Desktop pill row */}
            <div className="sky-profile-filter sky-profile-filter-pills">
              <button
                type="button"
                className="sky-profile-pill"
                onClick={() => setSelectedProfileId(null)}
                style={{
                  background: selectedProfileId === null ? 'var(--sky-lagoon-deep)' : undefined,
                  color: selectedProfileId === null ? '#fff' : undefined,
                  borderColor: selectedProfileId === null ? 'var(--sky-lagoon-deep)' : undefined,
                  fontWeight: 700,
                }}
              >
                <span>All</span>
              </button>
              {profiles.map(p => {
                const active = selectedProfileId === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="sky-profile-pill"
                    onClick={() => setSelectedProfileId(p.id)}
                    style={{
                      background: active ? p.color : undefined,
                      color: active ? '#fff' : undefined,
                      borderColor: active ? p.color : undefined,
                      fontWeight: 700,
                    }}
                  >
                    <span
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: active ? 'rgba(255,255,255,0.25)' : p.color,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <span>{p.name}</span>
                    <span style={{ fontSize: '0.95rem', opacity: 0.9, marginLeft: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <i className="pi pi-star-fill" style={{ fontSize: '0.95rem', color: active ? '#fff' : 'var(--sky-amber)' }} />
                      <span>{p.totalStars ?? 0}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* === Award stars === */}
      <section className="sky-card" style={{ padding: '1.25rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <i className="pi pi-star" style={{ color: 'var(--sky-amber)' }} />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>Award Stars</h3>
        </header>

        {!selectedProfile ? (
          <div style={{ padding: '0.75rem', color: 'var(--sky-text-secondary)' }}>
            Select a profile above to award or remove stars.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.85rem' }}>
                Awarding to
              </label>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '0.5rem 0.95rem',
                  borderRadius: '999px',
                  background: selectedProfile.color,
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.28)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                  }}
                >
                  {selectedProfile.name.charAt(0).toUpperCase()}
                </span>
                <span>{selectedProfile.name}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginLeft: '0.4rem' }}>
                  <i className="pi pi-star-fill" />
                  {selectedProfile.totalStars ?? 0}
                </span>
              </div>
            </div>
            <div style={{ flex: '1 1 280px', minWidth: '240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', gap: '0.5rem' }}>
                <label style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                  Amount (negative to remove)
                </label>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    background: awardAmount === 0
                      ? 'var(--sky-surface-soft, rgba(160,200,220,0.15))'
                      : awardAmount > 0
                        ? 'var(--sky-amber)'
                        : 'var(--sky-coral, #d04848)',
                    color: awardAmount === 0 ? 'var(--sky-text-secondary)' : '#fff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    minWidth: '3.25rem',
                    justifyContent: 'center',
                  }}
                >
                  {awardAmount > 0 ? `+${awardAmount}` : awardAmount}
                  <i className="pi pi-star-fill" style={{ fontSize: '0.7rem' }} />
                </span>
              </div>
              <Slider
                value={awardAmount}
                onChange={e => setAwardAmount(typeof e.value === 'number' ? e.value : 0)}
                min={-5}
                max={10}
                step={1}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--sky-text-secondary)', marginTop: '0.3rem' }}>
                <span>-5</span>
                <span>0</span>
                <span>+10</span>
              </div>
            </div>
            <Button
              label="Apply"
              icon="pi pi-check"
              disabled={awardAmount === 0}
              onClick={handleAward}
            />
          </div>
        )}
      </section>

      {/* === Manage chores === */}
      <section className="sky-card" style={{ padding: '1.25rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <i className="pi pi-list" style={{ color: 'var(--sky-amber)' }} />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, flex: 1 }}>
            Chores{selectedProfile ? ` · ${selectedProfile.name}` : ''}
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--sky-text-secondary)' }}>
            {filteredChores.length} {filteredChores.length === 1 ? 'chore' : 'chores'}
          </span>
        </header>

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

      {/* === Family / Google settings === */}
      <section className="sky-card" style={{ padding: '1.25rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <i className="pi pi-cog" style={{ color: 'var(--sky-amber)' }} />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, flex: 1 }}>
            Family &amp; Google Settings
          </h3>
          {family && (
            <span style={{ fontSize: '0.8rem', color: 'var(--sky-text-secondary)' }}>
              {family.name}
            </span>
          )}
        </header>

        {!family ? (
          <span style={{ fontSize: '0.85rem', color: 'var(--sky-text-secondary)' }}>
            Loading…
          </span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Calendar ID */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.85rem' }}>
                Google Calendar ID
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <InputText
                  value={calendarId}
                  onChange={e => setCalendarId(e.target.value)}
                  placeholder="example@group.calendar.google.com"
                  className="w-full"
                  style={{ flex: 1 }}
                />
                <Button
                  label="Save"
                  icon="pi pi-save"
                  className="p-button-sm"
                  loading={savingFamily}
                  disabled={calendarId === (family.googleCalendarId ?? '')}
                  onClick={() => handleSaveFamily({ calendarId })}
                />
              </div>
            </div>

            {/* API Key */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <label style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                  Google API Key
                </label>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.5rem',
                    borderRadius: '999px',
                    background: family.hasGoogleApiKey
                      ? 'var(--sky-amber)'
                      : 'var(--surface-200, rgba(0,0,0,0.08))',
                    color: family.hasGoogleApiKey ? '#fff' : 'var(--sky-text-secondary)',
                  }}
                >
                  {family.hasGoogleApiKey ? 'Configured' : 'Not set'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <InputText
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={family.hasGoogleApiKey ? '••••••••  (enter new key to replace)' : 'Paste API key'}
                  type="password"
                  className="w-full"
                  style={{ flex: 1 }}
                />
                <Button
                  label="Save"
                  icon="pi pi-save"
                  className="p-button-sm"
                  loading={savingFamily}
                  disabled={apiKey.length === 0}
                  onClick={() => handleSaveFamily({ apiKey })}
                />
                {family.hasGoogleApiKey && (
                  <Button
                    label="Clear"
                    icon="pi pi-times"
                    className="p-button-sm p-button-text p-button-danger"
                    loading={savingFamily}
                    onClick={() =>
                      confirmDialog({
                        message: 'Clear the saved Google API key?',
                        header: 'Clear API key',
                        icon: 'pi pi-exclamation-triangle',
                        acceptClassName: 'p-button-danger',
                        accept: () => handleSaveFamily({ apiKey: '' }),
                      })
                    }
                  />
                )}
              </div>
            </div>

            {/* Service account JSON */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <label style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                  Google Service Account JSON
                </label>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.5rem',
                    borderRadius: '999px',
                    background: family.hasGoogleServiceAccount
                      ? 'var(--sky-amber)'
                      : 'var(--surface-200, rgba(0,0,0,0.08))',
                    color: family.hasGoogleServiceAccount ? '#fff' : 'var(--sky-text-secondary)',
                  }}
                >
                  {family.hasGoogleServiceAccount ? 'Configured' : 'Not set'}
                </span>
              </div>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', color: 'var(--sky-text-secondary)' }}>
                Required for write access. Paste the full key JSON. Service account email must
                be shared with the calendar above.
              </p>
              <InputTextarea
                value={serviceAccount}
                onChange={e => setServiceAccount(e.target.value)}
                placeholder={
                  family.hasGoogleServiceAccount
                    ? 'A service account is configured. Paste replacement JSON to overwrite.'
                    : '{ "type": "service_account", "project_id": "...", ... }'
                }
                rows={6}
                className="w-full"
                style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}
              />
              {serviceAccount.trim().length > 0 && validateServiceAccountJson(serviceAccount) && (
                <span style={{ fontSize: '0.78rem', color: 'var(--sky-coral, #d04848)' }}>
                  {validateServiceAccountJson(serviceAccount)}
                </span>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <Button
                  label="Save"
                  icon="pi pi-save"
                  className="p-button-sm"
                  loading={savingFamily}
                  disabled={
                    serviceAccount.trim().length === 0 ||
                    validateServiceAccountJson(serviceAccount) !== null
                  }
                  onClick={() => handleSaveFamily({ serviceAccount })}
                />
                {family.hasGoogleServiceAccount && (
                  <Button
                    label="Clear"
                    icon="pi pi-times"
                    className="p-button-sm p-button-text p-button-danger"
                    loading={savingFamily}
                    onClick={() =>
                      confirmDialog({
                        message:
                          'Clear the saved service account JSON? Calendar sync will fall back to API key (read-only) if one is configured.',
                        header: 'Clear service account',
                        icon: 'pi pi-exclamation-triangle',
                        acceptClassName: 'p-button-danger',
                        accept: () => handleSaveFamily({ serviceAccount: '' }),
                      })
                    }
                  />
                )}
              </div>
            </div>
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
