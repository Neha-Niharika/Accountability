// A members × Monday–Sunday table for one group goal.
import { parseDateKey, toDateKey } from '../utils/dates'
import { CheckIcon } from './Icons'

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' })
const longDayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'short' })

const STATE_LABELS = { done: 'done', missed: 'missed', open: 'not done yet', off: 'not due' }

function WeekBoard({ goal, members, doneDatesByMember, days, todayKey, myUid }) {
  function cellState(member, dateKey) {
    if (doneDatesByMember.get(member.id)?.has(dateKey)) return 'done'
    const joinedKey = member.joinedAt ? toDateKey(member.joinedAt.toDate()) : days[0]
    if (dateKey > todayKey || dateKey < joinedKey) return 'off'
    if (goal.frequency === 'weekly') return 'off' // weekly goals have no "missed" days
    return dateKey === todayKey ? 'open' : 'missed'
  }

  return (
    <div className="week-board-wrap">
      <table className="week-board">
        <caption className="visually-hidden">{`${goal.title}: who checked in this week`}</caption>
        <thead>
          <tr>
            <th scope="col" className="visually-hidden">
              Member
            </th>
            {days.map((dateKey) => {
              const date = parseDateKey(dateKey)
              return (
                <th key={dateKey} scope="col" abbr={longDayFormatter.format(date)}>
                  {weekdayFormatter.format(date)}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <th scope="row" className="week-board-name">
                {member.id === myUid ? 'You' : member.name}
              </th>
              {days.map((dateKey) => {
                const state = cellState(member, dateKey)
                return (
                  <td key={dateKey}>
                    <span className={`day-cell day-cell-${state}`} title={STATE_LABELS[state]}>
                      {state === 'done' && <CheckIcon size={12} />}
                      <span className="visually-hidden">{STATE_LABELS[state]}</span>
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default WeekBoard
