import React, { useState } from 'react'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { InputNumber } from 'primereact/inputnumber'
import { ProgressBar } from 'primereact/progressbar'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { useProfiles } from '../hooks/useProfiles'
import { useGoals } from '../hooks/useGoals'
import ProfileCard from '../components/profiles/ProfileCard'
import type { Profile } from '../types'

const PROFILE_COLORS = ['#4CAF50', '#2196F3', '#F44336', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#795548']
const EMOJI_PRESETS = ['🎮', '🎁', '🏖️', '🍕', '🎬', '🚲', '📚', '🎨', '⚽', '🛹', '🎤', '🌴', '⭐']

const ProfilesPage: React.FC = () => {
  const { profiles, loading, createProfile, updateProfile, deleteProfile } = useProfiles()
  const [dialogVisible, setDialogVisible] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({ name: '', email: '', color: PROFILE_COLORS[0] })

  // Goal creation within profile settings
  const [goalDialogProfile, setGoalDialogProfile] = useState<Profile | null>(null)
  const { goals, createGoal, deleteGoal } = useGoals(goalDialogProfile?.id)
  const [goalForm, setGoalForm] = useState({ title: '', emoji: '⭐', starTarget: 10 })

  const resetForm = () => setForm({ name: '', email: '', color: PROFILE_COLORS[0] })
  const resetGoalForm = () => setGoalForm({ title: '', emoji: '⭐', starTarget: 10 })

  const openCreate = () => {
    setEditingProfile(null)
    resetForm()
    setDialogVisible(true)
  }

  const openEdit = (profile: Profile) => {
    setEditingProfile(profile)
    setForm({ name: profile.name, email: profile.email, color: profile.color })
    setDialogVisible(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return
    if (editingProfile) {
      await updateProfile(editingProfile.id, { name: form.name.trim(), email: form.email.trim(), color: form.color })
    } else {
      await createProfile({ name: form.name.trim(), email: form.email.trim(), color: form.color })
    }
    setDialogVisible(false)
    resetForm()
  }

  const handleDelete = (profile: Profile) => {
    confirmDialog({
      message: `Delete profile "${profile.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => deleteProfile(profile.id)
    })
  }

  const openGoalSettings = (profile: Profile) => {
    setGoalDialogProfile(profile)
    resetGoalForm()
  }

  const handleCreateGoal = async () => {
    if (!goalDialogProfile || !goalForm.title.trim()) return
    await createGoal({
      profileId: goalDialogProfile.id,
      title: goalForm.title.trim(),
      emoji: goalForm.emoji || '⭐',
      starTarget: goalForm.starTarget,
    })
    resetGoalForm()
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

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
      <ConfirmDialog />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ flex: 1, fontSize: '1.2rem', fontWeight: 600 }}>Profiles</span>
        <Button icon="pi pi-plus" label="Add Profile" onClick={openCreate} />
      </div>

      {/* Profile List */}
      <div className="scroll-container" style={{ flex: 1 }}>
        {loading ? (
          <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
        ) : profiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-color-secondary)' }}>
            <i className="pi pi-users" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }} />
            <p>No profiles yet. Add family members to get started.</p>
          </div>
        ) : (
          profiles.map(profile => (
            <div key={profile.id} style={{ marginBottom: '0.5rem' }}>
              <ProfileCard
                profile={profile}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.25rem', paddingRight: '0.25rem' }}>
                <Button
                  icon="pi pi-flag"
                  label="Manage Goals"
                  className="p-button-text p-button-sm"
                  style={{ fontSize: '0.82rem' }}
                  onClick={() => openGoalSettings(profile)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Profile Form Dialog */}
      <Dialog
        header={editingProfile ? 'Edit Profile' : 'New Profile'}
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        style={{ width: '90vw', maxWidth: '400px' }}
        dismissableMask
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button label="Cancel" className="p-button-text" onClick={() => setDialogVisible(false)} />
            <Button label="Save" onClick={handleSave} disabled={!form.name.trim() || !form.email.trim()} />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Name *</label>
            <InputText value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full" placeholder="Full name" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email *</label>
            <InputText value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full" placeholder="email@example.com" type="email" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Color</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {PROFILE_COLORS.map(color => (
                <div
                  key={color}
                  onClick={() => setForm(f => ({ ...f, color }))}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    cursor: 'pointer',
                    border: form.color === color ? '3px solid var(--primary-color)' : '3px solid transparent',
                    boxShadow: form.color === color ? '0 0 0 2px white inset' : 'none'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </Dialog>

      {/* Goal Settings Dialog */}
      <Dialog
        header={`Goals — ${goalDialogProfile?.name}`}
        visible={!!goalDialogProfile}
        onHide={() => { setGoalDialogProfile(null); resetGoalForm() }}
        style={{ width: '90vw', maxWidth: '520px' }}
        dismissableMask
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Existing goals */}
          {goals.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.6rem', fontSize: '0.95rem' }}>
                Current Goals
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {goals.map(g => (
                  <div
                    key={g.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.6rem 0.85rem',
                      background: 'var(--sky-surface-soft, #f8f9fa)',
                      borderRadius: '10px',
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
                      className="p-button-text p-button-danger p-button-sm"
                      aria-label="Delete goal"
                      onClick={() => handleDeleteGoal(g.id, g.title)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New goal form */}
          <div
            style={{
              border: '1px solid var(--sky-border, #e2e8f0)',
              borderRadius: '14px',
              padding: '1rem',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              Add New Goal
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }}>
                  Goal Name *
                </label>
                <InputText
                  value={goalForm.title}
                  onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full"
                  placeholder="e.g. New Video Game"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }}>
                  Emoji
                </label>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                  {EMOJI_PRESETS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setGoalForm(f => ({ ...f, emoji: e }))}
                      style={{
                        fontSize: '1.35rem',
                        background: goalForm.emoji === e ? 'var(--sky-surface-soft, #f3f4f6)' : 'none',
                        border: goalForm.emoji === e ? '2px solid var(--primary-color)' : '2px solid transparent',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        padding: '0.15rem 0.25rem',
                        lineHeight: 1,
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
                  className="w-full"
                  placeholder="Or type any emoji"
                  maxLength={8}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }}>
                  Stars Required <i className="pi pi-star-fill" style={{ color: 'var(--sky-amber)', fontSize: '0.85rem' }} />
                </label>
                <InputNumber
                  value={goalForm.starTarget}
                  onValueChange={e => setGoalForm(f => ({ ...f, starTarget: e.value ?? 1 }))}
                  min={1}
                  max={9999}
                  showButtons
                  className="w-full"
                />
              </div>
              <Button
                label="Add Goal"
                icon="pi pi-plus"
                onClick={handleCreateGoal}
                disabled={!goalForm.title.trim() || goalForm.starTarget < 1}
                className="p-button-outlined"
              />
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default ProfilesPage

