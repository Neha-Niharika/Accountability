// Wraps pages that need a signed-in user. Signed-out visitors go to /signin.
// AuthProvider only renders children after Firebase has restored the session,
// so `user` is already final here and there is no loading state to handle.
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    // Remember where they were going, so SignIn can send them back there.
    return <Navigate to="/signin" replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute
