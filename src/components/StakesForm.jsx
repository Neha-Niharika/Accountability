// Set a reward (earned every N streak days) and a punishment (owed when the
// streak breaks). The samples fill a field in one tap; anything can be typed.
// Leaving both empty and saving removes them.
import { useState } from 'react'
import { getFirestoreErrorMessage } from '../services/goalService'
import { SAMPLE_PUNISHMENTS, SAMPLE_REWARDS } from '../utils/constants'
import { validateStakes } from '../utils/validation'
import FormField from './FormField'

function initialValues(stakes) {
  return {
    reward: stakes?.reward ?? '',
    punishment: stakes?.punishment ?? '',
    rewardEvery: String(stakes?.rewardEvery ?? 7),
  }
}

function StakesForm({ stakes, onSubmit, heading = 'Rewards and punishments', help, idPrefix = 'stakes-' }) {
  const [values, setValues] = useState(() => initialValues(stakes))
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const saved = initialValues(stakes)
  const changed = Object.keys(values).some((name) => values[name].trim() !== saved[name])

  function setValue(name, value) {
    setValues((previous) => ({ ...previous, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')

    const validationErrors = validateStakes(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSubmitting(true)
    try {
      await onSubmit(values)
    } catch (error) {
      setServerError(getFirestoreErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  function renderSamples(name, samples) {
    return (
      <div className="chip-row" role="group" aria-label={`Sample ${name}s`}>
        {samples.map((sample) => (
          <button
            key={sample}
            type="button"
            className="chip"
            aria-pressed={values[name] === sample}
            onClick={() => setValue(name, sample)}
          >
            {sample}
          </button>
        ))}
      </div>
    )
  }

  return (
    <form className="group-form stakes-form" onSubmit={handleSubmit} noValidate>
      <h3>{heading}</h3>
      {help && <p className="muted">{help}</p>}
      {serverError && <p className="status status-error page-status">{serverError}</p>}

      <FormField
        label="Reward"
        name="reward"
        id={`${idPrefix}reward`}
        value={values.reward}
        onChange={(event) => setValue('reward', event.target.value)}
        error={errors.reward}
        maxLength={60}
        placeholder="e.g. Hot chocolate"
      />
      {renderSamples('reward', SAMPLE_REWARDS)}

      <FormField
        label="Earn it every … streak days"
        name="rewardEvery"
        id={`${idPrefix}reward-every`}
        type="number"
        inputMode="numeric"
        min={1}
        max={365}
        value={values.rewardEvery}
        onChange={(event) => setValue('rewardEvery', event.target.value)}
        error={errors.rewardEvery}
      />

      <FormField
        label="Punishment when the streak breaks"
        name="punishment"
        id={`${idPrefix}punishment`}
        value={values.punishment}
        onChange={(event) => setValue('punishment', event.target.value)}
        error={errors.punishment}
        maxLength={60}
        placeholder="e.g. Skip tea for 7 days"
      />
      {renderSamples('punishment', SAMPLE_PUNISHMENTS)}

      <button type="submit" className="btn btn-secondary btn-block" disabled={submitting || !changed}>
        {submitting ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}

export default StakesForm
