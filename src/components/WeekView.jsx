// Dashboard "Week" tab: Monday–Sunday grid for each active goal, yours and your groups'.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { entriesInRange, useGoalEntries } from '../hooks/useGoalEntries'
import { FREQUENCY_LABELS } from '../utils/constants'
import { addDays, dateKeysBetween, parseDateKey, startOfWeek, toDateKey } from '../utils/dates'
import { completionPercent } from '../utils/progress'
import { isGoalInRange, periodStats } from '../utils/stats'
import { CategoryIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons'
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

function WeekView({ uid, goals, today }) {
  const [weekOffset, setWeekOffset] = useState(0) // 0 = this week, -1 = last week…
  const todayKey = toDateKey(today)
  const monday = addDays(startOfWeek(today), weekOffset * 7)
  const fromKey = toDateKey(monday)
  const toKey = toDateKey(addDays(monday, 6))
  const days = dateKeysBetween(fromKey, toKey)

  const { entries: allEntries, loading, error, groupsError } = useGoalEntries(uid, goals, fromKey, toKey)
  const entries = entriesInRange(allEntries, fromKey, toKey)

  const statsByGoal = new Map(
    entries.map((entry) => [entry.key, periodStats(entry.goal, entry.doneDates, fromKey, toKey, todayKey)]),
  )
  const totalDue = [...statsByGoal.values()].reduce((sum, stats) => sum + stats.due, 0)
  const totalDone = [...statsByGoal.values()].reduce((sum, stats) => sum + stats.done, 0)
  const rangeLabel = `${dayMonthFormatter.format(monday)} – ${dayMonthFormatter.format(addDays(monday, 6))}`

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
            <h2 className="section-title">Goals this week</h2>
            {entries.length === 0 ? (
              <p className="muted">No active goals in this week.</p>
            ) : (
              <ul className="feed-list">
                {entries.map(({ key, goal, doneDates, to, label }) => {
                  const stats = statsByGoal.get(key)
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
                        <ol className="week-row" aria-label={`${goal.title}, this week`}>
                          {days.map((dateKey) => {
                            const state = dayState(goal, dateKey, doneDates, todayKey)
                            const date = parseDateKey(dateKey)
                            return (
                              <li
                                key={dateKey}
                                className={`day-cell day-cell-${state}`}
                                title={`${longDayFormatter.format(date)}: ${STATE_LABELS[state]}`}
                              >
                                {state === 'done' ? <CheckIcon size={14} /> : weekdayFormatter.format(date)}
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
