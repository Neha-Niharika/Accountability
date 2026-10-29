// Group "Month" tab: one heatmap row per member, one cell per day, and each
// member's score since the goals started. Uses the check-ins the group page
// already loaded (everything since the earliest goal start).
import { useState } from 'react'
import { dateKeysBetween, endOfMonth, parseDateKey, toDateKey } from '../utils/dates'
import { completionPercent } from '../utils/progress'
import { dayCompletion, isGoalInRange, periodStats, shadeLevel, sinceStartStats } from '../utils/stats'
import { ChevronLeftIcon, ChevronRightIcon } from './Icons'
import PeriodHero from './PeriodHero'

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' })
const longDayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

function GroupMonthView({ goals, members, checkins, myUid, today }) {
  const [monthOffset, setMonthOffset] = useState(0) // 0 = this month, -1 = last month…
  const todayKey = toDateKey(today)
  const firstDay = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const fromKey = toDateKey(firstDay)
  const toKey = toDateKey(endOfMonth(firstDay))
  const days = dateKeysBetween(fromKey, toKey)
  const monthLabel = monthFormatter.format(firstDay)

  // Nothing to show before the first goal started.
  const earliestStart = goals.reduce((earliest, goal) => (goal.startDate < earliest ? goal.startDate : earliest), todayKey)
  const canGoBack = fromKey > earliestStart

  // Map of member uid → goal id → Set of dates checked in.
  const doneDatesByMember = new Map(members.map((member) => [member.id, new Map()]))
  for (const checkin of checkins) {
    const byGoal = doneDatesByMember.get(checkin.uid)
    if (!byGoal) continue // someone who has left the group
    if (!byGoal.has(checkin.goalId)) byGoal.set(checkin.goalId, new Set())
    byGoal.get(checkin.goalId).add(checkin.date)
  }

  // Everyone is counted from each goal's start date, even if they joined later.
  const monthGoals = goals.filter((goal) => isGoalInRange(goal, fromKey, toKey))
  let monthDue = 0
  let monthDone = 0
  for (const member of members) {
    for (const goal of monthGoals) {
      const stats = periodStats(goal, doneDatesByMember.get(member.id).get(goal.id) ?? new Set(), fromKey, toKey, todayKey)
      monthDue += stats.due
      monthDone += stats.done
    }
  }

  const rows = members.map((member) => {
    const doneDatesByGoal = doneDatesByMember.get(member.id)
    const overall = sinceStartStats(goals, doneDatesByGoal, todayKey)
    return {
      member,
      name: member.id === myUid ? 'You' : member.name,
      doneDatesByGoal,
      percent: completionPercent(overall.done, overall.due),
      overall,
    }
  })

  return (
    <div className="dashboard-grid group-dashboard">
      <div className="period-nav">
        <button
          type="button"
          className="period-nav-button"
          onClick={() => setMonthOffset(monthOffset - 1)}
          disabled={!canGoBack}
          aria-label="Previous month"
        >
          <ChevronLeftIcon />
        </button>
        <div className="period-nav-title">
          <p className="label">{monthOffset === 0 ? 'This month' : 'Month'}</p>
          <p className="period-nav-range">{monthLabel}</p>
        </div>
        <button
          type="button"
          className="period-nav-button"
          onClick={() => setMonthOffset(monthOffset + 1)}
          disabled={monthOffset === 0}
          aria-label="Next month"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <PeriodHero
        label={`${monthOffset === 0 ? 'This month' : 'Month'} · Everyone`}
        title={monthLabel}
        done={monthDone}
        due={monthDue}
        goalCount={monthGoals.length}
        percent={completionPercent(monthDone, monthDue)}
      />

      <div className="dashboard-feed">
        <section className="card heatmap-card" aria-labelledby="member-heatmap-title">
          <h2 id="member-heatmap-title">Daily goals by member</h2>
          <p className="muted member-heatmap-hint">% is each person’s score since the goals started.</p>

          <div className="member-heatmap-wrap">
            <table className="member-heatmap">
              <caption className="visually-hidden">{`Daily goals done by each member in ${monthLabel}`}</caption>
              <thead>
                <tr>
                  <th scope="col" className="member-heatmap-name">
                    <span className="visually-hidden">Member</span>
                  </th>
                  {days.map((dateKey) => {
                    const date = parseDateKey(dateKey)
                    return (
                      <th
                        key={dateKey}
                        scope="col"
                        abbr={longDayFormatter.format(date)}
                        className={dateKey === todayKey ? 'member-heatmap-today' : undefined}
                      >
                        <span className="member-heatmap-weekday">{weekdayFormatter.format(date)}</span>
                        {date.getDate()}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ member, name, doneDatesByGoal, percent, overall }) => (
                  <tr key={member.id}>
                    <th scope="row" className="member-heatmap-name">
                      <span className="member-heatmap-label" title={member.name}>
                        {name}
                      </span>
                      <span className="member-heatmap-percent" title={`${overall.done} of ${overall.due} done since the start`}>
                        {percent}%
                      </span>
                    </th>
                    {days.map((dateKey) => {
                      const completion = dayCompletion(monthGoals, doneDatesByGoal, dateKey)
                      const future = dateKey > todayKey
                      const level = future || completion.due === 0 ? 'empty' : shadeLevel(completion)
                      const description = future
                        ? 'upcoming'
                        : completion.due === 0
                          ? 'no daily goals'
                          : `${completion.done} of ${completion.due} done`
                      const label = `${name}, ${longDayFormatter.format(parseDateKey(dateKey))}: ${description}`
                      return (
                        <td key={dateKey}>
                          <span className={`member-heatmap-cell heatmap-level-${level}`} title={label}>
                            <span className="visually-hidden">{description}</span>
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="heatmap-legend" aria-hidden="true">
            <span>Less</span>
            <span className="heatmap-day heatmap-level-0" />
            <span className="heatmap-day heatmap-level-1" />
            <span className="heatmap-day heatmap-level-2" />
            <span className="heatmap-day heatmap-level-3" />
            <span>All done</span>
          </div>
        </section>

        <p className="muted member-heatmap-note">
          Weekly goals count toward the % but don’t shade single days.
        </p>
      </div>
    </div>
  )
}

export default GroupMonthView
