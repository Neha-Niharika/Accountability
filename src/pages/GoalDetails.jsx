import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import GoalProgress from '../components/GoalProgress'
import { CategoryIcon, ChevronLeftIcon } from '../components/Icons'
import LoadError from '../components/LoadError'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../hooks/useAuth'
import { useFlashMessage } from '../hooks/useFlashMessage'
import { useGoal } from '../hooks/useGoal'
import { deleteGoal, getFirestoreErrorMessage, setGoalStatus } from '../services/goalService'
import { FREQUENCY_LABELS } from '../utils/constants'
import { formatDateKey } from '../utils/dates'

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function GoalDetails() {
  const { goalId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { goal, setGoal, loading, error } = useGoal(user.uid, goalId)
  const [message, setMessage] = useFlashMessage()
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleToggleStatus() {
    const nextStatus = goal.status === 'active' ? 'completed' : 'active'
    setMessage('')
    setActionError('')
    setBusy(true)
    try {
      await setGoalStatus(user.uid, goal.id, nextStatus)
      // Update our copy so the page reflects the change without reloading.
      setGoal({ ...goal, status: nextStatus, updatedAt: new Date() })
      setMessage(nextStatus === 'completed' ? 'Goal marked as completed.' : 'Goal is active again.')
    } catch (firestoreError) {
      setActionError(getFirestoreErrorMessage(firestoreError))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${goal.title}" and all its progress? This cannot be undone.`)) return

    setMessage('')
    setActionError('')
    setBusy(true)
    try {
      await deleteGoal(user.uid, goal.id)
      navigate('/goals', { replace: true, state: { message: 'Goal deleted.' } })
    } catch (firestoreError) {
      setActionError(getFirestoreErrorMessage(firestoreError))
      setBusy(false)
    }
  }

  if (loading) return <p className="page-loading">Loading goal…</p>
  if (error) return <LoadError message={error} />
  if (!goal) {
    return (
      <EmptyState
        title="Goal not found"
        message="It may have been deleted."
        action={
          <Link to="/goals" className="btn btn-primary">
            Back to my goals
          </Link>
        }
      />
    )
  }

  return (
    <>
      <p>
        <Link to="/goals" className="back-link">
          <ChevronLeftIcon />
          My goals
        </Link>
      </p>

      {message && <p className="status status-success page-status">{message}</p>}
      {actionError && <p className="status status-error page-status">{actionError}</p>}

      {/* Phones: stacked. Desktop: goal info on the left, progress on the right. */}
      <div className="details-grid">
        <div className="hero-card">
          <span className="hero-blob" aria-hidden="true" />
          <div className="hero-heading">
            <span className="hero-icon" aria-hidden="true">
              <CategoryIcon category={goal.category} size={30} />
            </span>
            <div className="goal-card-header">
              <h1>{goal.title}</h1>
              <StatusBadge status={goal.status} />
            </div>
          </div>
          {goal.description && <p className="goal-description">{goal.description}</p>}

          <dl className="details-list">
            <dt>Category</dt>
            <dd>{goal.category}</dd>
            <dt>Frequency</dt>
            <dd>{FREQUENCY_LABELS[goal.frequency]}</dd>
            <dt>Start date</dt>
            <dd>{formatDateKey(goal.startDate)}</dd>
            <dt>End date</dt>
            <dd>{goal.endDate ? formatDateKey(goal.endDate) : 'No end date'}</dd>
            <dt>Created</dt>
            <dd>{goal.createdAt ? timestampFormatter.format(goal.createdAt) : '—'}</dd>
            <dt>Last updated</dt>
            <dd>{goal.updatedAt ? timestampFormatter.format(goal.updatedAt) : '—'}</dd>
          </dl>

          <div className="form-actions">
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={busy}>
              Delete
            </button>
            <Link to={`/goals/${goal.id}/edit`} className="btn btn-secondary">
              Edit
            </Link>
            <button type="button" className="btn btn-primary" onClick={handleToggleStatus} disabled={busy}>
              {goal.status === 'active' ? 'Mark as completed' : 'Mark as active'}
            </button>
          </div>
        </div>

        <GoalProgress goal={goal} />
      </div>
    </>
  )
}

export default GoalDetails
