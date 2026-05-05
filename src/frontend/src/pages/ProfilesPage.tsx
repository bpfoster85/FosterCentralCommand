import React, { useState } from 'react'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { ProgressBar } from 'primereact/progressbar'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { useProfiles } from '../hooks/useProfiles'
import ProfileCard from '../components/profiles/ProfileCard'
import type { Profile } from '../types'

const PROFILE_COLORS = ['#4CAF50', '#2196F3', '#F44336', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63', '#795548']

const ProfilesPage: React.FC = () => {
  const { profiles, loading, createProfile, updateProfile, deleteProfile } = useProfiles()
  const [dialogVisible, setDialogVisible] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({ name: '', email: '', color: PROFILE_COLORS[0] })

  const resetForm = () => setForm({ name: '', email: '', color: PROFILE_COLORS[0] })

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
            <ProfileCard
              key={profile.id}
              profile={profile}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Profile Form Dialog */}
      <Dialog
        header={editingProfile ? 'Edit Profile' : 'New Profile'}
        visible={dialogVisible}
        onHide={() => setDialogVisible(false)}
        style={{ width: '90vw', maxWidth: '400px' }}
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
    </div>
  )
}

export default ProfilesPage
