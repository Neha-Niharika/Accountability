// Rules for "what counts as done today". Dates are 'YYYY-MM-DD' strings,
// which compare correctly with < and >.

// An active goal is due on a date that falls between its start and end dates.
export function isGoalDueOn(goal, dateKey) {
  return (
    goal.status === 'active' &&
    goal.startDate <= dateKey &&
    (!goal.endDate || dateKey <= goal.endDate)
  )
}

// Daily goals need a record for today. Weekly goals need one on any day
// from Monday (weekStartKey) to today.
export function isDoneForPeriod(goal, doneDates, todayKey, weekStartKey) {
  if (goal.frequency === 'weekly') {
    return [...doneDates].some((date) => date >= weekStartKey && date <= todayKey)
  }
  return doneDates.has(todayKey)
}

export function completionPercent(done, total) {
  return total === 0 ? 0 : Math.round((done / total) * 100)
}
