// Shows a reward and punishment and what the streak has earned or owes:
// rewards to claim and punishments to do, each with a button to mark it.
// `events` come from streakStats; only those on or after `stakes.since` count.
// `children` goes at the bottom (the edit form, or the members' list).
// `current` and `best` are the streak lengths in days.
import { formatDateKey } from '../utils/dates'
import { stakeEvents } from '../utils/stats'
import { CheckIcon, FlameIcon, TrophyIcon } from './Icons'

const MAX_SHOWN = 8

function daysLabel(count) {
  return `${count} day${count === 1 ? '' : 's'}`
}

function StakesPanel({ title, stakes, current, best, events, claims, claimIdFor, busyId, onToggle, canMark = true, children }) {
  const claimsById = new Map(claims.map((claim) => [claim.id, claim]))
  const shown = stakeEvents(stakes, events)
  const open = shown.filter((event) => !claimsById.has(claimIdFor(event.kind, event.date)))
  const toClaim = open.filter((event) => event.kind === 'reward').length
  const owed = open.length - toClaim
  const daysToReward = stakes?.reward ? stakes.rewardEvery - (current % stakes.rewardEvery) : null

  return (
    <section className="card stakes-panel" aria-label={title}>
      <h2>{title}</h2>

      <div className="stakes-streak">
        <span className="stakes-icon stakes-icon-streak" aria-hidden="true">
          <FlameIcon size={16} />
        </span>
        <span>
          <strong>{daysLabel(current)}</strong> streak
          <span className="muted"> · best {daysLabel(best)}</span>
        </span>
      </div>

      {!stakes ? (
        <p className="muted">No reward or punishment set yet.</p>
      ) : (
        <>
          <ul className="stakes-summary">
            {stakes.reward && (
              <li>
                <span className="stakes-icon stakes-icon-reward" aria-hidden="true">
                  <TrophyIcon size={16} />
                </span>
                <span>
                  <strong>{stakes.reward}</strong> every {stakes.rewardEvery} streak day
                  {stakes.rewardEvery === 1 ? '' : 's'}
                  <span className="muted">
                    {' '}
                    · next in {daysToReward} day{daysToReward === 1 ? '' : 's'}
                  </span>
                </span>
              </li>
            )}
            {stakes.punishment && (
              <li>
                <span className="stakes-icon stakes-icon-punishment" aria-hidden="true">
                  <FlameIcon size={16} />
                </span>
                <span>
                  <strong>{stakes.punishment}</strong> when the streak breaks
                </span>
              </li>
            )}
          </ul>

          <p className="muted">
            {shown.length === 0
              ? `Nothing earned or owed yet. Counting from ${formatDateKey(stakes.since)}.`
              : `${toClaim} reward${toClaim === 1 ? '' : 's'} to claim · ${owed} punishment${owed === 1 ? '' : 's'} to do`}
          </p>

          {shown.length > 0 && (
            <ul className="stakes-events">
              {shown.slice(0, MAX_SHOWN).map((event) => {
                const id = claimIdFor(event.kind, event.date)
                const claim = claimsById.get(id)
                const isReward = event.kind === 'reward'
                const label = claim?.label ?? stakes[event.kind]
                return (
                  <li key={id} className={`stakes-event${claim ? ' stakes-event-done' : ''}`}>
                    <span className="stakes-event-text">
                      <span className="stakes-event-title">
                        {isReward ? 'Earned' : 'Owe'}: {label}
                      </span>
                      <span className="muted">
                        {isReward ? 'Streak milestone' : 'Streak broke'} on {formatDateKey(event.date)}
                      </span>
                    </span>
                    {canMark ? (
                      <button
                        type="button"
                        className={`btn btn-small ${claim ? 'btn-secondary' : 'btn-primary'}`}
                        disabled={busyId === id}
                        aria-pressed={Boolean(claim)}
                        onClick={() => onToggle(event, label, !claim)}
                      >
                        {claim ? <CheckIcon size={14} /> : null}
                        {claim ? (isReward ? 'Claimed' : 'Done') : isReward ? 'Mark claimed' : 'Mark done'}
                      </button>
                    ) : (
                      claim && <span className="muted">{isReward ? 'Claimed' : 'Done'}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {children}
    </section>
  )
}

export default StakesPanel
