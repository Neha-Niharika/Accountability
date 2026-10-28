import { useNavigate } from 'react-router-dom'
import GoalForm from '../components/GoalForm'
import { useAuth } from '../hooks/useAuth'
import { createGoal } from '../services/goalService'

function CreateGoal() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // GoalForm validates first and shows any error this throws.
  async function handleCreate(values) {
    const goalId = await createGoal(user.uid, values)
    navigate(`/goals/${goalId}`, { state: { message: 'Goal created.' } })
  }

  return (
    <>
      <div className="page-header">
        <h1>New goal</h1>
      </div>
      <GoalForm
        submitLabel="Create goal"
        submittingLabel="Creating…"
        cancelTo="/goals"
        onSubmit={handleCreate}
      />
    </>
  )
}

export default CreateGoal
