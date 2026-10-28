// The create/edit goal form. Validation, the saving state and errors live here;
// the page decides what "submit" means through the onSubmit prop.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getFirestoreErrorMessage } from '../services/goalService'
import { FREQUENCY_LABELS, GOAL_CATEGORIES, STATUS_LABELS } from '../utils/constants'
import { toDateKey } from '../utils/dates'
import { MAX_GOAL_DESCRIPTION_LENGTH, MAX_GOAL_TITLE_LENGTH, validateGoal } from '../utils/validation'
import FormField from './FormField'

function emptyGoalValues() {
  return {
    title: '',
    description: '',
    category: '',
    frequency: 'daily',
    startDate: toDateKey(new Date()),
    endDate: '',
    status: 'active',
  }
}

function GoalForm({ initialValues, showStatus = false, submitLabel, submittingLabel, cancelTo, onSubmit }) {
  // The function form of useState runs only on the first render.
  const [values, setValues] = useState(() => initialValues ?? emptyGoalValues())
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

    const validationErrors = validateGoal(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      // On success the page navigates away, so we don't reset `submitting`.
      await onSubmit(values)
    } catch (error) {
      setServerError(getFirestoreErrorMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <form className="card goal-form" onSubmit={handleSubmit} noValidate>
      {serverError && <p className="status status-error">{serverError}</p>}

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
        rows={3}
        value={values.description}
        onChange={handleChange}
        error={errors.description}
        maxLength={MAX_GOAL_DESCRIPTION_LENGTH}
      />
      <p className="char-count muted">
        {values.description.length}/{MAX_GOAL_DESCRIPTION_LENGTH}
      </p>

      <div className="form-row">
        <FormField
          label="Category"
          name="category"
          as="select"
          value={values.category}
          onChange={handleChange}
          error={errors.category}
        >
          <option value="">Choose a category</option>
          {GOAL_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </FormField>
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
      </div>

      <div className="form-row">
        <FormField
          label="Start date"
          name="startDate"
          type="date"
          value={values.startDate}
          onChange={handleChange}
          error={errors.startDate}
        />
        <FormField
          label="End date (optional)"
          name="endDate"
          type="date"
          min={values.startDate}
          value={values.endDate}
          onChange={handleChange}
          error={errors.endDate}
        />
      </div>

      {showStatus && (
        <FormField
          label="Status"
          name="status"
          as="select"
          value={values.status}
          onChange={handleChange}
          error={errors.status}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FormField>
      )}

      <div className="form-actions">
        <Link to={cancelTo} className="btn btn-secondary">
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  )
}

export default GoalForm
