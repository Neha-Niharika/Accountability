// One shared goal on a group page: your own check-in (with an optional note),
// everyone's status for today (or this week), and the week board.
import { useState } from 'react'
import { FREQUENCY_LABELS } from '../utils/constants'
import { initialsOf } from '../utils/names'
import { MAX_NOTE_LENGTH } from '../utils/validation'
import FormField from './FormField'
import { CheckCircleIcon, ClockIcon, TargetIcon } from './Icons'
import WeekBoard from './WeekBoard'

function GroupGoalCard({
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
  onDelete,
}) {
  // Map of member uid → Set of dates they checked in this week.
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
  const myPeriodCheckin = periodCheckin(myUid)
  const doneCount = members.filter((member) => periodCheckin(member.id)).length
  const periodLabel = goal.frequency === 'weekly' ? 'This week' : 'Today'

  const [note, setNote] = useState(myTodayCheckin?.note ?? '')
  const noteChanged = myTodayCheckin && note.trim() !== myTodayCheckin.note

  function handleSubmit(event) {
    event.preventDefault()
    if (myTodayCheckin) onSaveNote(goal, note)
    else onCheckIn(goal, note)
  }

  return (
    <li className="card group-goal">
      <div className="group-goal-header">
        <span className="icon-box" aria-hidden="true">
          <TargetIcon />
        </span>
        <div className="feed-item-text">
          <h3 className="feed-item-title">{goal.title}</h3>
          <span className="feed-item-meta">
            {FREQUENCY_LABELS[goal.frequency]} · {doneCount}/{members.length} done {periodLabel.toLowerCase()}
          </span>
        </div>
        {isOwner && (
          <button type="button" className="btn btn-danger btn-small" onClick={() => onDelete(goal)} disabled={busy}>
            Delete
          </button>
        )}
      </div>
      {goal.description && <p className="goal-card-description">{goal.description}</p>}

      {/* Your status */}
      {myPeriodCheckin && !myTodayCheckin ? (
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
              <>
                {noteChanged && (
                  <button type="submit" className="btn btn-secondary btn-small" disabled={busy}>
                    Save note
                  </button>
                )}
                <button type="button" className="btn btn-secondary btn-small" onClick={() => onUndo(goal)} disabled={busy}>
                  Undo
                </button>
                <span className="my-status-done">
                  <CheckCircleIcon size={18} />
                  Done today
                </span>
              </>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={busy}>
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
    </li>
  )
}

export default GroupGoalCard
