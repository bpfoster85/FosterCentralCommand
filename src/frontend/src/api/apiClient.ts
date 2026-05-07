import axios from 'axios'

/** localStorage key holding the active family id sent on every API request. */
export const FAMILY_ID_STORAGE_KEY = 'fcc_family_id'

/** localStorage key holding the active family name (display only). */
export const FAMILY_NAME_STORAGE_KEY = 'fcc_family_name'

/** localStorage key holding the admin key sent with admin-only requests. */
export const ADMIN_KEY_STORAGE_KEY = 'fcc_admin_key'

/** Custom header the API uses to identify which family a request belongs to. */
export const FAMILY_ID_HEADER = 'X-Family-Id'

/** Custom header the API uses to authorize admin-only requests. */
export const ADMIN_KEY_HEADER = 'X-Admin-Key'

export const getFamilyId = (): string | null =>
  localStorage.getItem(FAMILY_ID_STORAGE_KEY)

export const getFamilyName = (): string | null =>
  localStorage.getItem(FAMILY_NAME_STORAGE_KEY)

export const setFamilySession = (id: string, name: string): void => {
  localStorage.setItem(FAMILY_ID_STORAGE_KEY, id.trim())
  localStorage.setItem(FAMILY_NAME_STORAGE_KEY, name.trim())
}

export const clearFamilySession = (): void => {
  localStorage.removeItem(FAMILY_ID_STORAGE_KEY)
  localStorage.removeItem(FAMILY_NAME_STORAGE_KEY)
}

export const getAdminKey = (): string | null =>
  localStorage.getItem(ADMIN_KEY_STORAGE_KEY)

export const setAdminKey = (key: string): void => {
  localStorage.setItem(ADMIN_KEY_STORAGE_KEY, key.trim())
}

export const clearAdminKey = (): void => {
  localStorage.removeItem(ADMIN_KEY_STORAGE_KEY)
}

// VITE_API_URL is the API origin (e.g. https://aca-familycalendar.<env>.<region>.azurecontainerapps.io).
// In local dev it's typically unset and the Vite proxy / same-origin handles `/api`.
const apiBaseUrl = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.toString().replace(/\/$/, '')}/api`
  : '/api'

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Attach X-Family-Id (and X-Admin-Key when present) to every request.
apiClient.interceptors.request.use(config => {
  const familyId = getFamilyId()
  if (familyId) {
    config.headers.set(FAMILY_ID_HEADER, familyId)
  }
  const adminKey = getAdminKey()
  if (adminKey) {
    config.headers.set(ADMIN_KEY_HEADER, adminKey)
  }
  return config
})

// On 401 from the family gate, clear the bad id so the UI can prompt for a new one.
apiClient.interceptors.response.use(
  response => response,
  error => {
    const status = error?.response?.status
    const url: string = error?.config?.url ?? ''

    // Don't clobber session for the login endpoints themselves — a 401 there
    // just means the credentials were wrong.
    const isAuthEndpoint = url.includes('/auth/')

    if (status === 401 && !isAuthEndpoint) {
      const detail = error.response?.data?.error ?? ''
      const detailStr = typeof detail === 'string' ? detail.toLowerCase() : ''

      if (detailStr.includes('admin')) {
        clearAdminKey()
        window.dispatchEvent(new CustomEvent('fcc:admin-unauthorized', { detail }))
      } else {
        // Default: assume family-gate rejected us.
        clearFamilySession()
        window.dispatchEvent(new CustomEvent('fcc:family-unauthorized', { detail }))
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
