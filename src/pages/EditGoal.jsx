import { Link, useNavigate, useParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import GoalForm from '../components/GoalForm'
import LoadError from '../components/LoadError'
import { useAuth } from '../hooks/useAuth'
import { useGoal } from '../hooks/useGoal'
import { updateGoal } from '../services/goalService'

// Firestore goal → form values. Inputs need '' rather than null.
function toFormValues(goal) {
  return {
    title: goal.title,
    description: goal.description,
    category: goal.category,
    frequency: goal.frequency,
    startDate: goal.startDate,
    endDate: goal.endDate ?? '',
    status: goal.status,
  }
}

function EditGoal() {
  const { goalId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { goal, loading, error } = useGoal(user.uid, goalId)

  async function handleSave(values) {
    await updateGoal(user.uid, goalId, values)
    navigate(`/goals/${goalId}`, { state: { message: 'Changes saved.' } })
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
      <div className="page-header">
        <h1>Edit goal</h1>
      </div>
      <GoalForm
        initialValues={toFormValues(goal)}
        showStatus
        submitLabel="Save changes"
        submittingLabel="Saving…"
        cancelTo={`/goals/${goalId}`}
        onSubmit={handleSave}
      />
    </>
  )
}

export default EditGoal
