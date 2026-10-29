import { useEffect, useState } from 'react'
import { getGroupErrorMessage, getMyGroupGoals } from '../services/groupService'

// Loads the goals of every group the user is in, with their own check-in
// dates since `fromDateKey`. `setItems` lets the page update its copy after
// a check-in, without reloading.
// Usage: const { items, setItems, loading, error } = useMyGroupGoals(user.uid, weekStartKey)
export function useMyGroupGoals(uid, fromDateKey) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const result = await getMyGroupGoals(uid, fromDateKey)
        if (!ignore) setItems(result)
      } catch (firestoreError) {
        if (!ignore) setError(getGroupErrorMessage(firestoreError))
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [uid, fromDateKey])

  return { items, setItems, loading, error }
}
