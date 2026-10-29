// Owner only: change the start and end dates shared by all of the group's goals.
import { useState } from 'react'
import { getGroupErrorMessage } from '../services/groupService'
import { validateGroupDates } from '../utils/validation'
import GroupDatesFields from './GroupDatesFields'

function GroupDatesForm({ group, onSubmit }) {
  const [values, setValues] = useState({ startDate: group.startDate, endDate: group.endDate ?? '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const changed = values.startDate !== group.startDate || (values.endDate || null) !== group.endDate

  function handleChange(event) {
    const { name, value } = event.target
    setValues((previous) => ({ ...previous, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')

    const validationErrors = validateGroupDates(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      await onSubmit(values)
    } catch (error) {
      setServerError(getGroupErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="group-form group-dates-form" onSubmit={handleSubmit} noValidate>
      <h3>Group dates</h3>
      <p className="muted">Every goal in the group runs between these dates.</p>
      {serverError && <p className="status status-error page-status">{serverError}</p>}
      <GroupDatesFields values={values} errors={errors} onChange={handleChange} idPrefix="group-dates-" />
      <button type="submit" className="btn btn-secondary btn-block" disabled={submitting || !changed}>
        {submitting ? 'Saving…' : 'Save dates'}
      </button>
    </form>
  )
}

export default GroupDatesForm
