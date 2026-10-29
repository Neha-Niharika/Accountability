// Dashboard "Month" tab: a calendar heatmap plus each goal's monthly score,
// for your goals and your groups'.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { entriesInRange, useGoalEntries } from '../hooks/useGoalEntries'
import { FREQUENCY_LABELS } from '../utils/constants'
import { dateKeysBetween, endOfMonth, parseDateKey, toDateKey } from '../utils/dates'
import { completionPercent } from '../utils/progress'
import { dayCompletion, periodStats, shadeLevel, streakStats } from '../utils/stats'
import { CategoryIcon, ChevronLeftIcon, ChevronRightIcon, FlameIcon } from './Icons'
import LoadError from './LoadError'
import PeriodHero from './PeriodHero'

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' })
const longDayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

// Monday-first weekday letters, from any known Monday.
// Streaks can run back past this month, so load every date once. Moving
// between months then needs no reload.
const FIRST_KEY = '0000-01-01'
const LAST_KEY = '9999-12-31'

const WEEKDAY_LETTERS = dateKeysBetween('2024-01-01', '2024-01-07').map((key) =>
  weekdayFormatter.format(parseDateKey(key)),
)

function MonthView({ uid, goals, today }) {
  const [monthOffset, setMonthOffset] = useState(0) // 0 = this month, -1 = last month…
  const todayKey = toDateKey(today)
  const firstDay = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const lastDay = endOfMonth(firstDay)
  const fromKey = toDateKey(firstDay)
  const toKey = toDateKey(lastDay)

  const { entries: allEntries, loading, error, groupsError } = useGoalEntries(uid, goals, FIRST_KEY, LAST_KEY)
  const entries = entriesInRange(allEntries, fromKey, toKey)

  const statsByGoal = new Map(
    entries.map((entry) => [entry.key, periodStats(entry.goal, entry.doneDates, fromKey, toKey, todayKey)]),
  )
  // The heatmap and streak helpers look goals up by id, so give each entry its unique key as id.
  const heatmapGoals = allEntries.map((entry) => ({ ...entry.goal, id: entry.key }))
  const doneDatesByKey = new Map(allEntries.map((entry) => [entry.key, entry.doneDates]))
  const streak = streakStats(heatmapGoals, doneDatesByKey, todayKey)
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
          {groupsError && (
            <p className="status status-error page-status">Couldn’t load your group goals. {groupsError}</p>
          )}
          <PeriodHero
            label={monthOffset === 0 ? 'This month' : 'Month'}
            title={monthLabel}
            done={totalDone}
            due={totalDue}
            goalCount={entries.length}
            percent={completionPercent(totalDone, totalDue)}
            streak={streak}
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
                  const completion = dayCompletion(heatmapGoals, doneDatesByKey, dateKey)
                  const future = dateKey > todayKey
                  const level = future || completion.due === 0 ? 'empty' : shadeLevel(completion)
                  const onStreak = streak.streakDays.has(dateKey)
                  const description =
                    (future
                      ? 'upcoming'
                      : completion.due === 0
                        ? 'no daily goals'
                        : `${completion.done} of ${completion.due} done`) + (onStreak ? ', on a streak' : '')
                  return (
                    <li
                      key={dateKey}
                      className={`heatmap-day heatmap-level-${level}${dateKey === todayKey ? ' heatmap-today' : ''}${onStreak ? ' heatmap-streak' : ''}`}
                      title={`${longDayFormatter.format(date)}: ${description}`}
                    >
                      <span aria-hidden="true">{date.getDate()}</span>
                      {onStreak && <FlameIcon size={12} />}
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
                <span className="heatmap-legend-streak">
                  <FlameIcon size={12} /> 2+ days in a row
                </span>
              </div>
            </section>

            <h2 className="section-title">Goals this month</h2>
            {entries.length === 0 ? (
              <p className="muted">No active goals in this month.</p>
            ) : (
              <ul className="feed-list">
                {entries.map(({ key, goal, to, label }) => {
                  const stats = statsByGoal.get(key)
                  const percent = completionPercent(stats.done, stats.due)
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
