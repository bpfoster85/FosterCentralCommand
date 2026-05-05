import apiClient from './apiClient'

export interface FamilyLoginResponse {
  familyId: string
  name: string
}

export interface AdminLoginResponse {
  adminKey: string
  familyId: string
  name: string
}

/** POST /api/auth/family-login — returns the family id on success. */
export const familyLogin = (name: string, password: string) =>
  apiClient
    .post<FamilyLoginResponse>('/auth/family-login', { name, password })
    .then(r => r.data)

/** POST /api/auth/admin-login — returns the admin key on success. */
export const adminLogin = (name: string, password: string) =>
  apiClient
    .post<AdminLoginResponse>('/auth/admin-login', { name, password })
    .then(r => r.data)

/**
 * POST /api/auth/admin-set-password — set the admin password for a family
 * that does not yet have one. Caller must already be family-authed for the
 * same family (the apiClient sends X-Family-Id automatically). Returns the
 * same shape as a successful admin-login.
 */
export const adminSetPassword = (name: string, password: string) =>
  apiClient
    .post<AdminLoginResponse>('/auth/admin-set-password', { name, password })
    .then(r => r.data)
