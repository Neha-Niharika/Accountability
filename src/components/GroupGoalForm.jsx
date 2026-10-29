// Owner only: add a shared goal to the group, or edit one (pass `goal`).
import { useState } from 'react'
import { getGroupErrorMessage } from '../services/groupService'
import { FREQUENCY_LABELS } from '../utils/constants'
import { MAX_GOAL_DESCRIPTION_LENGTH, MAX_GOAL_TITLE_LENGTH, validateGroupGoal } from '../utils/validation'
import FormField from './FormField'

// Dates aren't here: they belong to the group (see GroupDatesForm).
function emptyGoal() {
  return { title: '', description: '', frequency: 'daily' }
}

function valuesFrom(goal) {
  return { title: goal.title, description: goal.description, frequency: goal.frequency }
}

function GroupGoalForm({ goal, onSubmit, onCancel }) {
  const editing = Boolean(goal)
  const [values, setValues] = useState(() => (editing ? valuesFrom(goal) : emptyGoal()))
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
      await onSubmit(values)
      // When editing, the parent closes the form; when adding, start a fresh one.
      if (!editing) {
        setValues(emptyGoal())
        setSubmitting(false)
      }
    } catch (error) {
      setServerError(getGroupErrorMessage(error))
      setSubmitting(false)
    }
  }

  const idPrefix = editing ? `edit-${goal.id}-` : ''

  return (
    <form className={`group-form ${editing ? 'edit-goal-form' : 'add-goal-form'}`} onSubmit={handleSubmit} noValidate>
      <h3>{editing ? 'Edit goal' : 'Add a group goal'}</h3>
      {serverError && <p className="status status-error page-status">{serverError}</p>}
      <FormField
        label="Title"
        name="title"
        id={`${idPrefix}title`}
        value={values.title}
        onChange={handleChange}
        error={errors.title}
        autoComplete="off"
        maxLength={MAX_GOAL_TITLE_LENGTH}
      />
      <FormField
        label="Description (optional)"
        name="description"
        id={`${idPrefix}description`}
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
        id={`${idPrefix}frequency`}
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
      {editing ? (
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      ) : (
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add goal'}
        </button>
      )}
    </form>
  )
}

export default GroupGoalForm
