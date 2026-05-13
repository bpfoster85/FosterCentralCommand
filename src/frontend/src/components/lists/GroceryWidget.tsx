import React, { useMemo, useState } from 'react'
import { Button } from 'primereact/button'
import { Checkbox } from 'primereact/checkbox'
import { InputText } from 'primereact/inputtext'
import { ProgressBar } from 'primereact/progressbar'
import { useLists, useListItems } from '../../hooks/useLists'
import type { Profile } from '../../types'
import SwipeToDelete from './SwipeToDelete'

interface GroceryWidgetProps {
  profiles: Profile[]
}

const GROCERY_NAME = 'Grocery'

const GroceryWidget: React.FC<GroceryWidgetProps> = ({ profiles }) => {
  const { lists, loading: listsLoading, createList } = useLists()
  const groceryList = useMemo(
    () => lists.find(l => l.title.trim().toLowerCase() === GROCERY_NAME.toLowerCase()),
    [lists]
  )
  const { items, loading: itemsLoading, createItem, deleteItem } = useListItems(groceryList?.id ?? null)
  const [quickAdd, setQuickAdd] = useState('')
  const [creating, setCreating] = useState(false)

  const handleAdd = async () => {
    const title = quickAdd.trim()
    if (!title || !groceryList) return
    await createItem({
      title,
      isChecked: false,
      attendeeProfileIds: [],
      createdByProfileId: profiles[0]?.id ?? '',
    })
    setQuickAdd('')
  }

  const handleCreateGroceryList = async () => {
    setCreating(true)
    try {
      await createList({
        title: GROCERY_NAME,
        isFavorite: false,
        createdByProfileId: profiles[0]?.id ?? '',
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="sky-widget-header">
        <span style={{ fontWeight: 600, fontSize: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="pi pi-shopping-cart" style={{ fontSize: '1.25rem' }} />
          Grocery
        </span>
      </div>

      <div
        className="sky-widget-body"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.625rem', overflow: 'hidden', padding: '0.75rem' }}
      >
        {listsLoading ? (
          <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
        ) : !groceryList ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0', textAlign: 'center' }}>
            <span style={{ color: 'var(--sky-text-secondary)', fontSize: '1.05rem' }}>
              No "Grocery" list yet.
            </span>
            <Button
              label="Create Grocery list"
              icon="pi pi-plus"
              onClick={handleCreateGroceryList}
              disabled={creating}
            />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <InputText
                value={quickAdd}
                onChange={e => setQuickAdd(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                placeholder="Add an item..."
                className="w-full"
                style={{ fontSize: '1.05rem', padding: '0.6rem 0.75rem' }}
              />
              <Button
                label="Add"
                icon="pi pi-plus"
                className="w-full"
                onClick={handleAdd}
                disabled={!quickAdd.trim()}
              />
            </div>

            <div className="scroll-container" style={{ flex: 1 }}>
              {itemsLoading ? (
                <ProgressBar mode="indeterminate" style={{ height: '4px' }} />
              ) : items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--sky-text-secondary)', fontSize: '1.05rem' }}>
                  Nothing on the list yet.
                </div>
              ) : (
                items.map(item => (
                  <SwipeToDelete key={item.id} onDelete={() => deleteItem(item.id)}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.7rem',
                        padding: '0.6rem 0.25rem',
                        borderBottom: '1px solid var(--surface-border)',
                      }}
                    >
                      <Checkbox checked={false} onChange={() => deleteItem(item.id)} />
                      <span style={{ flex: 1, fontSize: '1.15rem', lineHeight: 1.35, fontWeight: 600 }}>
                        {item.title}
                      </span>
                    </div>
                  </SwipeToDelete>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default GroceryWidget
