import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { familyLogin } from '../api/auth'
import { setFamilySession, getFamilyId } from '../api/apiClient'
import './LoginPage.scss'

interface LocationState {
  from?: { pathname: string }
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // If a session already exists, send the user straight in.
  useEffect(() => {
    if (getFamilyId()) {
      navigate('/command-center', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !password) {
      setError('Please enter both family name and password.')
      return
    }

    setSubmitting(true)
    try {
      const result = await familyLogin(name.trim(), password)
      setFamilySession(result.familyId, result.name)

      const redirectTo =
        (location.state as LocationState | null)?.from?.pathname ?? '/command-center'
      navigate(redirectTo, { replace: true })
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: string } } }
      if (e.response?.status === 401) {
        setError(e.response.data?.error ?? 'Invalid family name or password.')
      } else {
        setError('Could not sign in. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <div className="login-card__header">
          <h1 className="login-card__title">Foster Central Command</h1>
          <div className="login-card__subtitle">Sign in to your family</div>
        </div>

        <div className="login-card__field">
          <label className="login-card__label" htmlFor="family-name">Family name</label>
          <input
            id="family-name"
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
          <label className="login-card__label" htmlFor="family-password">Password</label>
          <input
            id="family-password"
            className="login-card__input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={submitting}
          />
        </div>

        {error && <div className="login-card__error" role="alert">{error}</div>}

        <button type="submit" className="login-card__submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Enter'}
        </button>

        <div className="login-card__footer">
          <Link to="/admin-login">Admin sign in</Link>
        </div>
      </form>
    </div>
  )
}

export default LoginPage
