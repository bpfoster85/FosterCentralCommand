import apiClient from './apiClient'
import type { Goal } from '../types'

export const getGoals = (profileId?: string) => {
  const params = profileId ? { profileId } : undefined
  return apiClient.get<Goal[]>('/goals', { params }).then(r => r.data)
}

export const getGoal = (id: string) =>
  apiClient.get<Goal>(`/goals/${id}`).then(r => r.data)

export const createGoal = (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'starsApplied' | 'isAchieved'>) =>
  apiClient.post<Goal>('/goals', data).then(r => r.data)

export const updateGoal = (id: string, data: Partial<Pick<Goal, 'title' | 'emoji' | 'starTarget'>>) =>
  apiClient.put<Goal>(`/goals/${id}`, data).then(r => r.data)

export const deleteGoal = (id: string) =>
  apiClient.delete(`/goals/${id}`)

export const spendStarsOnGoal = (id: string, profileId: string, amount: number) =>
  apiClient.post<Goal>(`/goals/${id}/spend-stars`, { profileId, amount }).then(r => r.data)

export const winGoal = (id: string) =>
  apiClient.post<Goal>(`/goals/${id}/win`).then(r => r.data)
