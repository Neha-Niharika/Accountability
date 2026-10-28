import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getGroupErrorMessage, joinGroupByCode } from '../services/groupService'
import { GROUP_CODE_LENGTH, normaliseCode } from '../utils/groupCode'
import { validateJoinCode } from '../utils/validation'
import FormField from './FormField'

// `initialCode` comes from an invite link like /groups?join=K7MP2Q.
function JoinGroupForm({ initialCode = '' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState(initialCode)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')

    const validationErrors = validateJoinCode({ code })
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      const { groupId, alreadyMember } = await joinGroupByCode(user, code)
      navigate(`/groups/${groupId}`, {
        state: { message: alreadyMember ? 'You’re already in this group.' : 'You joined the group.' },
      })
    } catch (error) {
      setServerError(getGroupErrorMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <form className="card group-form" onSubmit={handleSubmit} noValidate>
      <h2>Join with a code</h2>
      <p className="muted">Ask a friend for their group’s 6-character code.</p>
      {serverError && <p className="status status-error page-status">{serverError}</p>}
      <FormField
        label="Join code"
        name="joinCode"
        value={code}
        // Uppercase and strip spaces as the user types.
        onChange={(event) => setCode(normaliseCode(event.target.value))}
        error={errors.code}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={GROUP_CODE_LENGTH}
        className="code-input"
      />
      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? 'Joining…' : 'Join group'}
      </button>
    </form>
  )
}

export default JoinGroupForm
