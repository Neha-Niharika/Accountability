import { Link } from 'react-router-dom'
import { FREQUENCY_LABELS } from '../utils/constants'
import { CategoryIcon, CheckIcon } from './Icons'

// One goal in the dashboard feed, with a round check button on the right.
// `doneToday`: there is a record for today, so the check can be undone here.
// `done`: done for this period (today, or this week for weekly goals).
// Group goals pass `to` (their group page) and `label` (the group's name).
function TodayGoalItem({ goal, done, doneToday, busy, onToggle, to = `/goals/${goal.id}`, label = goal.category }) {
  // A weekly goal done on an earlier day is undone from its details page.
  const doneEarlierThisWeek = done && !doneToday

  let buttonLabel = `Mark "${goal.title}" as done for today`
  if (doneToday) buttonLabel = `Undo "${goal.title}" for today`
  if (doneEarlierThisWeek) buttonLabel = `"${goal.title}" is done this week`

  return (
    <li className={`feed-item${done ? ' feed-item-done' : ''}`}>
      <span className="icon-box" aria-hidden="true">
        <CategoryIcon category={goal.category} />
      </span>

      <div className="feed-item-text">
        <Link to={to} className="feed-item-title">
          {goal.title}
        </Link>
        <span className="feed-item-meta">
          {label} · {FREQUENCY_LABELS[goal.frequency]}
          {doneEarlierThisWeek && ' · Done this week'}
        </span>
      </div>

      <button
        type="button"
        className={`check-button${done ? ' check-button-checked' : ''}`}
        onClick={() => onToggle(goal, !doneToday)}
        disabled={busy || doneEarlierThisWeek}
        aria-pressed={done}
        aria-label={buttonLabel}
        title={buttonLabel}
      >
        {done && <CheckIcon />}
      </button>
    </li>
  )
}

export default TodayGoalItem
