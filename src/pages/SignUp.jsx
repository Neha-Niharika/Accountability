import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import FormField from '../components/FormField'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage, signUp } from '../services/authService'
import { MAX_NAME_LENGTH, validateSignUp } from '../utils/validation'

const initialForm = { name: '', email: '', password: '', confirmPassword: '' }

function SignUp() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Where to go after sign-up: the page saved by ProtectedRoute (e.g. an invite link), or the dashboard.
  const from = location.state?.from
  const redirectTo = from ? `${from.pathname}${from.search ?? ''}` : '/'

  // Controlled form: React state is the single source of truth for every input.
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Already signed in? Skip this page. (Not while submitting, so the
  // form can finish saving the profile, and not when there is an error to show.)
  if (user && !submitting && !serverError) {
    return <Navigate to={redirectTo} replace />
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')

    const validationErrors = validateSignUp(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      await signUp(form)
      refreshUser()
      navigate(redirectTo, { replace: true })
    } catch (error) {
      // The account may exist even if a later step failed, so refresh the user too.
      refreshUser()
      setServerError(getAuthErrorMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="card auth-card">
        <h1>Create your account</h1>
        <p className="muted">Start tracking your goals today.</p>

        {serverError && <p className="status status-error">{serverError}</p>}
        {serverError && user && (
          <p className="auth-switch">
            <Link to={redirectTo}>Continue</Link>
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <FormField
            label="Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            autoComplete="name"
            maxLength={MAX_NAME_LENGTH}
          />
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
            autoComplete="new-password"
          />
          <FormField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/signin" state={location.state}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}

export default SignUp
