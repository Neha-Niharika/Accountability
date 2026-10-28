// Rendered inside ProtectedRoute, so `user` is always set here.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import {
  CalendarIcon,
  CategoryIcon,
  CheckCircleIcon,
  ClockIcon,
  GridIcon,
  InfoIcon,
  TargetIcon,
  TrendingUpIcon,
  UserIcon,
} from '../components/Icons'
import LoadError from '../components/LoadError'
import MonthView from '../components/MonthView'
import TodayGoalItem from '../components/TodayGoalItem'
import WeekView from '../components/WeekView'
import { useAuth } from '../hooks/useAuth'
import { useGoals } from '../hooks/useGoals'
import { useToday } from '../hooks/useToday'
import { useProgressRange } from '../hooks/useProgressRange'
import { getFirestoreErrorMessage } from '../services/goalService'
import { markGoalDone, undoGoalDone } from '../services/progressService'
import { startOfWeek, toDateKey } from '../utils/dates'
import { initialsOf } from '../utils/names'
import { completionPercent, isDoneForPeriod, isGoalDueOn } from '../utils/progress'

const ALL = 'All'

// Dashboard tabs. The choice lives in the URL (?view=week) so a refresh keeps it.
const VIEWS = { today: 'Today', week: 'Week', month: 'Month' }

const todayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

