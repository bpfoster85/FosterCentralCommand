import apiClient from './apiClient'

export interface FamilyDto {
  id: string
  name: string
  googleCalendarId: string | null
  hasGoogleApiKey: boolean
  hasGoogleServiceAccount: boolean
  createdAt: string
  updatedAt: string
}

export interface UpdateFamilyRequest {
  name?: string | null
  googleCalendarId?: string | null
  googleApiKey?: string | null
  googleServiceAccountJson?: string | null
  password?: string | null
}

export const getMyFamily = () =>
  apiClient.get<FamilyDto[]>('/families').then(r => r.data[0])

export const updateFamily = (id: string, data: UpdateFamilyRequest) =>
  apiClient.put<FamilyDto>(`/families/${id}`, data).then(r => r.data)
