import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getFamilyId, getAdminKey } from '../../api/apiClient'

interface GuardProps {
  children: React.ReactNode
}

/**
 * Redirects to /login if no family session is present. Listens for the
 * fcc:family-unauthorized event so a 401 anywhere in the app boots the user
 * back to the login screen.
 */
export const RequireFamily: React.FC<GuardProps> = ({ children }) => {
  const location = useLocation()
  const [authed, setAuthed] = useState(() => Boolean(getFamilyId()))

  useEffect(() => {
    const onLogout = () => setAuthed(false)
    window.addEventListener('fcc:family-unauthorized', onLogout)
    return () => window.removeEventListener('fcc:family-unauthorized', onLogout)
  }, [])

  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <>{children}</>
}

/**
 * Gate for /admin: requires both a family session AND a stored admin key.
 * Without the admin key, sends the user to /admin-login.
 */
export const RequireAdmin: React.FC<GuardProps> = ({ children }) => {
  const location = useLocation()
  const [familyAuthed, setFamilyAuthed] = useState(() => Boolean(getFamilyId()))
  const [adminAuthed, setAdminAuthed] = useState(() => Boolean(getAdminKey()))

  useEffect(() => {
    const onFamilyOut = () => setFamilyAuthed(false)
    const onAdminOut = () => setAdminAuthed(false)
    window.addEventListener('fcc:family-unauthorized', onFamilyOut)
    window.addEventListener('fcc:admin-unauthorized', onAdminOut)
    return () => {
      window.removeEventListener('fcc:family-unauthorized', onFamilyOut)
      window.removeEventListener('fcc:admin-unauthorized', onAdminOut)
    }
  }, [])

  if (!familyAuthed) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (!adminAuthed) {
    return <Navigate to="/admin-login" replace state={{ from: location }} />
  }
  return <>{children}</>
}
