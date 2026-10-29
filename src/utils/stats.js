// Week and month statistics. Pure functions (no React, no Firestore), so they
// are easy to unit test: see tests/stats.test.js.
//
// The '.js' extensions let Node's test runner import this file directly;
// Vite is happy either way.
import { addDays, dateKeysBetween, parseDateKey, startOfWeek, toDateKey } from './dates.js'

function maxKey(a, b) {
  return a > b ? a : b
}

function minKey(a, b) {
  return a < b ? a : b
}

// Does the goal's start–end range overlap the period at all?
export function isGoalInRange(goal, fromKey, toKey) {
  return goal.startDate <= toKey && (!goal.endDate || goal.endDate >= fromKey)
}

// The part of the period the goal can be judged on: inside its own dates and
// not in the future. Null when there is no such day.
function trackableRange(goal, fromKey, toKey, todayKey) {
  const start = maxKey(fromKey, goal.startDate)
  let end = minKey(toKey, todayKey)
  if (goal.endDate) end = minKey(end, goal.endDate)
  return start <= end ? { start, end } : null
}

// How many times the goal was due in the period, and how many of those were done.
// Daily goals: one per day. Weekly goals: one per Monday–Sunday week, done if any
// day of that week has a record (so pass `doneDates` covering whole weeks).
export function periodStats(goal, doneDates, fromKey, toKey, todayKey) {
  const range = trackableRange(goal, fromKey, toKey, todayKey)
  if (!range) return { due: 0, done: 0 }

  if (goal.frequency === 'weekly') {
    let due = 0
    let done = 0
    for (let monday = startOfWeek(parseDateKey(range.start)); toDateKey(monday) <= range.end; monday = addDays(monday, 7)) {
      const weekStart = toDateKey(monday)
      const weekEnd = toDateKey(addDays(monday, 6))
      due += 1
      if ([...doneDates].some((date) => date >= weekStart && date <= weekEnd)) done += 1
    }
    return { due, done }
  }

  const days = dateKeysBetween(range.start, range.end)
  return { due: days.length, done: days.filter((date) => doneDates.has(date)).length }
}

// For the month heatmap: of the daily goals due on this date, how many were done.
export function dayCompletion(goals, doneDatesByGoal, dateKey) {
  const dueGoals = goals.filter(
    (goal) => goal.frequency === 'daily' && isGoalInRange(goal, dateKey, dateKey),
  )
  const done = dueGoals.filter((goal) => doneDatesByGoal.get(goal.id)?.has(dateKey)).length
  return { due: dueGoals.length, done }
}

// Heatmap shade for one day: 0 = none done … 3 = all done. Needs due > 0.
export function shadeLevel({ due, done }) {
  if (done === 0) return 0
  if (done === due) return 3
  return done / due < 0.5 ? 1 : 2
}

// Everything due from each goal's own start date up to today, and how much of
// it was done. Used for a group member's overall score.
export function sinceStartStats(goals, doneDatesByGoal, todayKey) {
  let due = 0
  let done = 0
  for (const goal of goals) {
    const stats = periodStats(goal, doneDatesByGoal.get(goal.id) ?? new Set(), goal.startDate, todayKey, todayKey)
    due += stats.due
    done += stats.done
  }
  return { due, done }
}
