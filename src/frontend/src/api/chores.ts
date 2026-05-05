import apiClient from './apiClient'
import type { Chore, ChoreRecurrence } from '../types'

export const getChores = (profileId?: string) => {
  const params = profileId ? { profileId } : undefined
  return apiClient.get<Chore[]>('/chores', { params }).then(r => r.data)
}

export const getChore = (id: string) =>
  apiClient.get<Chore>(`/chores/${id}`).then(r => r.data)

export interface ChoreCreatePayload {
  title: string
  description?: string
  assignedProfileId: string
  starValue?: number
  dueDate: string
  recurrence?: ChoreRecurrence
  recurrenceDaysOfWeek?: number[]
  recurrenceEndDate?: string | null
}

export interface ChoreUpdatePayload {
  title?: string
  description?: string
  assignedProfileId?: string
  starValue?: number
  dueDate?: string
  recurrence?: ChoreRecurrence
  recurrenceDaysOfWeek?: number[]
  recurrenceEndDate?: string | null
}

export const createChore = (data: ChoreCreatePayload) =>
  apiClient.post<Chore>('/chores', data).then(r => r.data)

export const updateChore = (id: string, data: ChoreUpdatePayload) =>
  apiClient.put<Chore>(`/chores/${id}`, data).then(r => r.data)

export const deleteChore = (id: string) =>
  apiClient.delete(`/chores/${id}`)

/**
 * Toggles completion of a single occurrence of a chore on the given calendar
 * date. The date should be a "yyyy-MM-dd" string; it's sent as a query param
 * so the server can match it against the chore's completedDates list.
 */
export const toggleChoreCompleteOnDate = (id: string, date: string) =>
  apiClient.patch<Chore>(`/chores/${id}/complete`, null, { params: { date } }).then(r => r.data)

/**
 * Admin: toggles approval of a completed occurrence on the given date. The
 * occurrence must already be in completedDates. Approving awards the chore's
 * starValue to the assigned profile; unapproving refunds it.
 */
export const toggleChoreApprovalOnDate = (id: string, date: string) =>
  apiClient.patch<Chore>(`/chores/${id}/approve`, null, { params: { date } }).then(r => r.data)
