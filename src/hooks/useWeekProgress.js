import { useEffect, useState } from 'react'
import { getFirestoreErrorMessage } from '../services/goalService'
import { getProgressDatesSince } from '../services/progressService'

// Loads this week's progress for several goals at once.
// Returns a Map of goalId → Set of done date keys.
// Usage: const { doneDatesByGoal, updateDoneDates, loading, error } =
//          useWeekProgress(user.uid, goalIds, weekStartKey)
export function useWeekProgress(uid, goalIds, weekStartKey) {
  // Arrays are new objects on every render, so we depend on a string instead.
  const idsKey = goalIds.join(',')
  const requestKey = `${uid}|${idsKey}|${weekStartKey}`

  // `key` records which request the data belongs to. While it doesn't match
  // the current request, we are loading.
  const [result, setResult] = useState({ key: null, doneDatesByGoal: new Map(), error: '' })

  useEffect(() => {
    let ignore = false

    async function load() {
      const ids = idsKey ? idsKey.split(',') : []
      try {
        // Promise.all runs the queries in parallel and waits for all of them.
        const datesPerGoal = await Promise.all(
          ids.map((goalId) => getProgressDatesSince(uid, goalId, weekStartKey)),
        )
        const doneDatesByGoal = new Map(ids.map((goalId, index) => [goalId, new Set(datesPerGoal[index])]))
        if (!ignore) setResult({ key: requestKey, doneDatesByGoal, error: '' })
      } catch (firestoreError) {
        if (!ignore) {
          setResult({ key: requestKey, doneDatesByGoal: new Map(), error: getFirestoreErrorMessage(firestoreError) })
        }
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [uid, idsKey, weekStartKey, requestKey])

  // Update one goal's dates after a mark/undo, without reloading everything.
  function updateDoneDates(goalId, update) {
    setResult((previous) => {
      const doneDatesByGoal = new Map(previous.doneDatesByGoal)
      doneDatesByGoal.set(goalId, update(doneDatesByGoal.get(goalId) ?? new Set()))
      return { ...previous, doneDatesByGoal }
    })
  }

  return {
    doneDatesByGoal: result.doneDatesByGoal,
    updateDoneDates,
    loading: result.key !== requestKey,
    error: result.error,
  }
}
