import apiClient from './apiClient'
import type { DadsSwearJar, DashboardChecklist, DashboardChecklistCalendarMarks } from '../types'

export const getDadsSwearJar = () =>
  apiClient.get<DadsSwearJar>('/dashboard/dads-swear-jar').then(r => r.data)

export const addDadsSwearJar = (amount: number = 1) => {
  const safeAmount = Math.max(1, Math.min(1000, Math.floor(amount)))
  return apiClient.post<DadsSwearJar>('/dashboard/dads-swear-jar/add', { amount: safeAmount }).then(r => r.data)
}

export const getDashboardChecklist = () =>
  apiClient.get<DashboardChecklist>('/dashboard/checklist').then(r => r.data)

export const getDashboardChecklistCalendarMarks = () =>
  apiClient.get<DashboardChecklistCalendarMarks>('/dashboard/checklist/calendar-marks').then(r => r.data)

export const setDashboardChecklistItem = (title: string, logo: string) =>
  apiClient.put<DashboardChecklist>('/dashboard/checklist', { title, logo }).then(r => r.data)

export const clearDashboardChecklist = () =>
  apiClient.delete<DashboardChecklist>('/dashboard/checklist').then(r => r.data)

export const toggleDashboardChecklistItem = (dateKey: string) =>
  apiClient.post<DashboardChecklist>('/dashboard/checklist/toggle', { dateKey }).then(r => r.data)
