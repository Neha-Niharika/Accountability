import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Reads a one-time success message passed with navigate(path, { state: { message } }),
// then clears it from browser history so a refresh doesn't show it again.
// Usage: const [message, setMessage] = useFlashMessage()
export function useFlashMessage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [message, setMessage] = useState(location.state?.message ?? '')

  useEffect(() => {
    if (location.state?.message) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location, navigate])

  return [message, setMessage]
}
