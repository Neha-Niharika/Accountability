import { useEffect, useState } from 'react'
import { getFirestoreErrorMessage } from '../services/goalService'
import { getStakes } from '../services/stakesService'

// Loads your own reward, punishment and claims. `setData` lets the page update
// its copy after a save, without reloading.
// Usage: const { data, setData, loading, error } = useStakes(user.uid)
//        data is { stakes, claims }; stakes is null when none are set.
export function useStakes(uid) {
  const [result, setResult] = useState({ key: null, data: { stakes: null, claims: [] }, error: '' })

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const data = await getStakes({ uid })
        if (!ignore) setResult({ key: uid, data, error: '' })
      } catch (firestoreError) {
        if (!ignore) {
          setResult({ key: uid, data: { stakes: null, claims: [] }, error: getFirestoreErrorMessage(firestoreError) })
        }
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [uid])

  function setData(update) {
    setResult((previous) => ({ ...previous, data: update(previous.data) }))
  }

  return { data: result.data, setData, loading: result.key !== uid, error: result.error }
}
