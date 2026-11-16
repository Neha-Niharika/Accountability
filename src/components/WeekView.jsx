// Dashboard "Week" tab: Monday–Sunday grid for each active goal, yours and your groups'.
// Tap a day (up to today, within the goal's dates) to mark it done or clear it,
// for any week: use ◀ to go back and fill in earlier weeks. Each goal shows its
// own streak and the next milestone to aim for.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { entriesInRange, useGoalEntries } from '../hooks/useGoalEntries'
import { checkIn, getGroupErrorMessage, memberName, undoCheckIn } from '../services/groupService'
import { getFirestoreErrorMessage } from '../services/goalService'
import { markGoalDone, undoGoalDone } from '../services/progressService'
import { FREQUENCY_LABELS } from '../utils/constants'
import { addDays, dateKeysBetween, parseDateKey, startOfWeek, toDateKey } from '../utils/dates'
import { completionPercent } from '../utils/progress'
import { goalStreak, isGoalInRange, nextMilestone, periodStats } from '../utils/stats'
import { CategoryIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, FlameIcon, InfoIcon } from './Icons'
import LoadError from './LoadError'
import PeriodHero from './PeriodHero'

const dayMonthFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' })
const longDayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'short' })

// What a day cell shows for one goal.
function dayState(goal, dateKey, doneDates, todayKey) {
  if (doneDates.has(dateKey)) return 'done'
  if (dateKey > todayKey || !isGoalInRange(goal, dateKey, dateKey)) return 'off'
  if (goal.frequency === 'weekly') return 'off' // weekly goals have no "missed" days
  return dateKey === todayKey ? 'open' : 'missed'
}

const STATE_LABELS = { done: 'done', missed: 'missed', open: 'not done yet', off: 'not due' }

// Streaks run back to each goal's start, so load every date once. Moving
// between weeks then needs no reload.
const FIRST_KEY = '0000-01-01'
const LAST_KEY = '9999-12-31'

function count(n, unit) {
  return `${n} ${unit}${n === 1 ? '' : 's'}`
}

// The line under a goal: its streak and what to do next to grow it.
function streakText(goal, streak, todayKey) {
  const { current, best, unit, doneNow } = streak
  const now = unit === 'day' ? 'today' : 'this week'
  const bestPart = best > current ? ` · best ${count(best, unit)}` : ''

  if (goal.endDate && goal.endDate < todayKey) return best > 0 ? `Best streak: ${count(best, unit)}` : 'No streak'
  if (current === 0) return `No streak yet · do it ${now} to start one${bestPart}`
  if (!doneNow) return `${current}-${unit} streak · do it ${now} to make it ${current + 1}${bestPart}`
  const target = nextMilestone(current, unit)
  return `${current}-${unit} streak · ${count(target - current, unit)} more to reach ${target}${bestPart}`
}

