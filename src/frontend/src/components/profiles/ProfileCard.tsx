import React from 'react'
import { Card } from 'primereact/card'
import { Button } from 'primereact/button'
import { Avatar } from 'primereact/avatar'
import { Profile } from '../../types'

interface ProfileCardProps {
  profile: Profile
  onEdit: (profile: Profile) => void
  onDelete: (profile: Profile) => void
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onEdit, onDelete }) => {
  return (
    <Card style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Avatar
          label={profile.name.charAt(0).toUpperCase()}
          style={{ backgroundColor: profile.color, color: '#fff', width: '48px', height: '48px', fontSize: '1.4rem' }}
          shape="circle"
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>{profile.name}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-color-secondary)' }}>{profile.email}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <Button icon="pi pi-pencil" className="p-button-text p-button-sm" onClick={() => onEdit(profile)} />
          <Button icon="pi pi-trash" className="p-button-text p-button-sm p-button-danger" onClick={() => onDelete(profile)} />
        </div>
      </div>
    </Card>
  )
}

export default ProfileCard
