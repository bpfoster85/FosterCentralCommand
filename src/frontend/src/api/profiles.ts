import apiClient from './apiClient'
import { Profile } from '../types'

export const getProfiles = () => apiClient.get<Profile[]>('/profiles').then(r => r.data)
export const getProfile = (id: string) => apiClient.get<Profile>(`/profiles/${id}`).then(r => r.data)
export const createProfile = (data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>) =>
  apiClient.post<Profile>('/profiles', data).then(r => r.data)
export const updateProfile = (id: string, data: Partial<Profile>) =>
  apiClient.put<Profile>(`/profiles/${id}`, data).then(r => r.data)
export const deleteProfile = (id: string) => apiClient.delete(`/profiles/${id}`)
