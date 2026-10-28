import { useEffect, useState } from 'react'
import { getFirestoreErrorMessage } from '../services/goalService'
import { getProgressDates } from '../services/progressService'

// Loads one goal's full progress history (date keys, newest first).
// Usage: const { dates, setDates, loading, error } = useGoalProgress(user.uid, goalId)
export function useGoalProgress(uid, goalId) {
  const [dates, setDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const result = await getProgressDates(uid, goalId)
        if (!ignore) setDates(result)
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
  }, [uid, goalId])

  return { dates, setDates, loading, error }
}
