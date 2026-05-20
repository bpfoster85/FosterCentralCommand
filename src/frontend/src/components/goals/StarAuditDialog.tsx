import React, { useMemo } from 'react'
import { Dialog } from 'primereact/dialog'
import { Button } from 'primereact/button'
import { ProgressBar } from 'primereact/progressbar'
import type { Profile, StarLedgerEntry, StarLedgerReason } from '../../types'

interface StarAuditDialogProps {
  visible: boolean
  entries: StarLedgerEntry[]
  loading: boolean
  error: string | null
  profiles: Profile[]
  selectedProfileId: string | null
  onProfileChange: (profileId: string | null) => void
  onHide: () => void
  onRefresh: () => void
}

const reasonLabel = (reason: StarLedgerReason): string => {
  switch (reason) {
    case 'ChoreApproved': return 'Chore approved'
    case 'ChoreUnapproved': return 'Approval removed'
    case 'ChoreUncompleted': return 'Completion removed'
    case 'GoalSpent': return 'Stars spent on goal'
    case 'CustomAward': return 'Custom stars awarded'
    case 'ManualAdjustment': return 'Manual adjustment'
    default: return reason
  }
}

const reasonIcon = (reason: StarLedgerReason): string => {
  switch (reason) {
    case 'ChoreApproved': return 'pi pi-check-circle'
    case 'ChoreUnapproved': return 'pi pi-undo'
    case 'ChoreUncompleted': return 'pi pi-refresh'
    case 'GoalSpent': return 'pi pi-flag'
    case 'CustomAward': return 'pi pi-gift'
    case 'ManualAdjustment': return 'pi pi-cog'
    default: return 'pi pi-history'
  }
}

const formatTime = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const StarAuditDialog: React.FC<StarAuditDialogProps> = ({
  visible,
  entries,
  loading,
  error,
  profiles,
  selectedProfileId,
  onProfileChange,
  onHide,
  onRefresh,
}) => {
  const profileOptions = useMemo(
    () => [
      { label: 'All Profiles', value: null },
      ...profiles.map(p => ({ label: p.name, value: p.id })),
    ],
    [profiles]
  )

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [entries]
  )

  return (
    <Dialog
      header="Star Audit Log"
      visible={visible}
      onHide={onHide}
      style={{ width: '96vw', maxWidth: '760px' }}
      dismissableMask
      footer={
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button label="Refresh" className="p-button-text" icon="pi pi-refresh" onClick={onRefresh} />
          <Button label="Close" onClick={onHide} />
        </div>
      }
    >
      <div style={{ fontSize: '0.86rem', color: 'var(--sky-text-secondary)', marginBottom: '0.75rem' }}>
        Newest to oldest. Each line is one individual star transaction.
      </div>

      <div style={{ marginBottom: '0.9rem' }}>
        <div className="sky-audit-filter-pills" role="radiogroup" aria-label="Filter audit log by profile">
          {profileOptions.map(option => {
            const active = option.value === selectedProfileId
            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={active}
                className={`sky-audit-filter-pill ${active ? 'active' : ''}`}
                onClick={() => onProfileChange(option.value)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
      ) : error ? (
        <div className="sky-audit-empty">{error}</div>
      ) : sortedEntries.length === 0 ? (
        <div className="sky-audit-empty">No star history yet. New awards and spends will appear here.</div>
      ) : (
        <div className="sky-audit-list">
          {sortedEntries.map(entry => {
            const positive = entry.delta > 0
            const deltaLabel = `${positive ? '+' : ''}${entry.delta}`

            return (
              <div key={entry.id} className="sky-audit-item">
                <div className={`sky-audit-delta ${positive ? 'positive' : 'negative'}`}>{deltaLabel}</div>

                <div className="sky-audit-main">
                  <div className="sky-audit-title-row">
                    <i className={reasonIcon(entry.reason)} aria-hidden />
                    <span className="sky-audit-title">{reasonLabel(entry.reason)}</span>
                    <span className="sky-audit-time">{formatTime(entry.createdAt)}</span>
                  </div>

                  <div className="sky-audit-detail-row">
                    <span
                      className="sky-audit-profile-chip"
                      style={{ background: entry.profileColor || '#e9ecef' }}
                    >
                      {entry.profileName}
                    </span>
                    {entry.sourceTitle ? <span className="sky-audit-source">{entry.sourceTitle}</span> : null}
                    {entry.occurrenceDate ? <span className="sky-audit-date">for {entry.occurrenceDate}</span> : null}
                    {entry.note ? <span className="sky-audit-note">{entry.note}</span> : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Dialog>
  )
}

export default StarAuditDialog