function WeekView({ uid, goals, today }) {
  const { user } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0) // 0 = this week, -1 = last week…
  const [busyCellId, setBusyCellId] = useState(null)
  const [actionError, setActionError] = useState('')
  const todayKey = toDateKey(today)
  const monday = addDays(startOfWeek(today), weekOffset * 7)
  const fromKey = toDateKey(monday)
  const toKey = toDateKey(addDays(monday, 6))
  const days = dateKeysBetween(fromKey, toKey)

  const { entries: allEntries, setEntryDone, loading, error, groupsError } = useGoalEntries(uid, goals, FIRST_KEY, LAST_KEY)
  const entries = entriesInRange(allEntries, fromKey, toKey)

  const statsByGoal = new Map(
    entries.map((entry) => [entry.key, periodStats(entry.goal, entry.doneDates, fromKey, toKey, todayKey)]),
  )
  const totalDue = [...statsByGoal.values()].reduce((sum, stats) => sum + stats.due, 0)
  const totalDone = [...statsByGoal.values()].reduce((sum, stats) => sum + stats.done, 0)
  const rangeLabel = `${dayMonthFormatter.format(monday)} – ${dayMonthFormatter.format(addDays(monday, 6))}`

  function isEditable(goal, dateKey) {
    return dateKey <= todayKey && isGoalInRange(goal, dateKey, dateKey)
  }

  // Mark or clear one day: a personal goal's progress, or your own group check-in.
  async function handleToggleDay(entry, dateKey, done) {
    const { goal, group } = entry
    setActionError('')
    setBusyCellId(`${entry.key}_${dateKey}`)
    try {
      if (group) {
        if (done) await checkIn(group.id, goal.id, dateKey, { id: uid, name: memberName(user) }, '')
        else await undoCheckIn(group.id, goal.id, dateKey, uid)
      } else if (done) {
        await markGoalDone(uid, goal.id, dateKey)
      } else {
        await undoGoalDone(uid, goal.id, dateKey)
      }
      setEntryDone(entry, dateKey, done)
    } catch (firestoreError) {
      setActionError(group ? getGroupErrorMessage(firestoreError) : getFirestoreErrorMessage(firestoreError))
    } finally {
      setBusyCellId(null)
    }
  }

  return (
    <div className="dashboard-grid">
      <div className="period-nav">
        <button
          type="button"
          className="period-nav-button"
          onClick={() => setWeekOffset(weekOffset - 1)}
          aria-label="Previous week"
        >
          <ChevronLeftIcon />
        </button>
        <div className="period-nav-title">
          <p className="label">{weekOffset === 0 ? 'This week' : 'Week'}</p>
          <p className="period-nav-range">{rangeLabel}</p>
        </div>
        <button
          type="button"
          className="period-nav-button"
          onClick={() => setWeekOffset(weekOffset + 1)}
          disabled={weekOffset === 0}
          aria-label="Next week"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {loading ? (
        <p className="page-loading">Loading this week…</p>
      ) : error ? (
        <LoadError message={error} />
      ) : (
        <>
          {groupsError && (
            <p className="status status-error page-status">Couldn’t load your group goals. {groupsError}</p>
          )}
          <PeriodHero
            label={weekOffset === 0 ? 'This week' : 'Week'}
            title={rangeLabel}
            done={totalDone}
            due={totalDue}
            goalCount={entries.length}
            percent={completionPercent(totalDone, totalDue)}
          />

          <div className="dashboard-feed">
            <p className="info-box week-fill-hint">
              <InfoIcon size={20} />
              <span>Tap a day to mark it done or clear it. Use ◀ to go back to earlier weeks.</span>
            </p>
            {actionError && <p className="status status-error page-status">{actionError}</p>}

            <h2 className="section-title">Goals this week</h2>
            {entries.length === 0 ? (
              <p className="muted">No active goals in this week.</p>
            ) : (
              <ul className="feed-list">
                {entries.map((entry) => {
                  const { key, goal, doneDates, to, label } = entry
                  const stats = statsByGoal.get(key)
                  const streak = goalStreak(goal, doneDates, todayKey)
                  return (
                    <li key={key} className="feed-item period-item">
                      <span className="icon-box" aria-hidden="true">
                        <CategoryIcon category={goal.category} />
                      </span>
                      <div className="feed-item-text">
                        <Link to={to} className="feed-item-title">
                          {goal.title}
                        </Link>
                        <span className="feed-item-meta">
                          {label && `${label} · `}
                          {FREQUENCY_LABELS[goal.frequency]} · {stats.done}/{stats.due} ·{' '}
                          {completionPercent(stats.done, stats.due)}%
                        </span>
                        <span className={`goal-streak${streak.current > 0 ? ' goal-streak-active' : ''}`}>
                          <FlameIcon size={14} />
                          {streakText(goal, streak, todayKey)}
                        </span>
                        <ol className="week-row" aria-label={`${goal.title}, this week`}>
                          {days.map((dateKey) => {
                            const state = dayState(goal, dateKey, doneDates, todayKey)
                            const date = parseDateKey(dateKey)
                            const weekday = weekdayFormatter.format(date)

                            if (isEditable(goal, dateKey)) {
                              const done = state === 'done'
                              const day = longDayFormatter.format(date)
                              const action = `${done ? 'Clear' : 'Mark'} ${goal.title} ${done ? 'for' : 'done for'} ${day}`
                              return (
                                <li key={dateKey}>
                                  <button
                                    type="button"
                                    className={`day-cell day-cell-${state} day-cell-button`}
                                    onClick={() => handleToggleDay(entry, dateKey, !done)}
                                    disabled={busyCellId === `${key}_${dateKey}`}
                                    aria-pressed={done}
                                    aria-label={action}
                                    title={action}
                                  >
                                    {done ? <CheckIcon size={14} /> : weekday}
                                  </button>
                                </li>
                              )
                            }

                            return (
                              <li
                                key={dateKey}
                                className={`day-cell day-cell-${state}`}
                                title={`${longDayFormatter.format(date)}: ${STATE_LABELS[state]}`}
                              >
                                {state === 'done' ? <CheckIcon size={14} /> : weekday}
                                <span className="visually-hidden">
                                  {`${longDayFormatter.format(date)}: ${STATE_LABELS[state]}`}
                                </span>
                              </li>
                            )
                          })}
                        </ol>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default WeekView
