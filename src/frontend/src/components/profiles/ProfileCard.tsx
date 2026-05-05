import React from 'react'
import { Button } from 'primereact/button'
import { Avatar } from 'primereact/avatar'
import type { Profile } from '../../types'

interface ProfileCardProps {
  profile: Profile
  onEdit: (profile: Profile) => void
  onDelete: (profile: Profile) => void
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onEdit, onDelete }) => {
  return (
    <div
      className="sky-card sky-fade-in"
      style={{
        marginBottom: '0.875rem',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        borderLeft: `4px solid ${profile.color}`,
      }}
    >
      <Avatar
        label={profile.name.charAt(0).toUpperCase()}
        style={{
          backgroundColor: profile.color,
          color: '#fff',
          width: '52px',
          height: '52px',
          fontSize: '1.5rem',
          fontWeight: 600,
          boxShadow: 'var(--sky-shadow-sm)',
        }}
        shape="circle"
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>{profile.name}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--sky-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {profile.email}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--sky-text-secondary)', fontWeight: 500 }}>
          <i className="pi pi-star-fill" style={{ color: 'var(--sky-amber)', fontSize: '0.85rem' }} />
          <span>{profile.totalStars ?? 0} {(profile.totalStars ?? 0) === 1 ? 'star' : 'stars'}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        <Button
          icon="pi pi-pencil"
          className="p-button-text p-button-sm p-button-rounded"
          onClick={() => onEdit(profile)}
          aria-label="Edit"
        />
        <Button
          icon="pi pi-trash"
          className="p-button-text p-button-sm p-button-rounded"
          style={{ color: 'var(--sky-coral)' }}
          onClick={() => onDelete(profile)}
          aria-label="Delete"
        />
      </div>
    </div>
  )
}

export default ProfileCard
