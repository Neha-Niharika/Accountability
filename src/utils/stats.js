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

// Streaks of good days. A day is good when at least `percentNeeded` of the
// daily goals due that day are done (100 for personal goals, 80 for groups).
// A day with no daily goals due is skipped: it neither extends nor breaks a
// streak. Today is still in progress, so an unfinished today is skipped too.
//
// With `rewardEvery` set, also returns the events rewards and punishments
// hang on: a reward every `rewardEvery` streak days, and a punishment when a
// missed day breaks a streak. Each event is { kind, date }.
//
// Returns { current, best, streakDays, events }: `streakDays` holds the dates
// that belong to a run of two or more good days, for marking on the heatmap.
export function streakStats(goals, doneDatesByGoal, todayKey, { percentNeeded = 100, rewardEvery = 0 } = {}) {
  const dailyGoals = goals.filter((goal) => goal.frequency === 'daily')
  const events = []
  if (dailyGoals.length === 0) return { current: 0, best: 0, streakDays: new Set(), events }

  const firstKey = dailyGoals.map((goal) => goal.startDate).reduce(minKey)
  let run = []
  let best = 0
  const streakDays = new Set()

  function endRun() {
    best = Math.max(best, run.length)
    if (run.length >= 2) run.forEach((dateKey) => streakDays.add(dateKey))
    run = []
  }

  for (const dateKey of dateKeysBetween(firstKey, todayKey)) {
    const { due, done } = dayCompletion(dailyGoals, doneDatesByGoal, dateKey)
    if (due === 0) continue
    // Whole numbers only: 4 of 5 is exactly 80%, with no rounding surprises.
    if (done * 100 >= due * percentNeeded) {
      run.push(dateKey)
      if (rewardEvery > 0 && run.length % rewardEvery === 0) events.push({ kind: 'reward', date: dateKey })
    } else if (dateKey !== todayKey) {
      if (run.length > 0) events.push({ kind: 'punishment', date: dateKey })
      endRun()
    }
  }
  const current = run.length
  endRun()

  return { current, best, streakDays, events }
}

// The streak events a reward and punishment apply to, newest first: those on
// or after the day they were set. A reward or punishment left empty has none.
export function stakeEvents(stakes, events) {
  if (!stakes) return []
  return events.filter((event) => event.date >= stakes.since && stakes[event.kind]).reverse()
}
