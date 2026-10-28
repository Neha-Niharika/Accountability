import { useEffect, useState } from 'react'
import { getGroupData, getGroupErrorMessage } from '../services/groupService'

// Loads a group page: the group, its members, goals, and check-ins since `fromDateKey`.
// `data` is null while loading, and also when the group doesn't exist or you
// aren't a member (then `notFound` is true). `setData` lets the page update its
// copy after a save, without reloading.
// Usage: const { data, setData, loading, notFound, error } = useGroup(groupId, weekStartKey)
export function useGroup(groupId, fromDateKey) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const result = await getGroupData(groupId, fromDateKey)
        if (ignore) return
        if (result) setData(result)
        else setNotFound(true)
      } catch (firestoreError) {
        if (ignore) return
        // The rules hide groups from non-members, so "permission denied" means
        // "not your group" here.
        if (firestoreError.code === 'permission-denied') setNotFound(true)
        else setError(getGroupErrorMessage(firestoreError))
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [groupId, fromDateKey])

  return { data, setData, loading, notFound, error }
}
