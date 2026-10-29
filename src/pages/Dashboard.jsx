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
import { useMyGroupGoals } from '../hooks/useMyGroupGoals'
import { useToday } from '../hooks/useToday'
import { useProgressRange } from '../hooks/useProgressRange'
import { getFirestoreErrorMessage } from '../services/goalService'
import { checkIn, getGroupErrorMessage, memberName, undoCheckIn } from '../services/groupService'
import { markGoalDone, undoGoalDone } from '../services/progressService'
import { startOfWeek, toDateKey } from '../utils/dates'
import { initialsOf } from '../utils/names'
import { completionPercent, isDoneForPeriod, isGoalDueOn } from '../utils/progress'
import { isGoalInRange } from '../utils/stats'

const ALL = 'All'
// Group goals are listed under this name in the category selector.
const GROUPS = 'Groups'

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

  // Goals from your groups, with only your own check-ins this week.
  const {
    items: groupItems,
    setItems: setGroupItems,
    loading: groupsLoading,
    error: groupsError,
  } = useMyGroupGoals(user.uid, weekStartKey)

  const [selectedCategory, setSelectedCategory] = useState(ALL)
  const [busyKey, setBusyKey] = useState(null)
  const [actionError, setActionError] = useState('')

  // Stats are calculated from state on every render, never stored.
  function doneDatesFor(goal) {
    return doneDatesByGoal.get(goal.id) ?? new Set()
  }

  // One list for today: your goals, then your groups' goals (filed under "Groups").
  // `group` is set for group goals.
  const entries = [
    ...todaysGoals.map((goal) => ({ key: goal.id, goal, doneDates: doneDatesFor(goal), group: null })),
    ...groupItems
      .filter((item) => isGoalInRange(item.goal, todayKey, todayKey))
      .map((item) => ({
        key: `group-${item.group.id}-${item.goal.id}`,
        goal: { ...item.goal, category: GROUPS },
        doneDates: item.doneDates,
        group: item.group,
      })),
  ]

  function isDone(entry) {
    return isDoneForPeriod(entry.goal, entry.doneDates, todayKey, weekStartKey)
  }

  async function handleToggle(entry, done) {
    const { goal, group } = entry
    setActionError('')
    setBusyKey(entry.key)
    try {
      if (group) {
        if (done) await checkIn(group.id, goal.id, todayKey, { id: user.uid, name: memberName(user) }, '')
        else await undoCheckIn(group.id, goal.id, todayKey, user.uid)
        setGroupItems((previous) =>
          previous.map((item) => {
            if (item.group.id !== group.id || item.goal.id !== goal.id) return item
            const doneDates = new Set(item.doneDates)
            if (done) doneDates.add(todayKey)
            else doneDates.delete(todayKey)
            return { ...item, doneDates }
          }),
        )
      } else {
        if (done) await markGoalDone(user.uid, goal.id, todayKey)
        else await undoGoalDone(user.uid, goal.id, todayKey)
        updateDoneDates(goal.id, (dates) => {
          const next = new Set(dates)
          if (done) next.add(todayKey)
          else next.delete(todayKey)
          return next
        })
      }
    } catch (firestoreError) {
      setActionError(group ? getGroupErrorMessage(firestoreError) : getFirestoreErrorMessage(firestoreError))
    } finally {
      setBusyKey(null)
    }
  }

  const completedCount = entries.filter(isDone).length
  const pendingCount = entries.length - completedCount
  const percent = completionPercent(completedCount, entries.length)

  // Category selector: only categories that have goals today.
  const categories = [ALL, ...new Set(entries.map((entry) => entry.goal.category))]
  // If the selected category has no goals any more, fall back to All.
  const activeCategory = categories.includes(selectedCategory) ? selectedCategory : ALL
  const entriesInCategory =
    activeCategory === ALL ? entries : entries.filter((entry) => entry.goal.category === activeCategory)
  const pendingEntries = entriesInCategory.filter((entry) => !isDone(entry))
  const completedEntries = entriesInCategory.filter(isDone)

  const loading = goalsLoading || progressLoading || groupsLoading
  const name = user.displayName || 'there'

  function renderItem(entry) {
    return (
      <TodayGoalItem
        key={entry.key}
        goal={entry.goal}
        done={isDone(entry)}
        doneToday={entry.doneDates.has(todayKey)}
        busy={busyKey === entry.key}
        onToggle={(_goal, done) => handleToggle(entry, done)}
        {...(entry.group && { to: `/groups/${entry.group.id}`, label: entry.group.name })}
      />
    )
  }

  function renderCategoryButton(category) {
    const inCategory = category === ALL ? entries : entries.filter((entry) => entry.goal.category === category)
    const left = inCategory.filter((entry) => !isDone(entry)).length
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
      {view === 'today' && groupsError && (
        <p className="status status-error page-status">Couldn’t load your group goals. {groupsError}</p>
      )}

      {goalsLoading || groupsLoading ? (
        <p className="page-loading">Loading your goals…</p>
      ) : goalsError ? (
        <LoadError message={goalsError} />
      ) : goals.length === 0 && groupItems.length === 0 ? (
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
      ) : entries.length === 0 ? (
        <EmptyState
          title="Nothing scheduled for today"
          message="None of your active goals or group goals are due today."
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
                  <p className="bento-value">{entries.length}</p>
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
              <h2 className="section-title">Pending ({pendingEntries.length})</h2>
              {pendingEntries.length === 0 ? (
                <p className="muted">Nothing left here. Great work!</p>
              ) : (
                <ul className="feed-list">{pendingEntries.map(renderItem)}</ul>
              )}
            </section>

            <section className="feed-section">
              <h2 className="section-title">Completed ({completedEntries.length})</h2>
              {completedEntries.length === 0 ? (
                <p className="muted">Nothing completed yet.</p>
              ) : (
                <ul className="feed-list">{completedEntries.map(renderItem)}</ul>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  )
}

export default Dashboard