function greetingFor(hour) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function Dashboard() {
  const { user } = useAuth()
  const today = useToday()
  const todayKey = toDateKey(today)
  const weekStartKey = toDateKey(startOfWeek(today))
  // Read the clock once when the page mounts, not on every re-render.
  const [hour] = useState(() => new Date().getHours())

  const [searchParams, setSearchParams] = useSearchParams()
  const viewParam = searchParams.get('view')
  const view = Object.hasOwn(VIEWS, viewParam ?? '') ? viewParam : 'today'

  function setView(value) {
    setSearchParams(value === 'today' ? {} : { view: value })
  }

  const { goals, loading: goalsLoading, error: goalsError } = useGoals(user.uid)
  const todaysGoals = goals.filter((goal) => isGoalDueOn(goal, todayKey))
  const {
    doneDatesByGoal,
    updateDoneDates,
    loading: progressLoading,
    error: progressError,
  } = useProgressRange(
    user.uid,
    todaysGoals.map((goal) => goal.id),
    weekStartKey,
    todayKey,
  )

  const [selectedCategory, setSelectedCategory] = useState(ALL)
  const [busyGoalId, setBusyGoalId] = useState(null)
  const [actionError, setActionError] = useState('')

  async function handleToggle(goal, done) {
    setActionError('')
    setBusyGoalId(goal.id)
    try {
      if (done) {
        await markGoalDone(user.uid, goal.id, todayKey)
      } else {
        await undoGoalDone(user.uid, goal.id, todayKey)
      }
      updateDoneDates(goal.id, (dates) => {
        const next = new Set(dates)
        if (done) next.add(todayKey)
        else next.delete(todayKey)
        return next
      })
    } catch (firestoreError) {
      setActionError(getFirestoreErrorMessage(firestoreError))
    } finally {
      setBusyGoalId(null)
    }
  }

  // Stats are calculated from state on every render, never stored.
  function doneDatesFor(goal) {
    return doneDatesByGoal.get(goal.id) ?? new Set()
  }
  function isDone(goal) {
    return isDoneForPeriod(goal, doneDatesFor(goal), todayKey, weekStartKey)
  }
  const completedCount = todaysGoals.filter(isDone).length
  const pendingCount = todaysGoals.length - completedCount
  const percent = completionPercent(completedCount, todaysGoals.length)

  // Category selector: only categories that have goals today.
  const categories = [ALL, ...new Set(todaysGoals.map((goal) => goal.category))]
  // If the selected category has no goals any more, fall back to All.
  const activeCategory = categories.includes(selectedCategory) ? selectedCategory : ALL
  const goalsInCategory =
    activeCategory === ALL ? todaysGoals : todaysGoals.filter((goal) => goal.category === activeCategory)
  const pendingGoals = goalsInCategory.filter((goal) => !isDone(goal))
  const completedGoals = goalsInCategory.filter(isDone)

  const loading = goalsLoading || progressLoading
  const name = user.displayName || 'there'

  function renderItem(goal) {
    return (
      <TodayGoalItem
        key={goal.id}
        goal={goal}
        done={isDone(goal)}
        doneToday={doneDatesFor(goal).has(todayKey)}
        busy={busyGoalId === goal.id}
        onToggle={handleToggle}
      />
    )
  }

  function renderCategoryButton(category) {
    const inCategory = category === ALL ? todaysGoals : todaysGoals.filter((goal) => goal.category === category)
    const left = inCategory.filter((goal) => !isDone(goal)).length
    const active = category === activeCategory

    return (
      <button
        key={category}
        type="button"
        className={`selector-item${active ? ' selector-item-active' : ''}`}
        onClick={() => setSelectedCategory(category)}
        aria-pressed={active}
        aria-label={`${category}: ${left} left`}
      >
        {active ? (
          <>
            <span className="selector-value">{left}</span>
            <span className="selector-text">
              <span className="selector-name">{category}</span>
              <span className="selector-status">{left === 0 ? 'All done' : 'left today'}</span>
            </span>
          </>
        ) : category === ALL ? (
          <GridIcon />
        ) : (
          <CategoryIcon category={category} />
        )}
      </button>
    )
  }

  return (
    <>
      <header className="greeting-header">
        <div>
          <p className="label">{greetingFor(hour)}</p>
          <h1 className="greeting-name">{name}</h1>
          <p className="muted">{todayFormatter.format(today)}</p>
        </div>
        <div className="avatar" aria-hidden="true">
          {initialsOf(name) || <UserIcon size={22} />}
          {!loading && pendingCount > 0 && <span className="avatar-badge">{pendingCount}</span>}
        </div>
      </header>

      <div className="segmented" role="group" aria-label="Dashboard view">
        {Object.entries(VIEWS).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="segmented-option"
            aria-pressed={view === value}
            onClick={() => setView(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'today' && actionError && <p className="status status-error page-status">{actionError}</p>}

      {goalsLoading ? (
        <p className="page-loading">Loading your goals…</p>
      ) : goalsError ? (
        <LoadError message={goalsError} />
      ) : goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          message="Create your first goal and start tracking your progress each day."
          action={
            <Link to="/goals/new" className="btn btn-primary">
              Create your first goal
            </Link>
          }
        />
      ) : view === 'week' ? (
        <WeekView uid={user.uid} goals={goals} today={today} />
      ) : view === 'month' ? (
        <MonthView uid={user.uid} goals={goals} today={today} />
      ) : progressLoading ? (
        <p className="page-loading">Loading today’s progress…</p>
      ) : progressError ? (
        <LoadError message={progressError} />
      ) : todaysGoals.length === 0 ? (
        <EmptyState
          title="Nothing scheduled for today"
          message="None of your active goals are due today."
          action={
            <Link to="/goals" className="btn btn-secondary">
              View all goals
            </Link>
          }
        />
      ) : (
        // Phones: one column. Desktop: progress card on the left, goal lists on the right.
        <div className="dashboard-grid">
          <div className="selector" role="group" aria-label="Filter by category">
            {categories.map(renderCategoryButton)}
          </div>

          <section className="hero-card" aria-labelledby="today-title">
            <span className="hero-blob" aria-hidden="true" />
            <div className="hero-heading">
              <span className="hero-icon" aria-hidden="true">
                <TargetIcon size={30} />
              </span>
              <div>
                <p className="label">Today</p>
                <h2 id="today-title">Your progress</h2>
              </div>
            </div>

            <div className="bento-grid">
              <div className="bento">
                <span className="bento-icon" aria-hidden="true">
                  <CheckCircleIcon size={16} />
                </span>
                <div>
                  <p className="label">Completed</p>
                  <p className="bento-value">{completedCount}</p>
                </div>
              </div>
              <div className="bento">
                <span className="bento-icon" aria-hidden="true">
                  <ClockIcon size={16} />
                </span>
                <div>
                  <p className="label">Pending</p>
                  <p className="bento-value">{pendingCount}</p>
                </div>
              </div>
              <div className="bento">
                <span className="bento-icon" aria-hidden="true">
                  <CalendarIcon size={16} />
                </span>
                <div>
                  <p className="label">Today’s goals</p>
                  <p className="bento-value">{todaysGoals.length}</p>
                </div>
              </div>
              <div className="bento">
                <span className="bento-icon" aria-hidden="true">
                  <TrendingUpIcon size={16} />
                </span>
                <div>
                  <p className="label">Done</p>
                  <p className="bento-value">{percent}%</p>
                </div>
              </div>
            </div>

            <div
              className="progress-bar"
              role="progressbar"
              aria-label="Today’s completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
            </div>

            <p className="info-box">
              {pendingCount === 0 ? <CheckCircleIcon size={20} /> : <InfoIcon size={20} />}
              <span>
                {pendingCount === 0
                  ? 'Everything is done for today. Great work!'
                  : `${pendingCount} goal${pendingCount === 1 ? '' : 's'} left today. Tap the circle to mark one done.`}
              </span>
            </p>
          </section>

          <div className="dashboard-feed">
            <section className="feed-section">
              <h2 className="section-title">Pending ({pendingGoals.length})</h2>
              {pendingGoals.length === 0 ? (
                <p className="muted">Nothing left here. Great work!</p>
              ) : (
                <ul className="feed-list">{pendingGoals.map(renderItem)}</ul>
              )}
            </section>

            <section className="feed-section">
              <h2 className="section-title">Completed ({completedGoals.length})</h2>
              {completedGoals.length === 0 ? (
                <p className="muted">Nothing completed yet.</p>
              ) : (
                <ul className="feed-list">{completedGoals.map(renderItem)}</ul>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  )
}

export default Dashboard
