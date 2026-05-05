import apiClient from './apiClient'

export interface FamilyLoginResponse {
  familyId: string
  name: string
}

export interface AdminLoginResponse {
  adminKey: string
}

/** POST /api/auth/family-login — returns the family id on success. */
export const familyLogin = (name: string, password: string) =>
  apiClient
    .post<FamilyLoginResponse>('/auth/family-login', { name, password })
    .then(r => r.data)

/** POST /api/auth/admin-login — returns the admin key on success. */
export const adminLogin = (password: string) =>
  apiClient
    .post<AdminLoginResponse>('/auth/admin-login', { password })
    .then(r => r.data)
