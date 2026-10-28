import { useEffect, useState } from 'react'
import { getGroupErrorMessage, getMyGroups } from '../services/groupService'

// Loads the groups the user belongs to.
// Usage: const { groups, loading, error } = useMyGroups(user.uid)
export function useMyGroups(uid) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const result = await getMyGroups(uid)
        if (!ignore) setGroups(result)
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
  }, [uid])

  return { groups, loading, error }
}
