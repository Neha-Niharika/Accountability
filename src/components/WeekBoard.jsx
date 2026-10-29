// A members × Monday–Sunday table for one group goal.
// With `onToggle`, the days a person may fill in (`canEdit(member)`, from the
// goal's start up to today) become buttons that mark or clear that day.
import { parseDateKey } from '../utils/dates'
import { isGoalInRange } from '../utils/stats'
import { CheckIcon } from './Icons'

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' })
const longDayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'short' })

const STATE_LABELS = { done: 'done', missed: 'missed', open: 'not done yet', off: 'not due' }

function WeekBoard({ goal, members, doneDatesByMember, days, todayKey, myUid, canEdit, busyCellId, onToggle }) {
  // Everyone is counted from the goal's start date, even if they joined later.
  function cellState(member, dateKey) {
    if (doneDatesByMember.get(member.id)?.has(dateKey)) return 'done'
    if (dateKey > todayKey || !isGoalInRange(goal, dateKey, dateKey)) return 'off'
    if (goal.frequency === 'weekly') return 'off' // weekly goals have no "missed" days
    return dateKey === todayKey ? 'open' : 'missed'
  }

  function isEditable(member, dateKey) {
    return Boolean(onToggle) && canEdit(member) && dateKey <= todayKey && isGoalInRange(goal, dateKey, dateKey)
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
                <th
                  key={dateKey}
                  scope="col"
                  abbr={longDayFormatter.format(date)}
                  className={dateKey === todayKey ? 'week-board-today' : undefined}
                >
                  <span className="week-board-weekday">{weekdayFormatter.format(date)}</span>
                  <span className="week-board-date">{date.getDate()}</span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const name = member.id === myUid ? 'You' : member.name
            return (
              <tr key={member.id}>
                <th scope="row" className="week-board-name">
                  {name}
                </th>
                {days.map((dateKey) => {
                  const state = cellState(member, dateKey)
                  const day = longDayFormatter.format(parseDateKey(dateKey))
                  const content = (
                    <>
                      {state === 'done' && <CheckIcon size={12} />}
                      <span className="visually-hidden">{STATE_LABELS[state]}</span>
                    </>
                  )

                  if (!isEditable(member, dateKey)) {
                    return (
                      <td key={dateKey}>
                        <span className={`day-cell day-cell-${state}`} title={`${day}: ${STATE_LABELS[state]}`}>
                          {content}
                        </span>
                      </td>
                    )
                  }

                  const done = state === 'done'
                  const label = `${done ? 'Clear' : 'Mark'} ${goal.title} ${done ? 'for' : 'done for'} ${name} on ${day}`
                  return (
                    <td key={dateKey}>
                      <button
                        type="button"
                        className={`day-cell day-cell-${state} day-cell-button`}
                        onClick={() => onToggle(member, dateKey, !done)}
                        disabled={busyCellId === `${goal.id}_${dateKey}_${member.id}`}
                        aria-pressed={done}
                        aria-label={label}
                        title={label}
                      >
                        {state === 'done' && <CheckIcon size={12} />}
                      </button>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default WeekBoard
