import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { adminLogin } from '../api/auth'
import { setAdminKey, getAdminKey } from '../api/apiClient'
import './LoginPage.scss'

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate()
  const passwordInputRef = useRef<HTMLInputElement>(null)

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (getAdminKey()) {
      navigate('/admin', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    passwordInputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!password) {
      setError('Please enter the admin password.')
      return
    }

    setSubmitting(true)
    try {
      const result = await adminLogin(password)
      setAdminKey(result.adminKey)
      navigate('/admin', { replace: true })
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: string } } }
      if (e.response?.status === 401) {
        setError(e.response.data?.error ?? 'Invalid admin password.')
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
          <h1 className="login-card__title">Admin Sign-in</h1>
          <div className="login-card__subtitle">Manage families and settings</div>
        </div>

        <div className="login-card__field">
          <label className="login-card__label" htmlFor="admin-password">Admin password</label>
          <input
            id="admin-password"
            ref={passwordInputRef}
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
          <Link to="/login">Family sign in</Link>
        </div>
      </form>
    </div>
  )
}

export default AdminLoginPage
