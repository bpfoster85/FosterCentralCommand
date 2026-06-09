import apiClient from './apiClient'
import type { DadsSwearJar } from '../types'

export const getDadsSwearJar = () =>
  apiClient.get<DadsSwearJar>('/dashboard/dads-swear-jar').then(r => r.data)

export const addDadsSwearJar = (amount: number = 1) => {
  const safeAmount = Math.max(1, Math.min(1000, Math.floor(amount)))
  return apiClient.post<DadsSwearJar>('/dashboard/dads-swear-jar/add', { amount: safeAmount }).then(r => r.data)
}
