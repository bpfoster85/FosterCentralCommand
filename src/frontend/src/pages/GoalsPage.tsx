import React, { useState } from 'react'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { InputNumber } from 'primereact/inputnumber'
import { ProgressBar } from 'primereact/progressbar'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { useProfiles } from '../hooks/useProfiles'
import { useGoals } from '../hooks/useGoals'
import GoalCard from '../components/chores/GoalCard'
import CelebrationOverlay from '../components/chores/CelebrationOverlay'
import type { Goal } from '../types'

const GoalsPage: React.FC = () => {
  const { profiles, loading: profilesLoading, refetch: refetchProfiles } = useProfiles()
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)

  const selectedProfile = profiles.find(p => p.id === selectedProfileId) ?? null

  const { goals, loading: goalsLoading, deleteGoal, spendStars, winGoal, refetch: refetchGoals } = useGoals(
    selectedProfileId ?? undefined,
  )

  // Spend stars dialog
  const [spendDialogGoal, setSpendDialogGoal] = useState<Goal | null>(null)
  const [spendAmount, setSpendAmount] = useState<number>(1)

  // Celebration
  const [celebration, setCelebration] = useState<{ active: boolean; message: string }>({ active: false, message: '' })

  const handleDeleteGoal = (goal: Goal) => {
    confirmDialog({
      message: `Delete goal "${goal.title}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => deleteGoal(goal.id),
    })
  }

  const handleOpenSpend = (goal: Goal) => {
    setSpendDialogGoal(goal)
    setSpendAmount(1)
  }

  const handleSpendStars = async () => {
    if (!spendDialogGoal || !selectedProfile || spendAmount < 1) return
    await spendStars(spendDialogGoal.id, selectedProfile.id, spendAmount)
    refetchProfiles()
    setSpendDialogGoal(null)
    setCelebration({ active: true, message: `${spendAmount} ⭐ applied to "${spendDialogGoal.title}"!` })
  }

  const handleWinAward = async (goal: Goal) => {
    await winGoal(goal.id)
    refetchGoals()
    setCelebration({ active: true, message: `🏆 ${goal.title} — Goal Achieved! Amazing job!` })
  }

  const profileGoals = goals.filter(g => !selectedProfileId || g.profileId === selectedProfileId)

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
      <ConfirmDialog />

      <CelebrationOverlay
        active={celebration.active}
        message={celebration.message}
        duration={4000}
        onDone={() => setCelebration({ active: false, message: '' })}
      />

      {/* Header + profile selector */}
      {profilesLoading ? (
        <ProgressBar mode="indeterminate" style={{ height: '4px', marginBottom: '1rem' }} />
      ) : profiles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--sky-text-secondary)' }}>
          <i className="pi pi-users" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }} />
          <p>No profiles yet. Add a family member first.</p>
        </div>
      ) : (
        <>
          <div
            style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}
            role="group"
            aria-label="Select profile"
          >
            {profiles.map(p => {
              const active = p.id === selectedProfileId
              return (
                <button
                  key={p.id}
                  type="button"
                  className="sky-profile-pill"
                  onClick={() => setSelectedProfileId(active ? null : p.id)}
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
                  <span
                    style={{
                      fontSize: '0.95rem',
                      opacity: 0.9,
                      marginLeft: '0.35rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                    }}
                  >
                    <i
                      className="pi pi-star-fill"
                      style={{ fontSize: '0.9rem', color: active ? '#fff' : 'var(--sky-amber)' }}
                    />
                    <span style={{ fontSize: '0.85rem' }}>{p.totalStars ?? 0}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* Goals list */}
          <div className="scroll-container" style={{ flex: 1 }}>
            {!selectedProfileId ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--sky-text-secondary)' }}>
                <i
                  className="pi pi-bullseye"
                  style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}
                />
                <p>Select a profile above to see their goals.</p>
              </div>
            ) : goalsLoading ? (
              <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
            ) : profileGoals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--sky-text-secondary)' }}>
                <i
                  className="pi pi-flag"
                  style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}
                />
                <p>No goals yet for {selectedProfile?.name}.</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Goals can be added from the profile settings in the admin portal.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {profileGoals.map(goal => (
                  <div key={goal.id} style={{ position: 'relative' }}>
                    <GoalCard
                      goal={goal}
                      accentColor={selectedProfile?.color}
                      onSpendStars={handleOpenSpend}
                      onWinAward={handleWinAward}
                    />
                    <button
                      type="button"
                      aria-label="Delete goal"
                      title="Delete goal"
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--sky-text-secondary)',
                        padding: '0.25rem',
                        lineHeight: 1,
                        fontSize: '0.85rem',
                        opacity: 0.5,
                      }}
                      onClick={() => handleDeleteGoal(goal)}
                    >
                      <i className="pi pi-times" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Spend Stars Dialog */}
      {spendDialogGoal && selectedProfile && (
        <Dialog
          header={`Apply Stars to "${spendDialogGoal.title}"`}
          visible
          onHide={() => setSpendDialogGoal(null)}
          style={{ width: '90vw', maxWidth: '400px' }}
          dismissableMask
          footer={
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button label="Cancel" className="p-button-text" onClick={() => setSpendDialogGoal(null)} />
              <Button
                label={`Apply ${spendAmount} ⭐`}
                onClick={handleSpendStars}
                disabled={spendAmount < 1 || spendAmount > selectedProfile.totalStars}
              />
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'var(--sky-surface-soft, #f8f9fa)',
                borderRadius: '12px',
              }}
            >
              <i className="pi pi-star-fill" style={{ color: 'var(--sky-amber)', fontSize: '1.2rem' }} />
              <span style={{ fontWeight: 600 }}>{selectedProfile.name} has</span>
              <span style={{ fontWeight: 700, color: 'var(--sky-amber)', fontSize: '1.15rem' }}>
                {selectedProfile.totalStars}
              </span>
              <span style={{ fontWeight: 600 }}>stars available</span>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Stars to apply toward this goal
              </label>
              <InputNumber
                value={spendAmount}
                onValueChange={e => setSpendAmount(Math.max(1, Math.min(e.value ?? 1, selectedProfile.totalStars)))}
                min={1}
                max={selectedProfile.totalStars}
                showButtons
                className="w-full"
              />
              <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--sky-text-secondary)' }}>
                {(() => {
                  const starsRemaining = Math.max(0, spendDialogGoal.starTarget - spendDialogGoal.starsApplied)
                  return `Goal progress: ${spendDialogGoal.starsApplied} / ${spendDialogGoal.starTarget} stars (${starsRemaining} still needed)`
                })()}
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}

export default GoalsPage
