// Group "Week" tab: step back week by week to the group's start, see your own
// week summary, and a members × days board per goal. Tap a day on your own row
// to fill it in (the owner can fill in anyone's). Uses the check-ins the group
// page already loaded (everything since the group's start).
import { useState } from 'react'
import { FREQUENCY_LABELS } from '../utils/constants'
import { addDays, dateKeysBetween, startOfWeek, toDateKey } from '../utils/dates'
import { completionPercent } from '../utils/progress'
import { isGoalInRange, periodStats } from '../utils/stats'
import { ChevronLeftIcon, ChevronRightIcon, InfoIcon, TargetIcon } from './Icons'
import PeriodHero from './PeriodHero'
import WeekBoard from './WeekBoard'

const dayMonthFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })

function GroupWeekView({ group, goals: allGoals, members, checkins, myUid, isOwner, today, busyCellId, onToggleDay }) {
  const [weekOffset, setWeekOffset] = useState(0) // 0 = this week, -1 = last week…
  const todayKey = toDateKey(today)
  const monday = addDays(startOfWeek(today), weekOffset * 7)
  const fromKey = toDateKey(monday)
  const toKey = toDateKey(addDays(monday, 6))
  const days = dateKeysBetween(fromKey, toKey)
  const rangeLabel = `${dayMonthFormatter.format(monday)} – ${dayMonthFormatter.format(addDays(monday, 6))}`

  // Go back no further than the week the group started in.
  const canGoBack = fromKey > group.startDate
  const goals = allGoals.filter((goal) => isGoalInRange(goal, fromKey, toKey))

  // Map of goal id → member uid → Set of dates checked in.
  const doneDatesByGoal = new Map(goals.map((goal) => [goal.id, new Map()]))
  for (const checkin of checkins) {
    const byMember = doneDatesByGoal.get(checkin.goalId)
    if (!byMember) continue
    if (!byMember.has(checkin.uid)) byMember.set(checkin.uid, new Set())
    byMember.get(checkin.uid).add(checkin.date)
  }

  const statsByGoal = new Map(
    goals.map((goal) => [
      goal.id,
      periodStats(goal, doneDatesByGoal.get(goal.id).get(myUid) ?? new Set(), fromKey, toKey, todayKey),
    ]),
  )
  const totalDue = [...statsByGoal.values()].reduce((sum, stats) => sum + stats.due, 0)
  const totalDone = [...statsByGoal.values()].reduce((sum, stats) => sum + stats.done, 0)

  // You fill in your own days; the owner can fill in anyone's.
  function canEdit(member) {
    return isOwner || member.id === myUid
  }

  return (
    <div className="dashboard-grid group-dashboard">
      <div className="period-nav">
        <button
          type="button"
          className="period-nav-button"
          onClick={() => setWeekOffset(weekOffset - 1)}
          disabled={!canGoBack}
          aria-label="Previous week"
        >
          <ChevronLeftIcon />
        </button>
        <div className="period-nav-title">
          <p className="label">{weekOffset === 0 ? 'This week' : 'Week'}</p>
          <p className="period-nav-range">{rangeLabel}</p>
        </div>
        <button
          type="button"
          className="period-nav-button"
          onClick={() => setWeekOffset(weekOffset + 1)}
          disabled={weekOffset === 0}
          aria-label="Next week"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <PeriodHero
        label={`${weekOffset === 0 ? 'This week' : 'Week'} · You`}
        title={rangeLabel}
        done={totalDone}
        due={totalDue}
        goalCount={goals.length}
        percent={completionPercent(totalDone, totalDue)}
      />

      <div className="dashboard-feed">
        <p className="info-box week-fill-hint">
          <InfoIcon size={20} />
          <span>
            {isOwner
              ? 'Tap a day to mark it done or clear it, for anyone in the group. Use ◀ to go back to earlier weeks.'
              : 'Tap a day on your row to mark it done or clear it. Use ◀ to go back to earlier weeks.'}
          </span>
        </p>

        <h2 className="section-title">Goals this week</h2>
        {goals.length === 0 && <p className="muted">No group goals run this week.</p>}
        <ul className="feed-list">
          {goals.map((goal) => {
            const stats = statsByGoal.get(goal.id)
            return (
              <li key={goal.id} className="feed-item group-goal-item">
                <div className="group-goal-row">
                  <span className="icon-box" aria-hidden="true">
                    <TargetIcon />
                  </span>
                  <div className="feed-item-text">
                    <span className="feed-item-title">{goal.title}</span>
                    <span className="feed-item-meta">
                      {FREQUENCY_LABELS[goal.frequency]} · You: {stats.done}/{stats.due}
                    </span>
                  </div>
                </div>
                <WeekBoard
                  goal={goal}
                  members={members}
                  doneDatesByMember={doneDatesByGoal.get(goal.id)}
                  days={days}
                  todayKey={todayKey}
                  myUid={myUid}
                  canEdit={canEdit}
                  busyCellId={busyCellId}
                  onToggle={(member, dateKey, done) => onToggleDay(goal, member, dateKey, done)}
                />
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default GroupWeekView
