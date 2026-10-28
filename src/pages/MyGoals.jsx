import { Link, useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import GoalCard from '../components/GoalCard'
import LoadError from '../components/LoadError'
import { useAuth } from '../hooks/useAuth'
import { useFlashMessage } from '../hooks/useFlashMessage'
import { useGoals } from '../hooks/useGoals'
import { STATUS_LABELS } from '../utils/constants'

const FILTERS = { all: 'All', ...STATUS_LABELS }

function MyGoals() {
  const { user } = useAuth()
  const { goals, loading, error } = useGoals(user.uid)
  const [message] = useFlashMessage()
  // The filter lives in the URL (?status=completed), so the nav bar and the
  // browser's back button can change it, and a refresh keeps it.
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const filter = Object.hasOwn(STATUS_LABELS, statusParam ?? '') ? statusParam : 'all'

  function setFilter(value) {
    setSearchParams(value === 'all' ? {} : { status: value })
  }

  // Derived from state on each render; no need to store it separately.
  const visibleGoals = filter === 'all' ? goals : goals.filter((goal) => goal.status === filter)

  return (
    <>
      <div className="page-header">
        <h1>My goals</h1>
        <Link to="/goals/new" className="btn btn-primary">
          + New goal
        </Link>
      </div>

      {message && <p className="status status-success page-status">{message}</p>}

      {loading ? (
        <p className="page-loading">Loading your goals…</p>
      ) : error ? (
        <LoadError message={error} />
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
      ) : (
        <>
          <div className="filter-tabs" role="group" aria-label="Filter goals">
            {Object.entries(FILTERS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="filter-tab"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {visibleGoals.length === 0 ? (
            <p className="muted">No {FILTERS[filter].toLowerCase()} goals.</p>
          ) : (
            <ul className="goal-list">
              {visibleGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}

export default MyGoals
