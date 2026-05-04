import apiClient from './apiClient'
import { ShoppingList, ListItem } from '../types'

export const getLists = () => apiClient.get<ShoppingList[]>('/lists').then(r => r.data)
export const getList = (id: string) => apiClient.get<ShoppingList>(`/lists/${id}`).then(r => r.data)
export const createList = (data: Omit<ShoppingList, 'id' | 'createdAt' | 'updatedAt' | 'itemCount' | 'checkedCount'>) =>
  apiClient.post<ShoppingList>('/lists', data).then(r => r.data)
export const updateList = (id: string, data: Partial<ShoppingList>) =>
  apiClient.put<ShoppingList>(`/lists/${id}`, data).then(r => r.data)
export const deleteList = (id: string) => apiClient.delete(`/lists/${id}`)
export const toggleFavorite = (id: string) => apiClient.patch<ShoppingList>(`/lists/${id}/favorite`).then(r => r.data)

export const getListItems = (listId: string) =>
  apiClient.get<ListItem[]>(`/lists/${listId}/items`).then(r => r.data)
export const createListItem = (listId: string, data: Omit<ListItem, 'id' | 'listId' | 'createdAt' | 'updatedAt'>) =>
  apiClient.post<ListItem>(`/lists/${listId}/items`, data).then(r => r.data)
export const updateListItem = (listId: string, itemId: string, data: Partial<ListItem>) =>
  apiClient.put<ListItem>(`/lists/${listId}/items/${itemId}`, data).then(r => r.data)
export const deleteListItem = (listId: string, itemId: string) =>
  apiClient.delete(`/lists/${listId}/items/${itemId}`)
export const toggleListItem = (listId: string, itemId: string) =>
  apiClient.patch<ListItem>(`/lists/${listId}/items/${itemId}/toggle`).then(r => r.data)
