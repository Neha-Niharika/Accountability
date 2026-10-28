import { useEffect, useState } from 'react'
import { getFirestoreErrorMessage, getGoals } from '../services/goalService'

// Loads the user's goals once when the component mounts.
// Usage: const { goals, loading, error } = useGoals(user.uid)
export function useGoals(uid) {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // If the component unmounts before the request finishes, ignore the result.
    let ignore = false

    async function load() {
      try {
        const result = await getGoals(uid)
        if (!ignore) setGoals(result)
      } catch (firestoreError) {
        if (!ignore) setError(getFirestoreErrorMessage(firestoreError))
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [uid])

  return { goals, loading, error }
}
