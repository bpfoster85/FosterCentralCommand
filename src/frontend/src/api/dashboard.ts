import apiClient from './apiClient'
import type { DadsSwearJar } from '../types'

export const getDadsSwearJar = () =>
  apiClient.get<DadsSwearJar>('/dashboard/dads-swear-jar').then(r => r.data)

export const addDadsSwearJar = (amount: number = 1) =>
  apiClient.post<DadsSwearJar>('/dashboard/dads-swear-jar/add', { amount }).then(r => r.data)
