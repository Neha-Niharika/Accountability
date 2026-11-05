// Group reward and punishment: your 80% streak and what it has earned or owes,
// plus every member's streak and open items. A streak day is a day with at
// least 80% of the group's daily goals done. Uses the check-ins the group page
// already loaded (everything since the group's start). `children` is the
// owner's edit form.
import { claimId } from '../services/stakesService'
import { GROUP_PERCENT_NEEDED } from '../utils/constants'
import { stakeEvents, streakStats } from '../utils/stats'
import StakesPanel from './StakesPanel'

// Map of goal id → Set of dates, for one member.
function doneDatesFor(checkins, uid) {
  const doneDatesByGoal = new Map()
  for (const checkin of checkins) {
    if (checkin.uid !== uid) continue
    if (!doneDatesByGoal.has(checkin.goalId)) doneDatesByGoal.set(checkin.goalId, new Set())
    doneDatesByGoal.get(checkin.goalId).add(checkin.date)
  }
  return doneDatesByGoal
}

function GroupStakes({ goals, members, checkins, stakes, claims, myUid, todayKey, busyId, onToggle, children }) {
  const options = { percentNeeded: GROUP_PERCENT_NEEDED, rewardEvery: stakes?.rewardEvery ?? 0 }
  const claimIds = new Set(claims.map((claim) => claim.id))

  const rows = members.map((member) => {
    const streak = streakStats(goals, doneDatesFor(checkins, member.id), todayKey, options)
    const open = stakeEvents(stakes, streak.events).filter(
      (event) => !claimIds.has(claimId(event.kind, event.date, member.id)),
    )
    const toClaim = open.filter((event) => event.kind === 'reward').length
    return { member, streak, toClaim, owed: open.length - toClaim }
  })
  const mine = rows.find((row) => row.member.id === myUid)

  return (
    <StakesPanel
      title="Group rewards and punishments"
      stakes={stakes}
      current={mine?.streak.current ?? 0}
      best={mine?.streak.best ?? 0}
      events={mine?.streak.events ?? []}
      claims={claims}
      claimIdFor={(kind, date) => claimId(kind, date, myUid)}
      busyId={busyId}
      onToggle={onToggle}
    >
      <p className="muted">
        A streak day is a day you finish at least {GROUP_PERCENT_NEEDED}% of the group’s daily goals.
        {!stakes && ' Only the group owner can set a reward and punishment.'}
      </p>
      <ul className="stakes-members" aria-label="Everyone’s streaks">
        {rows.map(({ member, streak, toClaim, owed }) => (
          <li key={member.id}>
            <strong>{member.id === myUid ? 'You' : member.name}</strong>
            <span className="muted">
              {streak.current} day streak
              {stakes && ` · ${toClaim} to claim · ${owed} owed`}
            </span>
          </li>
        ))}
      </ul>
      {children}
    </StakesPanel>
  )
}

export default GroupStakes
