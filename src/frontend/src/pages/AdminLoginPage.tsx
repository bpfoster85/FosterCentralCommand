import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { adminLogin, adminSetPassword } from '../api/auth'
import {
  setAdminKey,
  setFamilySession,
  getAdminKey,
  getFamilyId,
  getFamilyName,
} from '../api/apiClient'
import './LoginPage.scss'

interface LocationState {
  from?: { pathname: string }
}

type Mode = 'login' | 'setup'

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<Mode>('login')
  // Pre-fill from the family session (if present) so a family-authed user
  // can switch into admin mode without re-typing the family name.
  const [name, setName] = useState(() => getFamilyName() ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (getAdminKey()) {
      navigate('/admin', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  const finishAndRedirect = (result: { adminKey: string; familyId: string; name: string }) => {
    setFamilySession(result.familyId, result.name)
    setAdminKey(result.adminKey)
    const redirectTo =
      (location.state as LocationState | null)?.from?.pathname ?? '/admin'
    navigate(redirectTo, { replace: true })
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !password) {
      setError('Please enter both family name and admin password.')
      return
    }

    setSubmitting(true)
    try {
      const result = await adminLogin(name.trim(), password)
      finishAndRedirect(result)
    } catch (err: unknown) {
      const e = err as {
        response?: {
          status?: number
          data?: { error?: string; needsSetup?: boolean }
        }
      }
      const status = e.response?.status
      if (status === 409 && e.response?.data?.needsSetup) {
        // No admin password set yet — switch to setup mode.
        setMode('setup')
        setPassword('')
        setError(null)
      } else if (status === 401) {
        setError(e.response?.data?.error ?? 'Invalid family name or admin password.')
      } else {
        setError('Could not sign in. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !password) {
      setError('Please enter both family name and a new admin password.')
      return
    }
    if (password.length < 4) {
      setError('Admin password must be at least 4 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!getFamilyId()) {
      setError('You must sign in to your family first before setting an admin password.')
      return
    }

    setSubmitting(true)
    try {
      const result = await adminSetPassword(name.trim(), password)
      finishAndRedirect(result)
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: string } } }
      const status = e.response?.status
      if (status === 401) {
        setError(
          e.response?.data?.error ??
            'You must be signed in to this family to set its admin password.'
        )
      } else if (status === 409) {
        setError(
          e.response?.data?.error ??
            'This family already has an admin password. Sign in instead.'
        )
        setMode('login')
        setConfirmPassword('')
      } else {
        setError('Could not set admin password. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <form
        className="login-card"
        onSubmit={mode === 'login' ? handleLoginSubmit : handleSetupSubmit}
        noValidate
      >
        <div className="login-card__header">
          <h1 className="login-card__title">
            {mode === 'login' ? 'Admin Sign-in' : 'Set Admin Password'}
          </h1>
          <div className="login-card__subtitle">
            {mode === 'login'
              ? 'Manage families and settings'
              : 'No admin password is set for this family yet — pick one now.'}
          </div>
        </div>

        <div className="login-card__field">
          <label className="login-card__label" htmlFor="admin-family-name">Family name</label>
          <input
            id="admin-family-name"
            ref={nameInputRef}
            className="login-card__input"
            type="text"
            autoComplete="username"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="login-card__field">
          <label className="login-card__label" htmlFor="admin-password">
            {mode === 'login' ? 'Admin password' : 'New admin password'}
          </label>
          <input
            id="admin-password"
            className="login-card__input"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={submitting}
          />
        </div>

        {mode === 'setup' && (
          <div className="login-card__field">
            <label className="login-card__label" htmlFor="admin-password-confirm">Confirm password</label>
            <input
              id="admin-password-confirm"
              className="login-card__input"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              disabled={submitting}
            />
          </div>
        )}

        {error && <div className="login-card__error" role="alert">{error}</div>}

        <button type="submit" className="login-card__submit" disabled={submitting}>
          {submitting
            ? mode === 'login' ? 'Signing in…' : 'Saving…'
            : mode === 'login' ? 'Enter' : 'Save and continue'}
        </button>

        <div className="login-card__footer">
          {mode === 'setup' && (
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setConfirmPassword('') }}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, marginRight: '0.75rem' }}
            >
              Back to sign in
            </button>
          )}
          <Link to="/login">Family sign in</Link>
        </div>
      </form>
    </div>
  )
}

export default AdminLoginPage
