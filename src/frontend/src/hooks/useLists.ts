import { useState, useEffect, useCallback } from 'react'
import { ShoppingList, ListItem } from '../types'
import * as listsApi from '../api/lists'

export const useLists = () => {
  const [lists, setLists] = useState<ShoppingList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLists = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listsApi.getLists()
      setLists(data)
      setError(null)
    } catch (err) {
      setError('Failed to load lists')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLists() }, [fetchLists])

  const createList = async (data: Omit<ShoppingList, 'id' | 'createdAt' | 'updatedAt' | 'itemCount' | 'checkedCount'>) => {
    const list = await listsApi.createList(data)
    setLists(prev => [...prev, list])
    return list
  }

  const updateList = async (id: string, data: Partial<ShoppingList>) => {
    const updated = await listsApi.updateList(id, data)
    setLists(prev => prev.map(l => l.id === id ? updated : l))
    return updated
  }

  const deleteList = async (id: string) => {
    await listsApi.deleteList(id)
    setLists(prev => prev.filter(l => l.id !== id))
  }

  const toggleFavorite = async (id: string) => {
    const updated = await listsApi.toggleFavorite(id)
    setLists(prev => prev.map(l => l.id === id ? updated : l))
    return updated
  }

  return { lists, loading, error, refetch: fetchLists, createList, updateList, deleteList, toggleFavorite }
}

export const useListItems = (listId: string | null) => {
  const [items, setItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchItems = useCallback(async () => {
    if (!listId) return
    try {
      setLoading(true)
      const data = await listsApi.getListItems(listId)
      setItems(data)
    } finally {
      setLoading(false)
    }
  }, [listId])

  useEffect(() => { fetchItems() }, [fetchItems])

  const createItem = async (data: Omit<ListItem, 'id' | 'listId' | 'createdAt' | 'updatedAt'>) => {
    if (!listId) return
    const item = await listsApi.createListItem(listId, data)
    setItems(prev => [...prev, item])
    return item
  }

  const updateItem = async (itemId: string, data: Partial<ListItem>) => {
    if (!listId) return
    const updated = await listsApi.updateListItem(listId, itemId, data)
    setItems(prev => prev.map(i => i.id === itemId ? updated : i))
    return updated
  }

  const deleteItem = async (itemId: string) => {
    if (!listId) return
    await listsApi.deleteListItem(listId, itemId)
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  const toggleItem = async (itemId: string) => {
    if (!listId) return
    const updated = await listsApi.toggleListItem(listId, itemId)
    setItems(prev => prev.map(i => i.id === itemId ? updated : i))
    return updated
  }

  return { items, loading, refetch: fetchItems, createItem, updateItem, deleteItem, toggleItem }
}
