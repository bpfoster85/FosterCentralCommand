import React, { useState } from 'react'
import { Button } from 'primereact/button'
import { Checkbox } from 'primereact/checkbox'
import { InputText } from 'primereact/inputtext'
import { ProgressBar } from 'primereact/progressbar'
import { useListItems } from '../../hooks/useLists'
import type { ShoppingList, Profile } from '../../types'

interface ListDetailProps {
  list: ShoppingList
  profiles: Profile[]
  onBack: () => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

const ListDetail: React.FC<ListDetailProps> = ({ list, profiles, onBack, isFullscreen, onToggleFullscreen }) => {
  const { items, loading, createItem, deleteItem, toggleItem } = useListItems(list.id)
  const [quickAddTitle, setQuickAddTitle] = useState('')

  const checkedCount = items.filter(i => i.isChecked).length
  const progress = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0

  const handleQuickAdd = async () => {
    const title = quickAddTitle.trim()
    if (!title) return
    await createItem({
      title,
      isChecked: false,
      attendeeProfileIds: [],
      createdByProfileId: profiles[0]?.id || ''
    })
    setQuickAddTitle('')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <Button icon="pi pi-arrow-left" className="p-button-text p-button-sm" onClick={onBack} />
        <span style={{ flex: 1, fontWeight: 600 }}>{list.title}</span>
        {onToggleFullscreen && (
          <Button icon={isFullscreen ? 'pi pi-compress' : 'pi pi-arrows-alt'} className="p-button-sm p-button-secondary" onClick={onToggleFullscreen} />
        )}
      </div>

      {/* Quick Add */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <InputText
          value={quickAddTitle}
          onChange={e => setQuickAddTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd() }}
          placeholder="Add an item..."
          className="w-full"
          style={{ flex: 1 }}
        />
        <Button
          icon="pi pi-plus"
          className="p-button-sm"
          onClick={handleQuickAdd}
          disabled={!quickAddTitle.trim()}
          aria-label="Add item"
        />
      </div>

      {/* Progress */}
      {items.length > 0 && (
        <div style={{ marginBottom: '0.5rem' }}>
          <ProgressBar value={progress} style={{ height: '8px' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>{checkedCount}/{items.length} completed</span>
        </div>
      )}

      {/* Items */}
      <div className="scroll-container" style={{ flex: 1 }}>
        {loading ? (
          <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-secondary)' }}>
            <p>No items yet. Add one!</p>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                borderBottom: '1px solid var(--surface-border)',
                opacity: item.isChecked ? 0.6 : 1
              }}
            >
              <Checkbox checked={item.isChecked} onChange={() => toggleItem(item.id)} />
              <div style={{ flex: 1, fontWeight: 500, textDecoration: item.isChecked ? 'line-through' : 'none' }}>
                {item.title}
              </div>
              <Button
                icon="pi pi-trash"
                className="p-button-text p-button-sm p-button-danger"
                onClick={() => deleteItem(item.id)}
                aria-label="Delete item"
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ListDetail
