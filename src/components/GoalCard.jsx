import { Link } from 'react-router-dom'
import { FREQUENCY_LABELS } from '../utils/constants'
import { formatDateKey } from '../utils/dates'
import { CategoryIcon } from './Icons'
import StatusBadge from './StatusBadge'

// A summary of one goal. The title links to its details page.
function GoalCard({ goal }) {
  return (
    <li className="feed-item goal-card">
      <span className="icon-box" aria-hidden="true">
        <CategoryIcon category={goal.category} />
      </span>

      <div className="feed-item-text">
        <div className="goal-card-header">
          <Link to={`/goals/${goal.id}`} className="feed-item-title">
            {goal.title}
          </Link>
          <StatusBadge status={goal.status} />
        </div>
        <span className="feed-item-meta">
          {goal.category} · {FREQUENCY_LABELS[goal.frequency]}
        </span>
        {goal.description && <p className="goal-card-description">{goal.description}</p>}
        <span className="feed-item-meta">
          From {formatDateKey(goal.startDate)}
          {goal.endDate && ` to ${formatDateKey(goal.endDate)}`}
        </span>
      </div>
    </li>
  )
}

export default GoalCard
