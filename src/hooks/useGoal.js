import { useEffect, useState } from 'react'
import { getFirestoreErrorMessage, getGoal } from '../services/goalService'

// Loads one goal by id. `goal` is null when it doesn't exist.
// `setGoal` lets a page update its copy after a save, without reloading.
// Usage: const { goal, setGoal, loading, error } = useGoal(user.uid, goalId)
export function useGoal(uid, goalId) {
  const [goal, setGoal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const result = await getGoal(uid, goalId)
        if (!ignore) setGoal(result)
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

  return { goal, setGoal, loading, error }
}
