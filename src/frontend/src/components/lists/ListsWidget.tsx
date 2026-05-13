import React, { useState } from 'react'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { ProgressBar } from 'primereact/progressbar'
import { useLists } from '../../hooks/useLists'
import type { ShoppingList, Profile } from '../../types'
import ListDetail from './ListDetail'

interface ListsWidgetProps {
  profiles: Profile[]
  favoritesOnly?: boolean
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

const GROCERY_NAME = 'grocery'

const ListsWidget: React.FC<ListsWidgetProps> = ({ profiles, favoritesOnly, isFullscreen, onToggleFullscreen }) => {
  const { lists, loading, createList, deleteList, toggleFavorite } = useLists()
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null)
  const [newListVisible, setNewListVisible] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [newListDesc, setNewListDesc] = useState('')

  const displayLists = favoritesOnly ? lists.filter(l => l.isFavorite) : lists

  const handleCreateList = async () => {
    if (!newListTitle.trim()) return
    await createList({
      title: newListTitle.trim(),
      description: newListDesc.trim() || undefined,
      isFavorite: false,
      createdByProfileId: profiles[0]?.id || ''
    })
    setNewListTitle('')
    setNewListDesc('')
    setNewListVisible(false)
  }

  const handleDelete = async (list: ShoppingList) => {
    const ok = window.confirm(`Delete "${list.title}" and all its items? This cannot be undone.`)
    if (!ok) return
    await deleteList(list.id)
  }

  if (selectedList) {
    return (
      <ListDetail
        list={selectedList}
        profiles={profiles}
        onBack={() => setSelectedList(null)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
      />
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="sky-widget-header">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
          <Button
            icon="pi pi-plus"
            label="New"
            className="p-button-sm"
            onClick={() => setNewListVisible(true)}
          />
          {onToggleFullscreen && (
            <Button
              icon={isFullscreen ? 'pi pi-compress' : 'pi pi-arrows-alt'}
              className="p-button-sm p-button-text p-button-rounded"
              onClick={onToggleFullscreen}
            />
          )}
        </div>
      </div>

      {/* Lists Grid */}
      <div className="scroll-container sky-widget-body" style={{ flex: 1 }}>
        {loading ? (
          <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
        ) : displayLists.length === 0 ? (
          <div className="sky-empty-state">
            <i className={favoritesOnly ? 'pi pi-star' : 'pi pi-list'} />
            <p>{favoritesOnly ? 'No favorites yet — tap the star to pin a list here.' : 'No lists yet. Create your first list!'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem' }}>
            {displayLists.map(list => {
              const progress = list.itemCount ? Math.round(((list.checkedCount || 0) / list.itemCount) * 100) : 0
              const isPermanent = list.title.trim().toLowerCase() === GROCERY_NAME
              return (
                <div
                  key={list.id}
                  className="sky-card sky-fade-in"
                  style={{
                    width: 'calc(50% - 0.4375rem)',
                    minWidth: '160px',
                    cursor: 'pointer',
                    flexGrow: 1,
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.625rem'
                  }}
                  onClick={() => setSelectedList(list)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.25rem' }}>
                    <span style={{ fontWeight: 600, flex: 1, fontSize: '1rem', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                      {list.title}
                    </span>
                    <Button
                      icon={list.isFavorite ? 'pi pi-star-fill' : 'pi pi-star'}
                      className="p-button-text p-button-sm p-button-rounded"
                      style={{ color: list.isFavorite ? 'var(--sky-amber)' : 'var(--sky-text-secondary)', minHeight: '32px', width: '32px', height: '32px' }}
                      onClick={e => { e.stopPropagation(); toggleFavorite(list.id) }}
                      aria-label={list.isFavorite ? 'Unfavorite' : 'Favorite'}
                    />
                    {!isPermanent && (
                      <Button
                        icon="pi pi-trash"
                        className="p-button-text p-button-sm p-button-rounded p-button-danger"
                        style={{ minHeight: '32px', width: '32px', height: '32px' }}
                        onClick={e => { e.stopPropagation(); handleDelete(list) }}
                        aria-label="Delete list"
                      />
                    )}
                  </div>
                  {list.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--sky-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      {list.description}
                    </p>
                  )}
                  {list.itemCount !== undefined && list.itemCount > 0 && (
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <ProgressBar value={progress} style={{ height: '6px' }} showValue={false} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--sky-text-secondary)', fontWeight: 500 }}>
                        {list.checkedCount || 0} of {list.itemCount} done
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create List Dialog */}
      <Dialog
        header="New List"
        visible={newListVisible}
        onHide={() => setNewListVisible(false)}
        style={{ width: '90vw', maxWidth: '440px' }}
        dismissableMask
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button label="Cancel" className="p-button-text" onClick={() => setNewListVisible(false)} />
            <Button label="Create" onClick={handleCreateList} disabled={!newListTitle.trim()} />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem', color: 'var(--sky-text-secondary)' }}>Title</label>
            <InputText
              value={newListTitle}
              onChange={e => setNewListTitle(e.target.value)}
              placeholder="What's this list for?"
              className="w-full"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem', color: 'var(--sky-text-secondary)' }}>Description (optional)</label>
            <InputText
              value={newListDesc}
              onChange={e => setNewListDesc(e.target.value)}
              placeholder="Add a note"
              className="w-full"
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default ListsWidget
