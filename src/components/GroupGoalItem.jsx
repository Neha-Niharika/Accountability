// One shared goal in the group feed. Looks like a dashboard row (round check
// button on the right); tap the title to expand everyone's status, your note
// and the week board. The check button marks your check-in for today.
import { useState } from 'react'
import { FREQUENCY_LABELS } from '../utils/constants'
import { initialsOf } from '../utils/names'
import { isGoalInRange } from '../utils/stats'
import { MAX_NOTE_LENGTH } from '../utils/validation'
import FormField from './FormField'
import GroupGoalForm from './GroupGoalForm'
import { CheckCircleIcon, CheckIcon, ChevronRightIcon, ClockIcon, TargetIcon } from './Icons'
import WeekBoard from './WeekBoard'

function GroupGoalItem({
  goal,
  members,
  checkins,
  myUid,
  isOwner,
  todayKey,
  weekStartKey,
  days,
  busy,
  onCheckIn,
  onUndo,
  onSaveNote,
  onEdit,
  onDelete,
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  // Check-ins are only allowed on days inside the group's dates (copied onto each goal).
  const activeToday = isGoalInRange(goal, todayKey, todayKey)

  // Map of member uid → Set of dates they checked in.
  const doneDatesByMember = new Map()
  for (const checkin of checkins) {
    if (!doneDatesByMember.has(checkin.uid)) doneDatesByMember.set(checkin.uid, new Set())
    doneDatesByMember.get(checkin.uid).add(checkin.date)
  }

  // Daily goals count today; weekly goals count any day this week.
  function periodCheckin(uid) {
    return goal.frequency === 'weekly'
      ? checkins.find((checkin) => checkin.uid === uid && checkin.date >= weekStartKey && checkin.date <= todayKey)
      : checkins.find((checkin) => checkin.uid === uid && checkin.date === todayKey)
  }

  const myTodayCheckin = checkins.find((checkin) => checkin.uid === myUid && checkin.date === todayKey)
  const done = Boolean(periodCheckin(myUid))
  // A weekly goal done on an earlier day is undone from the Week tab.
  const doneEarlierThisWeek = done && !myTodayCheckin
  const doneCount = members.filter((member) => periodCheckin(member.id)).length
  const periodLabel = goal.frequency === 'weekly' ? 'This week' : 'Today'

  const [note, setNote] = useState(myTodayCheckin?.note ?? '')
  const noteChanged = myTodayCheckin && note.trim() !== myTodayCheckin.note

  function handleToggle() {
    if (myTodayCheckin) onUndo(goal)
    else onCheckIn(goal, note)
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (myTodayCheckin) onSaveNote(goal, note)
    else onCheckIn(goal, note)
  }

  async function handleEdit(values) {
    await onEdit(goal, values)
    setEditing(false)
  }

  let label = `Mark "${goal.title}" as done for today`
  if (myTodayCheckin) label = `Undo "${goal.title}" for today`
  if (doneEarlierThisWeek) label = `"${goal.title}" is done this week`
  if (!activeToday && !myTodayCheckin) label = `"${goal.title}" isn’t running today`

  const panelId = `group-goal-panel-${goal.id}`

  return (
    <li className={`feed-item group-goal-item${done ? ' feed-item-done' : ''}`}>
      <div className="group-goal-row">
        <span className="icon-box" aria-hidden="true">
          <TargetIcon />
        </span>

        <button
          type="button"
          className="group-goal-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={panelId}
        >
          <span className="feed-item-text">
            <span className="feed-item-title">{goal.title}</span>
            <span className="feed-item-meta">
              {FREQUENCY_LABELS[goal.frequency]}
              {activeToday && ` · ${doneCount}/${members.length} done ${periodLabel.toLowerCase()}`}
            </span>
          </span>
          <span className="group-goal-chevron" aria-hidden="true">
            <ChevronRightIcon />
          </span>
        </button>

        <button
          type="button"
          className={`check-button${done ? ' check-button-checked' : ''}`}
          onClick={handleToggle}
          disabled={busy || doneEarlierThisWeek || (!activeToday && !myTodayCheckin)}
          aria-pressed={done}
          aria-label={label}
          title={label}
        >
          {done && <CheckIcon />}
        </button>
      </div>

      {expanded && editing && (
        <div id={panelId} className="group-goal-panel">
          <GroupGoalForm goal={goal} onSubmit={handleEdit} onCancel={() => setEditing(false)} />
        </div>
      )}

      {expanded && !editing && (
        <div id={panelId} className="group-goal-panel">
          {goal.description && <p className="goal-card-description">{goal.description}</p>}

          {/* Your note */}
          {!activeToday && !myTodayCheckin ? (
            <p className="info-box">
              <ClockIcon size={20} />
              <span>
                {goal.startDate > todayKey
                  ? 'The group hasn’t started yet. Check-ins open on its start date.'
                  : 'The group has ended. Check-ins are closed.'}
              </span>
            </p>
          ) : doneEarlierThisWeek ? (
            <p className="info-box">
              <CheckCircleIcon size={20} />
              <span>You’re done for this week.</span>
            </p>
          ) : (
            <form className="my-status" onSubmit={handleSubmit} noValidate>
              <FormField
                label={myTodayCheckin ? 'Your note' : 'Add a note (optional)'}
                name={`note-${goal.id}`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={MAX_NOTE_LENGTH}
                autoComplete="off"
                placeholder="e.g. 5k in 28 minutes"
              />
              <div className="my-status-actions">
                {myTodayCheckin ? (
                  noteChanged && (
                    <button type="submit" className="btn btn-secondary btn-small" disabled={busy}>
                      Save note
                    </button>
                  )
                ) : (
                  <button type="submit" className="btn btn-primary btn-small" disabled={busy}>
                    {busy ? 'Saving…' : 'Mark done'}
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Everyone's status */}
          <p className="label group-goal-subtitle">{periodLabel}</p>
          <ul className="member-status-list">
            {members.map((member) => {
              const checkin = periodCheckin(member.id)
              return (
                <li key={member.id} className="member-status">
                  <span className="member-avatar" aria-hidden="true">
                    {initialsOf(member.name)}
                  </span>
                  <div className="member-status-text">
                    <span className="member-status-name">{member.id === myUid ? 'You' : member.name}</span>
                    {checkin?.note && <span className="member-status-note">“{checkin.note}”</span>}
                  </div>
                  {checkin ? (
                    <span className="member-status-badge member-status-badge-done">
                      <CheckCircleIcon size={16} />
                      Done
                    </span>
                  ) : (
                    <span className="member-status-badge">
                      <ClockIcon size={16} />
                      Not yet
                    </span>
                  )}
                </li>
              )
            })}
          </ul>

          <WeekBoard
            goal={goal}
            members={members}
            doneDatesByMember={doneDatesByMember}
            days={days}
            todayKey={todayKey}
            myUid={myUid}
          />

          {isOwner && (
            <div className="form-actions">
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setEditing(true)} disabled={busy}>
                Edit goal
              </button>
              <button type="button" className="btn btn-danger btn-small" onClick={() => onDelete(goal)} disabled={busy}>
                Delete goal
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

export default GroupGoalItem
