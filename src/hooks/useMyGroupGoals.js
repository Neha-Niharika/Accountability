import { useEffect, useState } from 'react'
import { getGroupErrorMessage, getMyGroupGoals } from '../services/groupService'

// Loads the goals of every group the user is in, with their own check-in
// dates since `fromDateKey`. `setItems` lets the page update its copy after
// a check-in, without reloading.
// Usage: const { items, setItems, loading, error } = useMyGroupGoals(user.uid, weekStartKey)
export function useMyGroupGoals(uid, fromDateKey) {
  const requestKey = `${uid}|${fromDateKey}`

  // `key` records which request the data belongs to. While it doesn't match
  // the current request (e.g. the Week view moved to another week), we are loading.
  const [result, setResult] = useState({ key: null, items: [], error: '' })

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const items = await getMyGroupGoals(uid, fromDateKey)
        if (!ignore) setResult({ key: requestKey, items, error: '' })
      } catch (firestoreError) {
        if (!ignore) setResult({ key: requestKey, items: [], error: getGroupErrorMessage(firestoreError) })
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [uid, fromDateKey, requestKey])

  function setItems(update) {
    setResult((previous) => ({
      ...previous,
      items: typeof update === 'function' ? update(previous.items) : update,
    }))
  }

  return { items: result.items, setItems, loading: result.key !== requestKey, error: result.error }
}
