import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { createGroup, getGroupErrorMessage } from '../services/groupService'
import { toDateKey } from '../utils/dates'
import { MAX_GROUP_NAME_LENGTH, validateGroupDates, validateGroupName } from '../utils/validation'
import FormField from './FormField'
import GroupDatesFields from './GroupDatesFields'

function CreateGroupForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState(() => ({ name: '', startDate: toDateKey(new Date()), endDate: '' }))
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

    const validationErrors = { ...validateGroupName(values), ...validateGroupDates(values) }
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      const groupId = await createGroup(user, values)
      navigate(`/groups/${groupId}`, {
        state: { message: 'Group created. Share the join code with your friends.' },
      })
    } catch (error) {
      setServerError(getGroupErrorMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <form className="card group-form" onSubmit={handleSubmit} noValidate>
      <h2>Create a group</h2>
      <p className="muted">You’ll get a code to share. You add the goals everyone tracks.</p>
      {serverError && <p className="status status-error page-status">{serverError}</p>}
      <FormField
        label="Group name"
        name="name"
        id="groupName"
        value={values.name}
        onChange={handleChange}
        error={errors.name}
        autoComplete="off"
        maxLength={MAX_GROUP_NAME_LENGTH}
      />
      <GroupDatesFields values={values} errors={errors} onChange={handleChange} idPrefix="group-" />
      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? 'Creating…' : 'Create group'}
      </button>
    </form>
  )
}

export default CreateGroupForm
