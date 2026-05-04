import React, { useState } from 'react'
import { Button } from 'primereact/button'
import { Checkbox } from 'primereact/checkbox'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { Calendar } from 'primereact/calendar'
import { MultiSelect } from 'primereact/multiselect'
import { ProgressBar } from 'primereact/progressbar'
import { useListItems } from '../../hooks/useLists'
import { ShoppingList, ListItem, Profile } from '../../types'

interface ListDetailProps {
  list: ShoppingList
  profiles: Profile[]
  onBack: () => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

const ListDetail: React.FC<ListDetailProps> = ({ list, profiles, onBack, isFullscreen, onToggleFullscreen }) => {
  const { items, loading, createItem, updateItem, deleteItem, toggleItem } = useListItems(list.id)
  const [addItemVisible, setAddItemVisible] = useState(false)
  const [editItem, setEditItem] = useState<ListItem | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    attendeeProfileIds: [] as string[]
  })

  const profileOptions = profiles.map(p => ({ label: p.name, value: p.id }))
  const checkedCount = items.filter(i => i.isChecked).length
  const progress = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0

  const resetForm = () => setForm({ title: '', description: '', startDate: null, endDate: null, attendeeProfileIds: [] })

  const handleSaveItem = async () => {
    if (!form.title.trim()) return
    const data = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      isChecked: false,
      startDate: form.startDate?.toISOString(),
      endDate: form.endDate?.toISOString(),
      attendeeProfileIds: form.attendeeProfileIds,
      createdByProfileId: profiles[0]?.id || ''
    }
    if (editItem) {
      await updateItem(editItem.id, data)
      setEditItem(null)
    } else {
      await createItem(data)
      setAddItemVisible(false)
    }
    resetForm()
  }

  const openEdit = (item: ListItem) => {
    setEditItem(item)
    setForm({
      title: item.title,
      description: item.description || '',
      startDate: item.startDate ? new Date(item.startDate) : null,
      endDate: item.endDate ? new Date(item.endDate) : null,
      attendeeProfileIds: item.attendeeProfileIds
    })
  }

  const ItemForm = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Title *</label>
        <InputText value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full" />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description</label>
        <InputTextarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full" />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Start Date</label>
        <Calendar value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.value as Date | null }))} showTime className="w-full" />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>End Date</label>
        <Calendar value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.value as Date | null }))} showTime className="w-full" />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Attendees</label>
        <MultiSelect value={form.attendeeProfileIds} options={profileOptions} onChange={e => setForm(f => ({ ...f, attendeeProfileIds: e.value }))} display="chip" className="w-full" />
      </div>
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <Button icon="pi pi-arrow-left" className="p-button-text p-button-sm" onClick={onBack} />
        <span style={{ flex: 1, fontWeight: 600 }}>{list.title}</span>
        <Button icon="pi pi-plus" label="Add Item" className="p-button-sm" onClick={() => { resetForm(); setAddItemVisible(true) }} />
        {onToggleFullscreen && (
          <Button icon={isFullscreen ? 'pi pi-compress' : 'pi pi-arrows-alt'} className="p-button-sm p-button-secondary" onClick={onToggleFullscreen} />
        )}
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
          items.map(item => {
            const attendeeNames = item.attendeeProfileIds
              .map(id => profiles.find(p => p.id === id)?.name)
              .filter(Boolean)
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderBottom: '1px solid var(--surface-border)',
                  opacity: item.isChecked ? 0.6 : 1
                }}
              >
                <Checkbox
                  checked={item.isChecked}
                  onChange={() => toggleItem(item.id)}
                  style={{ marginTop: '2px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, textDecoration: item.isChecked ? 'line-through' : 'none' }}>
                    {item.title}
                  </div>
                  {item.description && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-color-secondary)', marginTop: '0.25rem' }}>
                      {item.description}
                    </div>
                  )}
                  {(item.startDate || item.endDate) && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)', marginTop: '0.25rem' }}>
                      <i className="pi pi-clock" style={{ marginRight: '0.25rem' }} />
                      {item.startDate && new Date(item.startDate).toLocaleDateString()}
                      {item.endDate && ` – ${new Date(item.endDate).toLocaleDateString()}`}
                    </div>
                  )}
                  {attendeeNames.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)', marginTop: '0.25rem' }}>
                      <i className="pi pi-users" style={{ marginRight: '0.25rem' }} />
                      {attendeeNames.join(', ')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <Button icon="pi pi-pencil" className="p-button-text p-button-sm" onClick={() => openEdit(item)} />
                  <Button icon="pi pi-trash" className="p-button-text p-button-sm p-button-danger" onClick={() => deleteItem(item.id)} />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Item Dialog */}
      <Dialog
        header="New Item"
        visible={addItemVisible}
        onHide={() => setAddItemVisible(false)}
        style={{ width: '90vw', maxWidth: '500px' }}
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button label="Cancel" className="p-button-text" onClick={() => setAddItemVisible(false)} />
            <Button label="Add" onClick={handleSaveItem} disabled={!form.title.trim()} />
          </div>
        }
      >
        {ItemForm}
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog
        header="Edit Item"
        visible={!!editItem}
        onHide={() => { setEditItem(null); resetForm() }}
        style={{ width: '90vw', maxWidth: '500px' }}
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button label="Cancel" className="p-button-text" onClick={() => { setEditItem(null); resetForm() }} />
            <Button label="Save" onClick={handleSaveItem} disabled={!form.title.trim()} />
          </div>
        }
      >
        {ItemForm}
      </Dialog>
    </div>
  )
}

export default ListDetail
