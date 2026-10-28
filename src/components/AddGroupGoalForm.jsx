// Owner only: add a shared goal to the group.
import { useState } from 'react'
import { getGroupErrorMessage } from '../services/groupService'
import { FREQUENCY_LABELS } from '../utils/constants'
import { MAX_GOAL_DESCRIPTION_LENGTH, MAX_GOAL_TITLE_LENGTH, validateGroupGoal } from '../utils/validation'
import FormField from './FormField'

const EMPTY_GOAL = { title: '', description: '', frequency: 'daily' }

function AddGroupGoalForm({ onAdd }) {
  const [values, setValues] = useState(EMPTY_GOAL)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setValues((previous) => ({ ...previous, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')

    const validationErrors = validateGroupGoal(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      await onAdd(values)
      setValues(EMPTY_GOAL)
    } catch (error) {
      setServerError(getGroupErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card group-form" onSubmit={handleSubmit} noValidate>
      <h2>Add a group goal</h2>
      {serverError && <p className="status status-error page-status">{serverError}</p>}
      <FormField
        label="Title"
        name="title"
        value={values.title}
        onChange={handleChange}
        error={errors.title}
        autoComplete="off"
        maxLength={MAX_GOAL_TITLE_LENGTH}
      />
      <FormField
        label="Description (optional)"
        name="description"
        as="textarea"
        rows={2}
        value={values.description}
        onChange={handleChange}
        error={errors.description}
        maxLength={MAX_GOAL_DESCRIPTION_LENGTH}
      />
      <FormField
        label="Frequency"
        name="frequency"
        as="select"
        value={values.frequency}
        onChange={handleChange}
        error={errors.frequency}
      >
        {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FormField>
      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add goal'}
      </button>
    </form>
  )
}

export default AddGroupGoalForm
