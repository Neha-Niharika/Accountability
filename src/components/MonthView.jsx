// Dashboard "Month" tab: a calendar heatmap plus each goal's monthly score.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProgressRange } from '../hooks/useProgressRange'
import { FREQUENCY_LABELS } from '../utils/constants'
import { addDays, dateKeysBetween, endOfMonth, parseDateKey, startOfWeek, toDateKey } from '../utils/dates'
import { completionPercent } from '../utils/progress'
import { dayCompletion, isGoalInRange, periodStats } from '../utils/stats'
import { CategoryIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons'
import LoadError from './LoadError'
import PeriodHero from './PeriodHero'

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' })
const longDayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

// Monday-first weekday letters, from any known Monday.
const WEEKDAY_LETTERS = dateKeysBetween('2024-01-01', '2024-01-07').map((key) =>
  weekdayFormatter.format(parseDateKey(key)),
)

// Heatmap shade: 0 = none done … 3 = all done.
function shadeLevel({ due, done }) {
  if (done === 0) return 0
  if (done === due) return 3
  return done / due < 0.5 ? 1 : 2
}

function MonthView({ uid, goals, today }) {
  const [monthOffset, setMonthOffset] = useState(0) // 0 = this month, -1 = last month…
  const todayKey = toDateKey(today)
  const firstDay = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const lastDay = endOfMonth(firstDay)
  const fromKey = toDateKey(firstDay)
  const toKey = toDateKey(lastDay)

  // Load whole Monday–Sunday weeks, so a weekly goal done in a week that
  // crosses into the next/previous month still counts.
  const loadFromKey = toDateKey(startOfWeek(firstDay))
  const loadToKey = toDateKey(addDays(startOfWeek(lastDay), 6))

  const monthGoals = goals.filter((goal) => goal.status === 'active' && isGoalInRange(goal, fromKey, toKey))
  const { doneDatesByGoal, loading, error } = useProgressRange(
    uid,
    monthGoals.map((goal) => goal.id),
    loadFromKey,
    loadToKey,
  )

  const statsByGoal = new Map(
    monthGoals.map((goal) => [
      goal.id,
      periodStats(goal, doneDatesByGoal.get(goal.id) ?? new Set(), fromKey, toKey, todayKey),
    ]),
  )
  const totalDue = [...statsByGoal.values()].reduce((sum, stats) => sum + stats.due, 0)
  const totalDone = [...statsByGoal.values()].reduce((sum, stats) => sum + stats.done, 0)
  const monthLabel = monthFormatter.format(firstDay)

  // Empty cells before the 1st so the grid starts on Monday.
  const leadingBlanks = (firstDay.getDay() + 6) % 7

  return (
    <div className="dashboard-grid">
      <div className="period-nav">
        <button
          type="button"
          className="period-nav-button"
          onClick={() => setMonthOffset(monthOffset - 1)}
          aria-label="Previous month"
        >
          <ChevronLeftIcon />
        </button>
        <div className="period-nav-title">
          <p className="label">{monthOffset === 0 ? 'This month' : 'Month'}</p>
          <p className="period-nav-range">{monthLabel}</p>
        </div>
        <button
          type="button"
          className="period-nav-button"
          onClick={() => setMonthOffset(monthOffset + 1)}
          disabled={monthOffset === 0}
          aria-label="Next month"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {loading ? (
        <p className="page-loading">Loading this month…</p>
      ) : error ? (
        <LoadError message={error} />
      ) : (
        <>
          <PeriodHero
            label={monthOffset === 0 ? 'This month' : 'Month'}
            title={monthLabel}
            done={totalDone}
            due={totalDue}
            goalCount={monthGoals.length}
            percent={completionPercent(totalDone, totalDue)}
          />

          <div className="dashboard-feed">
            <section className="card heatmap-card" aria-label={`Daily goals in ${monthLabel}`}>
              <h2>Daily goals</h2>
              <ol className="heatmap">
                {WEEKDAY_LETTERS.map((letter, index) => (
                  <li key={`weekday-${index}`} className="heatmap-weekday" aria-hidden="true">
                    {letter}
                  </li>
                ))}
                {Array.from({ length: leadingBlanks }, (_, index) => (
                  <li key={`blank-${index}`} aria-hidden="true" />
                ))}
                {dateKeysBetween(fromKey, toKey).map((dateKey) => {
                  const date = parseDateKey(dateKey)
                  const completion = dayCompletion(monthGoals, doneDatesByGoal, dateKey)
                  const future = dateKey > todayKey
                  const level = future || completion.due === 0 ? 'empty' : shadeLevel(completion)
                  const description = future
                    ? 'upcoming'
                    : completion.due === 0
                      ? 'no daily goals'
                      : `${completion.done} of ${completion.due} done`
                  return (
                    <li
                      key={dateKey}
                      className={`heatmap-day heatmap-level-${level}${dateKey === todayKey ? ' heatmap-today' : ''}`}
                      title={`${longDayFormatter.format(date)}: ${description}`}
                    >
                      <span aria-hidden="true">{date.getDate()}</span>
                      <span className="visually-hidden">{`${longDayFormatter.format(date)}: ${description}`}</span>
                    </li>
                  )
                })}
              </ol>
              <div className="heatmap-legend" aria-hidden="true">
                <span>Less</span>
                <span className="heatmap-day heatmap-level-0" />
                <span className="heatmap-day heatmap-level-1" />
                <span className="heatmap-day heatmap-level-2" />
                <span className="heatmap-day heatmap-level-3" />
                <span>All done</span>
              </div>
            </section>

            <h2 className="section-title">Goals this month</h2>
            {monthGoals.length === 0 ? (
              <p className="muted">No active goals in this month.</p>
            ) : (
              <ul className="feed-list">
                {monthGoals.map((goal) => {
                  const stats = statsByGoal.get(goal.id)
                  const percent = completionPercent(stats.done, stats.due)
                  return (
                    <li key={goal.id} className="feed-item period-item">
                      <span className="icon-box" aria-hidden="true">
                        <CategoryIcon category={goal.category} />
                      </span>
                      <div className="feed-item-text">
                        <Link to={`/goals/${goal.id}`} className="feed-item-title">
                          {goal.title}
                        </Link>
                        <span className="feed-item-meta">
                          {FREQUENCY_LABELS[goal.frequency]} · {stats.done}/{stats.due}{' '}
                          {goal.frequency === 'weekly' ? 'weeks' : 'days'} · {percent}%
                        </span>
                        <div
                          className="progress-bar progress-bar-small"
                          role="progressbar"
                          aria-label={`${goal.title} this month`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={percent}
                        >
                          <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
                        </div>
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

export default MonthView
