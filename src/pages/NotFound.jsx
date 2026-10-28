// Shown for any URL that doesn't match a route. Works signed in or out.
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function NotFound() {
  const { user } = useAuth()

  return (
    <main className="auth-page">
      <div className="card auth-card empty-state">
        <h1>Page not found</h1>
        <p className="muted">The page you are looking for doesn&apos;t exist or has moved.</p>
        <Link to={user ? '/' : '/signin'} className="btn btn-primary">
          {user ? 'Back to dashboard' : 'Go to sign in'}
        </Link>
      </div>
    </main>
  )
}

export default NotFound
