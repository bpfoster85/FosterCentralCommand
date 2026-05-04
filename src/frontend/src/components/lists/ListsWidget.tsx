import React, { useState } from 'react'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { ProgressBar } from 'primereact/progressbar'
import { useLists } from '../../hooks/useLists'
import { ShoppingList, Profile } from '../../types'
import ListDetail from './ListDetail'

interface ListsWidgetProps {
  profiles: Profile[]
  favoritesOnly?: boolean
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
        <span style={{ flex: 1, fontWeight: 600, fontSize: '1rem' }}>
          {favoritesOnly ? 'Favorite Lists' : 'All Lists'}
        </span>
        <Button
          icon="pi pi-plus"
          label="New List"
          className="p-button-sm"
          onClick={() => setNewListVisible(true)}
        />
        {onToggleFullscreen && (
          <Button
            icon={isFullscreen ? 'pi pi-compress' : 'pi pi-arrows-alt'}
            className="p-button-sm p-button-secondary"
            onClick={onToggleFullscreen}
          />
        )}
      </div>

      {/* Lists Grid */}
      <div className="scroll-container" style={{ flex: 1 }}>
        {loading ? (
          <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
        ) : displayLists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-secondary)' }}>
            <i className="pi pi-list" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }} />
            <p>{favoritesOnly ? 'No favorite lists yet.' : 'No lists yet. Create one!'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {displayLists.map(list => {
              const progress = list.itemCount ? Math.round(((list.checkedCount || 0) / list.itemCount) * 100) : 0
              return (
                <Card
                  key={list.id}
                  style={{ width: 'calc(50% - 0.375rem)', minWidth: '150px', cursor: 'pointer', flexGrow: 1 }}
                  onClick={() => setSelectedList(list)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, flex: 1, fontSize: '0.95rem' }}>{list.title}</span>
                      <Button
                        icon={list.isFavorite ? 'pi pi-star-fill' : 'pi pi-star'}
                        className="p-button-text p-button-sm"
                        style={{ color: list.isFavorite ? 'gold' : undefined }}
                        onClick={e => { e.stopPropagation(); toggleFavorite(list.id) }}
                      />
                    </div>
                    {list.description && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)', margin: 0 }}>
                        {list.description}
                      </p>
                    )}
                    {list.itemCount !== undefined && list.itemCount > 0 && (
                      <>
                        <ProgressBar value={progress} style={{ height: '6px' }} showValue={false} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
                          {list.checkedCount || 0}/{list.itemCount} items
                        </span>
                      </>
                    )}
                  </div>
                </Card>
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
        style={{ width: '90vw', maxWidth: '400px' }}
        footer={
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button label="Cancel" className="p-button-text" onClick={() => setNewListVisible(false)} />
            <Button label="Create" onClick={handleCreateList} disabled={!newListTitle.trim()} />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Title *</label>
            <InputText
              value={newListTitle}
              onChange={e => setNewListTitle(e.target.value)}
              placeholder="List title"
              className="w-full"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description</label>
            <InputText
              value={newListDesc}
              onChange={e => setNewListDesc(e.target.value)}
              placeholder="Optional description"
              className="w-full"
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default ListsWidget
