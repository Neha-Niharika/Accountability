import { useMyGroupGoals } from './useMyGroupGoals'
import { useProgressRange } from './useProgressRange'
import { isGoalInRange } from '../utils/stats'

// Group goals are filed under this category, as on the Today tab.
const GROUPS = 'Groups'

// The goals for the Week and Month views: your active goals, then your groups'
// goals, each with your own done dates from `loadFromKey` to `loadToKey`.
// Each entry is { key, goal, doneDates, to, label, fromGroup, group }; `key` is unique even
// when a personal goal and a group goal share an id. Pick the ones in a period with
// `entriesInRange`. After saving a mark/undo, call `setEntryDone(entry, dateKey, done)`
// to update the local copy without reloading.
// Usage: const { entries, setEntryDone, loading, error, groupsError } =
//          useGoalEntries(uid, goals, loadFromKey, loadToKey)
export function useGoalEntries(uid, goals, loadFromKey, loadToKey) {
  // Completed goals are finished, so they don't count against any period.
  const personalGoals = goals.filter((goal) => goal.status === 'active')
  const { doneDatesByGoal, updateDoneDates, loading: progressLoading, error } = useProgressRange(
    uid,
    personalGoals.map((goal) => goal.id),
    loadFromKey,
    loadToKey,
  )
  const {
    items: groupItems,
    setItems: setGroupItems,
    loading: groupsLoading,
    error: groupsError,
  } = useMyGroupGoals(uid, loadFromKey)

  const entries = [
    ...personalGoals.map((goal) => ({
      key: goal.id,
      goal,
      doneDates: doneDatesByGoal.get(goal.id) ?? new Set(),
      to: `/goals/${goal.id}`,
      label: null,
      fromGroup: false,
      group: null,
    })),
    ...groupItems.map((item) => ({
      key: `group-${item.group.id}-${item.goal.id}`,
      goal: { ...item.goal, category: GROUPS },
      doneDates: item.doneDates,
      to: `/groups/${item.group.id}`,
      label: item.group.name,
      fromGroup: true,
      group: item.group,
    })),
  ]

  function withDate(dates, dateKey, done) {
    const next = new Set(dates)
    if (done) next.add(dateKey)
    else next.delete(dateKey)
    return next
  }

  function setEntryDone(entry, dateKey, done) {
    if (entry.group) {
      setGroupItems((previous) =>
        previous.map((item) =>
          item.group.id === entry.group.id && item.goal.id === entry.goal.id
            ? { ...item, doneDates: withDate(item.doneDates, dateKey, done) }
            : item,
        ),
      )
    } else {
      updateDoneDates(entry.goal.id, (dates) => withDate(dates, dateKey, done))
    }
  }

  return { entries, setEntryDone, loading: progressLoading || groupsLoading, error, groupsError }
}

// The entries whose goal runs at some point between `fromKey` and `toKey`.
export function entriesInRange(entries, fromKey, toKey) {
  return entries.filter((entry) => isGoalInRange(entry.goal, fromKey, toKey))
}
