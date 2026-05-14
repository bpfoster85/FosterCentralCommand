import React, { useEffect, useMemo, useState } from 'react'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { ProgressBar } from 'primereact/progressbar'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { Slider } from 'primereact/slider'
import { Toast } from 'primereact/toast'
import { useRef } from 'react'
import { useProfiles } from '../hooks/useProfiles'
import { useChores } from '../hooks/useChores'
import { useGoals } from '../hooks/useGoals'
import { useLists, useListItems } from '../hooks/useLists'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import ChoreEditorDialog from '../components/chores/ChoreEditorDialog'
import MobileProfilePicker from '../components/profiles/MobileProfilePicker'
import SwipeApprovalRow from '../components/admin/SwipeApprovalRow'
import { getMyFamily, updateFamily, type FamilyDto } from '../api/families'
import type { Chore, Profile } from '../types'

interface PendingItem {
  chore: Chore
  dateKey: string
  profile: Profile | undefined
}

const GOAL_EMOJI_PRESETS = ['🎮', '🎁', '🏖️', '🍕', '🎬', '🚲', '📚', '🎨', '⚽', '🛹', '🎤', '🌴', '⭐']

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

  // Goals for the currently selected profile
  const { goals, createGoal, deleteGoal } = useGoals(selectedProfileId ?? undefined)
  const [goalForm, setGoalForm] = useState({ title: '', emoji: '⭐', starTarget: 10 })
  const [goalDialogVisible, setGoalDialogVisible] = useState(false)
  const resetGoalForm = () => setGoalForm({ title: '', emoji: '⭐', starTarget: 10 })
  const closeGoalDialog = () => {
    setGoalDialogVisible(false)
    resetGoalForm()
  }

  // Family settings panel state
  const [family, setFamily] = useState<FamilyDto | null>(null)
  const [calendarId, setCalendarId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [serviceAccount, setServiceAccount] = useState('')
  const [savingFamily, setSavingFamily] = useState(false)

  // Grocery section
  const GROCERY_NAME = 'Grocery'
  const [groceryExpanded, setGroceryExpanded] = useState(false)
  const { lists: shoppingLists, loading: listsLoading, refetch: refetchLists } = useLists()
  const groceryList = useMemo(
    () => shoppingLists.find(l => l.title.trim().toLowerCase() === GROCERY_NAME.toLowerCase()),
    [shoppingLists]
  )
  const {
    items: groceryItems,
    loading: groceryItemsLoading,
    deleteItem: deleteGroceryItem,
    refetch: refetchGroceryItems,
  } = useListItems(groceryExpanded ? (groceryList?.id ?? null) : null)

  // Pull-to-refresh on the whole admin page when running as an installed app.
  const scrollRef = useRef<HTMLDivElement>(null)
  const refreshAll = React.useCallback(async () => {
    const fetchFamily = getMyFamily()
      .then(f => {
        if (!f) return
        setFamily(f)
        setCalendarId(f.googleCalendarId ?? '')
      })
      .catch(() => { /* handled elsewhere */ })
    const tasks: Array<Promise<unknown>> = [
      refetchProfiles(),
      refetchChores(),
      refetchLists(),
      fetchFamily,
    ]
    if (groceryExpanded && groceryList?.id) {
      tasks.push(refetchGroceryItems())
    }
    await Promise.allSettled(tasks)
  }, [refetchProfiles, refetchChores, refetchLists, refetchGroceryItems, groceryExpanded, groceryList?.id])
  const pull = usePullToRefresh(scrollRef, { onRefresh: refreshAll })

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

  const handleReject = async (item: PendingItem) => {
    // Rejecting = toggle the user-side completion off. Since it is not yet
    // approved, no stars are involved; the entry is simply removed from
    // completedDates. The swipe gesture itself is the confirmation.
    const toggleChoreCompleteOnDate = (await import('../api/chores')).toggleChoreCompleteOnDate
    await toggleChoreCompleteOnDate(item.chore.id, item.dateKey)
    await refetchChores()
    toast.current?.show({ severity: 'info', summary: 'Rejected', life: 2000 })
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

  const handleCreateGoal = async () => {
    if (!selectedProfileId || !goalForm.title.trim()) return
    await createGoal({
      profileId: selectedProfileId,
      title: goalForm.title.trim(),
      emoji: goalForm.emoji || '⭐',
      starTarget: goalForm.starTarget,
    })
    const createdTitle = goalForm.title.trim()
    closeGoalDialog()
    toast.current?.show({
      severity: 'success',
      summary: 'Goal created',
      detail: `${createdTitle} added`,
      life: 2000,
    })
  }

  const handleDeleteGoal = (goalId: string, title: string) => {
    confirmDialog({
      message: `Delete goal "${title}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => deleteGoal(goalId),
    })
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
    <div
      ref={scrollRef}
      className="admin-page"
      style={{
        flex: 1,
        overflow: 'auto',
        padding: '2rem 1.25rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        overscrollBehaviorY: 'contain',
        position: 'relative',
      }}
    >
      {/* Pull-to-refresh indicator */}
      <div
        aria-hidden={pull.distance === 0 && !pull.refreshing}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          transform: `translateY(${Math.max(0, pull.distance - 32)}px)`,
          opacity: pull.distance > 4 || pull.refreshing ? 1 : 0,
          transition: pull.refreshing || pull.distance === 0 ? 'transform 0.2s ease, opacity 0.2s ease' : 'none',
          zIndex: 5,
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--surface-card, #fff)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--sky-amber)',
          }}
        >
          <i
            className={pull.refreshing ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'}
            style={{
              fontSize: '1.1rem',
              transform: pull.refreshing ? 'none' : `rotate(${Math.min(pull.distance * 4, 360)}deg)`,
              transition: pull.refreshing ? 'none' : 'transform 0.05s linear',
            }}
          />
        </div>
      </div>

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
              <SwipeApprovalRow
                key={`${item.chore.id}_${item.dateKey}`}
                onApprove={() => handleApprove(item)}
                onReject={() => handleReject(item)}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    padding: '0.85rem 1rem',
                    borderLeft: `4px solid ${item.profile?.color ?? 'var(--sky-amber)'}`,
                    background: 'var(--sky-surface-soft, rgba(160, 200, 220, 0.08))',
                    borderRadius: 'var(--sky-radius-md, 12px)',
                  }}
                >
                  {/* Title row: chore title + star value */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
                      aria-label={item.profile?.name ?? 'Unassigned'}
                    >
                      {item.profile?.name.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: '1.05rem' }}>
                      {item.chore.title}
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
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
                  </div>

                  {/* Day row: spans full width */}
                  <div
                    style={{
                      width: '100%',
                      textAlign: 'center',
                      padding: '0.35rem 0.5rem',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.04)',
                      color: 'var(--sky-text-secondary)',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                    }}
                  >
                    {formatDateKey(item.dateKey)}
                  </div>
                </div>
              </SwipeApprovalRow>
            ))}
          </div>
        )}
      </section>

      {/* === Grocery list (collapsible) === */}
      <section className="sky-card" style={{ padding: '1.25rem' }}>
        <header
          onClick={() => setGroceryExpanded(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            userSelect: 'none',
            marginBottom: groceryExpanded ? '0.75rem' : 0,
          }}
        >
          <i className="pi pi-shopping-cart" style={{ color: 'var(--sky-amber)' }} />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, flex: 1 }}>
            Grocery List
          </h3>
          {groceryList && (
            <span
              style={{
                padding: '0.1rem 0.55rem',
                borderRadius: '999px',
                background: 'var(--surface-200, rgba(0,0,0,0.08))',
                color: 'var(--sky-text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {groceryList.itemCount ?? 0}
            </span>
          )}
          <Button
            icon={groceryExpanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'}
            className="p-button-text p-button-sm p-button-rounded"
            onClick={e => {
              e.stopPropagation()
              setGroceryExpanded(v => !v)
            }}
            aria-label={groceryExpanded ? 'Collapse' : 'Expand'}
          />
        </header>

        {groceryExpanded && (
          listsLoading ? (
            <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
          ) : !groceryList ? (
            <div style={{ padding: '0.75rem', color: 'var(--sky-text-secondary)' }}>
              No "Grocery" list yet.
            </div>
          ) : groceryItemsLoading ? (
            <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
          ) : groceryItems.length === 0 ? (
            <div style={{ padding: '0.75rem', color: 'var(--sky-text-secondary)' }}>
              Nothing on the list.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {groceryItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.6rem 0.9rem',
                    background: 'var(--sky-surface-soft, rgba(160, 200, 220, 0.08))',
                    borderRadius: 'var(--sky-radius-md, 12px)',
                  }}
                >
                  <span style={{ flex: 1, fontSize: '1rem', fontWeight: 500 }}>{item.title}</span>
                  <Button
                    icon="pi pi-trash"
                    className="p-button-text p-button-sm p-button-rounded"
                    style={{ color: 'var(--sky-coral)' }}
                    onClick={() => deleteGroceryItem(item.id)}
                    aria-label="Remove item"
                  />
                </div>
              ))}
            </div>
          )
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

      {/* === Goals === */}
      <section className="sky-card" style={{ padding: '1.25rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <i className="pi pi-flag" style={{ color: 'var(--sky-amber)' }} />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, flex: 1 }}>
            Goals{selectedProfile ? ` · ${selectedProfile.name}` : ''}
          </h3>
          {selectedProfile && (
            <>
              <span style={{ fontSize: '0.8rem', color: 'var(--sky-text-secondary)' }}>
                {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
              </span>
              <Button
                icon="pi pi-plus"
                label="Add Goal"
                className="p-button-sm"
                onClick={() => { resetGoalForm(); setGoalDialogVisible(true) }}
              />
            </>
          )}
        </header>

        {!selectedProfile ? (
          <div style={{ padding: '0.75rem', color: 'var(--sky-text-secondary)' }}>
            Select a profile above to manage their goals.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Existing goals */}
            {goals.length === 0 ? (
              <div style={{ padding: '0.75rem', color: 'var(--sky-text-secondary)' }}>
                No goals yet for {selectedProfile.name}. Click “Add Goal” to create one.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {goals.map(g => (
                  <div
                    key={g.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.6rem 0.85rem',
                      background: 'var(--sky-surface-soft, rgba(160, 200, 220, 0.08))',
                      borderRadius: 'var(--sky-radius-md, 12px)',
                      borderLeft: `4px solid ${selectedProfile.color}`,
                    }}
                  >
                    <span style={{ fontSize: '1.4rem' }}>{g.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{g.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--sky-text-secondary)' }}>
                        {g.starsApplied} / {g.starTarget} ⭐{g.isAchieved ? ' · 🏆 Achieved' : ''}
                      </div>
                    </div>
                    <Button
                      icon="pi pi-trash"
                      className="p-button-text p-button-sm p-button-rounded"
                      style={{ color: 'var(--sky-coral)' }}
                      aria-label="Delete goal"
                      onClick={() => handleDeleteGoal(g.id, g.title)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* === Add Goal Dialog === */}
      <Dialog
        header={`New Goal${selectedProfile ? ` for ${selectedProfile.name}` : ''}`}
        visible={goalDialogVisible}
        onHide={closeGoalDialog}
        className="goal-dialog-xl"
        style={{ width: '95vw', maxWidth: '720px' }}
        dismissableMask
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button label="Cancel" className="p-button-text p-button-lg" onClick={closeGoalDialog} />
            <Button
              label="Add Goal"
              icon="pi pi-plus"
              className="p-button-lg"
              onClick={handleCreateGoal}
              disabled={!goalForm.title.trim() || goalForm.starTarget < 1}
            />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 600, fontSize: '1.1rem' }}>
              Goal Name *
            </label>
            <InputText
              value={goalForm.title}
              onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))}
              className="w-full p-inputtext-lg"
              style={{ fontSize: '1.15rem', padding: '0.85rem 1rem' }}
              placeholder="e.g. New Video Game"
              autoFocus
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 600, fontSize: '1.1rem' }}>
              Emoji
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
              {GOAL_EMOJI_PRESETS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setGoalForm(f => ({ ...f, emoji: e }))}
                  style={{
                    fontSize: '2rem',
                    background: goalForm.emoji === e ? 'var(--sky-surface-soft, #f3f4f6)' : 'none',
                    border: goalForm.emoji === e ? '3px solid var(--primary-color)' : '3px solid transparent',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    padding: '0.5rem 0.6rem',
                    lineHeight: 1,
                    minWidth: '56px',
                    minHeight: '56px',
                  }}
                  aria-label={`Use ${e} emoji`}
                >
                  {e}
                </button>
              ))}
            </div>
            <InputText
              value={goalForm.emoji}
              onChange={e => setGoalForm(f => ({ ...f, emoji: e.target.value }))}
              className="w-full p-inputtext-lg"
              style={{ fontSize: '1.15rem', padding: '0.75rem 1rem' }}
              placeholder="Or type any emoji"
              maxLength={8}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                Stars Required <i className="pi pi-star-fill" style={{ color: 'var(--sky-amber)', fontSize: '1rem' }} />
              </label>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 1rem',
                  borderRadius: '999px',
                  background: 'var(--sky-amber)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  minWidth: '4.5rem',
                  justifyContent: 'center',
                }}
              >
                {goalForm.starTarget}
                <i className="pi pi-star-fill" style={{ fontSize: '0.9rem' }} />
              </span>
            </div>
            <Slider
              value={goalForm.starTarget}
              onChange={e => setGoalForm(f => ({ ...f, starTarget: typeof e.value === 'number' ? e.value : f.starTarget }))}
              min={1}
              max={100}
              step={5}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--sky-text-secondary)', marginTop: '0.6rem', fontWeight: 600 }}>
              <span>1</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </div>
      </Dialog>

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
