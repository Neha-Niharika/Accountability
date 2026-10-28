import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import FormField from '../components/FormField'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage, signIn } from '../services/authService'
import { validateSignIn } from '../utils/validation'

function SignIn() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // ProtectedRoute stores the page the user tried to open; default to the dashboard.
  const redirectTo = location.state?.from?.pathname ?? '/'

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')

    const validationErrors = validateSignIn(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      await signIn(form)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setServerError(getAuthErrorMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="card auth-card">
        <h1>Welcome back</h1>
        <p className="muted">Sign in to see your goals.</p>

        {/* Sent here by ProtectedRoute: signed out, or the session expired. */}
        {location.state?.from && !serverError && (
          <p className="status status-info">Please sign in to continue.</p>
        )}
        {serverError && <p className="status status-error">{serverError}</p>}

        <form onSubmit={handleSubmit} noValidate>
          <FormField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            autoComplete="email"
          />
          <FormField
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            autoComplete="current-password"
          />

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </main>
  )
}

export default SignIn
