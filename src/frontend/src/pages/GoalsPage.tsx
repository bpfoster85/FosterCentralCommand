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
import type { Goal, Profile } from '../types'

const GoalsPage: React.FC = () => {
  const { profiles, loading: profilesLoading, refetch: refetchProfiles } = useProfiles()

  // Load all goals (no profileId filter) so we can group by profile on screen.
  const { goals, loading: goalsLoading, deleteGoal, spendStars, winGoal, refetch: refetchGoals } = useGoals()

  // Spend stars dialog — tracks which goal and which profile's stars to use.
  const [spendDialogGoal, setSpendDialogGoal] = useState<Goal | null>(null)
  const [spendDialogProfile, setSpendDialogProfile] = useState<Profile | null>(null)
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

  const handleOpenSpend = (goal: Goal, profile: Profile) => {
    setSpendDialogGoal(goal)
    setSpendDialogProfile(profile)
    setSpendAmount(1)
  }

  const handleSpendStars = async () => {
    if (!spendDialogGoal || !spendDialogProfile || spendAmount < 1) return
    await spendStars(spendDialogGoal.id, spendDialogProfile.id, spendAmount)
    refetchProfiles()
    setSpendDialogGoal(null)
    setSpendDialogProfile(null)
    setCelebration({ active: true, message: `${spendAmount} ⭐ applied to "${spendDialogGoal.title}"!` })
  }

  const handleWinAward = async (goal: Goal) => {
    await winGoal(goal.id)
    refetchGoals()
    setCelebration({ active: true, message: `🏆 ${goal.title} — Goal Achieved! Amazing job!` })
  }

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
      <ConfirmDialog />

      <CelebrationOverlay
        active={celebration.active}
        message={celebration.message}
        duration={7000}
        onDone={() => setCelebration({ active: false, message: '' })}
      />

      {profilesLoading || goalsLoading ? (
        <ProgressBar mode="indeterminate" style={{ height: '4px', marginBottom: '1rem' }} />
      ) : profiles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--sky-text-secondary)' }}>
          <i className="pi pi-users" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }} />
          <p>No profiles yet. Add a family member first.</p>
        </div>
      ) : (
        <div className="scroll-container" style={{ flex: 1 }}>
          {/* Goals grouped by profile — mirroring the chores layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(profiles.length, 3)}, minmax(280px, 1fr))`,
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
            {profiles.map(profile => {
              const profileGoals = goals.filter(g => g.profileId === profile.id)
              return (
                <div key={profile.id} className="sky-card" style={{ overflow: 'hidden' }}>
                  {/* Profile header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem 1.1rem',
                      background: profile.color,
                      color: '#fff',
                    }}
                  >
                    <span
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1rem',
                        flexShrink: 0,
                      }}
                    >
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', flex: 1, minWidth: 0 }}>
                      {profile.name}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        opacity: 0.9,
                      }}
                    >
                      <i className="pi pi-star-fill" style={{ fontSize: '0.95rem' }} />
                      {profile.totalStars ?? 0}
                    </span>
                  </div>

                  {/* Goals for this profile */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {profileGoals.length === 0 ? (
                      <div
                        style={{
                          padding: '1.5rem',
                          textAlign: 'center',
                          color: 'var(--sky-text-secondary)',
                          fontSize: '0.9rem',
                        }}
                      >
                        <i className="pi pi-flag" style={{ display: 'block', fontSize: '1.5rem', marginBottom: '0.5rem' }} />
                        No goals yet
                      </div>
                    ) : (
                      profileGoals.map((goal, idx) => (
                        <div
                          key={goal.id}
                          style={{
                            position: 'relative',
                            borderTop: idx > 0 ? '1px solid var(--sky-border, rgba(44,62,62,0.08))' : undefined,
                          }}
                        >
                          <GoalCard
                            goal={goal}
                            accentColor={profile.color}
                            onSpendStars={g => handleOpenSpend(g, profile)}
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
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Spend Stars Dialog */}
      {spendDialogGoal && spendDialogProfile && (
        <Dialog
          header={`Apply Stars to "${spendDialogGoal.title}"`}
          visible
          onHide={() => { setSpendDialogGoal(null); setSpendDialogProfile(null) }}
          style={{ width: '90vw', maxWidth: '400px' }}
          dismissableMask
          footer={
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button label="Cancel" className="p-button-text" onClick={() => { setSpendDialogGoal(null); setSpendDialogProfile(null) }} />
              <Button
                label={`Apply ${spendAmount} ⭐`}
                onClick={handleSpendStars}
                disabled={spendAmount < 1 || spendAmount > spendDialogProfile.totalStars}
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
              <span style={{ fontWeight: 600 }}>{spendDialogProfile.name} has</span>
              <span style={{ fontWeight: 700, color: 'var(--sky-amber)', fontSize: '1.15rem' }}>
                {spendDialogProfile.totalStars}
              </span>
              <span style={{ fontWeight: 600 }}>stars available</span>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Stars to apply toward this goal
              </label>
              <InputNumber
                value={spendAmount}
                onValueChange={e => setSpendAmount(Math.max(1, Math.min(e.value ?? 1, spendDialogProfile.totalStars)))}
                min={1}
                max={spendDialogProfile.totalStars}
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
