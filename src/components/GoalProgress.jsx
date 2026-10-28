// The progress section of the Goal Details page: mark a date as done,
// see the history, and undo any entry.
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useGoalProgress } from '../hooks/useGoalProgress'
import { useToday } from '../hooks/useToday'
import { getFirestoreErrorMessage } from '../services/goalService'
import { markGoalDone, undoGoalDone } from '../services/progressService'
import { DATE_KEY_PATTERN, formatDateKey, toDateKey } from '../utils/dates'
import FormField from './FormField'
import { CheckCircleIcon } from './Icons'
import LoadError from './LoadError'

function GoalProgress({ goal }) {
  const { user } = useAuth()
  const todayKey = toDateKey(useToday())
  const { dates, setDates, loading, error } = useGoalProgress(user.uid, goal.id)

  // The latest date that can be logged: today, or the end date if it has passed.
  const maxDate = goal.endDate && goal.endDate < todayKey ? goal.endDate : todayKey
  const canLog = goal.status === 'active' && goal.startDate <= todayKey

  const [date, setDate] = useState(maxDate)
  const [formError, setFormError] = useState('')
  const [actionError, setActionError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  function validateDate() {
    if (!DATE_KEY_PATTERN.test(date)) return 'Choose a date.'
    if (date < goal.startDate) return 'Date can’t be before the goal’s start date.'
    if (date > maxDate) return 'Date can’t be in the future or after the end date.'
    if (dates.includes(date)) return 'Already marked done for that date.'
    return ''
  }

  async function handleMark(event) {
    event.preventDefault()
    setMessage('')
    setActionError('')

    const dateError = validateDate()
    setFormError(dateError)
    if (dateError) return

    setBusy(true)
    try {
      await markGoalDone(user.uid, goal.id, date)
      // Keep the list newest first. 'YYYY-MM-DD' strings sort in date order.
      setDates((previous) => [...previous, date].sort().reverse())
      setMessage(`Marked done for ${formatDateKey(date)}.`)
    } catch (firestoreError) {
      setActionError(getFirestoreErrorMessage(firestoreError))
    } finally {
      setBusy(false)
    }
  }

  async function handleUndo(dateKey) {
    setMessage('')
    setActionError('')
    setBusy(true)
    try {
      await undoGoalDone(user.uid, goal.id, dateKey)
      setDates((previous) => previous.filter((existing) => existing !== dateKey))
      setMessage(`Removed ${formatDateKey(dateKey)}.`)
    } catch (firestoreError) {
      setActionError(getFirestoreErrorMessage(firestoreError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card progress-card">
      <h2>Progress</h2>

      {message && <p className="status status-success page-status">{message}</p>}
      {actionError && <p className="status status-error page-status">{actionError}</p>}

      {canLog ? (
        <form className="progress-form" onSubmit={handleMark} noValidate>
          <FormField
            label="Mark done for"
            name="progressDate"
            type="date"
            min={goal.startDate}
            max={maxDate}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            error={formError}
          />
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Mark done
          </button>
        </form>
      ) : (
        <p className="muted">
          {goal.status === 'completed'
            ? 'This goal is completed. Mark it as active to log more progress.'
            : `This goal starts on ${formatDateKey(goal.startDate)}.`}
        </p>
      )}

      <h3 className="progress-history-title">History</h3>
      {loading ? (
        <p className="muted">Loading progress…</p>
      ) : error ? (
        <LoadError message={error} />
      ) : dates.length === 0 ? (
        <p className="muted">No progress logged yet.</p>
      ) : (
        <>
          <p className="muted">
            Done {dates.length} time{dates.length === 1 ? '' : 's'}.
          </p>
          <ul className="history-list">
            {dates.map((dateKey) => (
              <li key={dateKey}>
                <span className="history-date">
                  <CheckCircleIcon size={20} />
                  {formatDateKey(dateKey)}
                </span>
                <button type="button" className="btn btn-secondary btn-small" onClick={() => handleUndo(dateKey)} disabled={busy}>
                  Undo
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export default GoalProgress
