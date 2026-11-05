// Dashboard "Rewards" tab: your personal reward and punishment, what your
// streak has earned or owes, and the form to change them. The streak counts
// your personal daily goals only (all of the day's done); each group has its
// own on the group page.
import { useState } from 'react'
import { useProgressRange } from '../hooks/useProgressRange'
import { useStakes } from '../hooks/useStakes'
import { getFirestoreErrorMessage } from '../services/goalService'
import { addClaim, claimId, removeClaim, saveStakes } from '../services/stakesService'
import { toDateKey } from '../utils/dates'
import { streakStats } from '../utils/stats'
import LoadError from './LoadError'
import StakesForm from './StakesForm'
import StakesPanel from './StakesPanel'

// A streak can go back to a goal's first day, so load every date.
const FIRST_KEY = '0000-01-01'

function RewardsView({ uid, goals, today }) {
  const todayKey = toDateKey(today)
  // Completed goals are finished, so they don't count, as on the Month tab.
  const activeGoals = goals.filter((goal) => goal.status === 'active')
  const {
    doneDatesByGoal,
    loading: progressLoading,
    error: progressError,
  } = useProgressRange(
    uid,
    activeGoals.map((goal) => goal.id),
    FIRST_KEY,
    todayKey,
  )
  const { data, setData, loading: stakesLoading, error: stakesError } = useStakes(uid)
  const { stakes, claims } = data
  const [busyClaimId, setBusyClaimId] = useState(null)
  const [actionError, setActionError] = useState('')

  // Errors are shown by the form itself.
  async function handleSaveStakes(values) {
    const saved = await saveStakes({ uid }, values, stakes, todayKey)
    setData((previous) => ({ ...previous, stakes: saved }))
  }

  async function handleToggleClaim(event, label, done) {
    const id = claimId(event.kind, event.date)
    setActionError('')
    setBusyClaimId(id)
    try {
      if (done) {
        const claim = await addClaim({ uid }, { kind: event.kind, date: event.date, label })
        setData((previous) => ({ ...previous, claims: [...previous.claims, claim] }))
      } else {
        await removeClaim({ uid }, id)
        setData((previous) => ({ ...previous, claims: previous.claims.filter((claim) => claim.id !== id) }))
      }
    } catch (firestoreError) {
      setActionError(getFirestoreErrorMessage(firestoreError))
    } finally {
      setBusyClaimId(null)
    }
  }

  if (progressLoading || stakesLoading) return <p className="page-loading">Loading your rewards…</p>
  if (progressError || stakesError) return <LoadError message={progressError || stakesError} />

  const streak = streakStats(activeGoals, doneDatesByGoal, todayKey, { rewardEvery: stakes?.rewardEvery ?? 0 })

  return (
    <div className="rewards-view">
      {actionError && <p className="status status-error page-status">{actionError}</p>}
      <StakesPanel
        title="Your rewards and punishments"
        stakes={stakes}
        current={streak.current}
        best={streak.best}
        events={streak.events}
        claims={claims}
        claimIdFor={(kind, date) => claimId(kind, date)}
        busyId={busyClaimId}
        onToggle={handleToggleClaim}
      >
        <details className="stakes-edit" open={!stakes}>
          <summary>{stakes ? 'Change reward or punishment' : 'Set a reward or punishment'}</summary>
          <StakesForm
            stakes={stakes}
            onSubmit={handleSaveStakes}
            heading="For your personal goals"
            help="A streak day is a day you finish every personal daily goal. Days with nothing due are skipped."
            idPrefix="personal-stakes-"
          />
        </details>
      </StakesPanel>
    </div>
  )
}

export default RewardsView
