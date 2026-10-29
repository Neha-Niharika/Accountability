// Laid out like the Dashboard: header, Today / Week tabs, your progress card on
// the left and the goal feed on the right.
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import GroupDatesForm from '../components/GroupDatesForm'
import GroupGoalForm from '../components/GroupGoalForm'
import GroupGoalItem from '../components/GroupGoalItem'
import GroupMonthView from '../components/GroupMonthView'
import GroupWeekView from '../components/GroupWeekView'
import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ClockIcon,
  InfoIcon,
  TrendingUpIcon,
  UsersIcon,
} from '../components/Icons'
import LoadError from '../components/LoadError'
import ShareCode from '../components/ShareCode'
import { useAuth } from '../hooks/useAuth'
import { useFlashMessage } from '../hooks/useFlashMessage'
import { useGroup } from '../hooks/useGroup'
import { useToday } from '../hooks/useToday'
import {
  addGroupGoal,
  checkIn,
  deleteGroup,
  deleteGroupGoal,
  getGroupErrorMessage,
  leaveGroup,
  undoCheckIn,
  updateCheckInNote,
  updateGroupDates,
  updateGroupGoal,
  withDates,
} from '../services/groupService'
import { addDays, dateKeysBetween, formatDateKey, parseDateKey, startOfWeek, toDateKey } from '../utils/dates'
import { initialsOf } from '../utils/names'
import { completionPercent } from '../utils/progress'
import { isGoalInRange } from '../utils/stats'

const MAX_AVATARS = 6

const shortDateFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })

// '1 Nov – 30 Nov', 'From 1 Nov', or 'Starts 1 Dec' for a group that hasn't begun.
function dateRangeLabel(group, todayKey) {
  const start = shortDateFormatter.format(parseDateKey(group.startDate))
  if (group.endDate) return `${start} – ${shortDateFormatter.format(parseDateKey(group.endDate))}`
  return group.startDate > todayKey ? `Starts ${start}` : `From ${start}`
}

// Group tabs. The choice lives in the URL (?view=week) so a refresh keeps it.
const VIEWS = { today: 'Today', week: 'Week', month: 'Month' }

function GroupDetails() {
  const { groupId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const today = useToday()
  const todayKey = toDateKey(today)
  const monday = startOfWeek(today)
  const weekStartKey = toDateKey(monday)
  const days = dateKeysBetween(weekStartKey, toDateKey(addDays(monday, 6)))

  const [searchParams, setSearchParams] = useSearchParams()
  const viewParam = searchParams.get('view')
  const view = Object.hasOwn(VIEWS, viewParam ?? '') ? viewParam : 'today'

  function setView(value) {
    setSearchParams(value === 'today' ? {} : { view: value })
  }

  const { data, setData, loading, notFound, error } = useGroup(groupId, weekStartKey)
  const [message, setMessage] = useFlashMessage()
  const [actionError, setActionError] = useState('')
  const [busyGoalId, setBusyGoalId] = useState(null)
  // The week board cell being saved: '{goalId}_{date}_{uid}'.
  const [busyCellId, setBusyCellId] = useState(null)
  const [groupBusy, setGroupBusy] = useState(false)

  function myMember() {
    return data.members.find((member) => member.id === user.uid)
  }

  // Runs a save for one goal: clears messages, marks it busy, shows errors.
  async function runGoalAction(goalId, action) {
    setMessage('')
    setActionError('')
    setBusyGoalId(goalId)
    try {
      await action()
    } catch (firestoreError) {
      setActionError(getGroupErrorMessage(firestoreError))
    } finally {
      setBusyGoalId(null)
    }
  }

  // Errors are shown by the form itself.
  async function handleAddGoal(values) {
    const goal = await addGroupGoal(groupId, values)
    setData((previous) => ({ ...previous, goals: [...previous.goals, withDates(goal, previous.group)] }))
    setMessage('Goal added. Everyone in the group can check in now.')
  }

  // Errors (such as check-ins outside the new dates) are shown by the form.
  async function handleSaveDates(values) {
    setMessage('')
    setActionError('')
    const dates = await updateGroupDates(groupId, values)
    setData((previous) => {
      const group = { ...previous.group, ...dates }
      return { ...previous, group, goals: previous.goals.map((goal) => withDates(goal, group)) }
    })
    setMessage('Group dates saved.')
  }

  async function handleEditGoal(goal, values) {
    setMessage('')
    setActionError('')
    const fields = await updateGroupGoal(groupId, goal.id, values)
    setData((previous) => ({
      ...previous,
      goals: previous.goals.map((existing) => (existing.id === goal.id ? { ...existing, ...fields } : existing)),
    }))
    setMessage('Goal updated.')
  }

  function handleDeleteGoal(goal) {
    if (!window.confirm(`Delete "${goal.title}" and everyone’s check-ins for it?`)) return
    runGoalAction(goal.id, async () => {
      await deleteGroupGoal(groupId, goal.id)
      setData((previous) => ({
        ...previous,
        goals: previous.goals.filter((existing) => existing.id !== goal.id),
        checkins: previous.checkins.filter((checkin) => checkin.goalId !== goal.id),
      }))
      setMessage('Goal deleted.')
    })
  }

  function handleCheckIn(goal, note) {
    runGoalAction(goal.id, async () => {
      const checkin = await checkIn(groupId, goal.id, todayKey, myMember(), note)
      setData((previous) => ({ ...previous, checkins: [...previous.checkins, checkin] }))
    })
  }

  function handleUndo(goal) {
    runGoalAction(goal.id, async () => {
      await undoCheckIn(groupId, goal.id, todayKey, user.uid)
      setData((previous) => ({
        ...previous,
        checkins: previous.checkins.filter(
          (checkin) => !(checkin.goalId === goal.id && checkin.uid === user.uid && checkin.date === todayKey),
        ),
      }))
    })
  }

  // Week tab: mark or clear one day for one member. You fill in your own
  // days; the owner can fill in anyone's.
  async function handleToggleDay(goal, member, date, done) {
    const cellId = `${goal.id}_${date}_${member.id}`
    setMessage('')
    setActionError('')
    setBusyCellId(cellId)
    try {
      if (done) {
        const checkin = await checkIn(groupId, goal.id, date, member, '')
        setData((previous) => ({ ...previous, checkins: [...previous.checkins, checkin] }))
      } else {
        await undoCheckIn(groupId, goal.id, date, member.id)
        setData((previous) => ({
          ...previous,
          checkins: previous.checkins.filter(
            (checkin) => !(checkin.goalId === goal.id && checkin.uid === member.id && checkin.date === date),
          ),
        }))
      }
    } catch (firestoreError) {
      setActionError(getGroupErrorMessage(firestoreError))
    } finally {
      setBusyCellId(null)
    }
  }

  function handleSaveNote(goal, note) {
    runGoalAction(goal.id, async () => {
      await updateCheckInNote(groupId, goal.id, todayKey, user.uid, note)
      setData((previous) => ({
        ...previous,
        checkins: previous.checkins.map((checkin) =>
          checkin.goalId === goal.id && checkin.uid === user.uid && checkin.date === todayKey
            ? { ...checkin, note: note.trim() }
            : checkin,
        ),
      }))
      setMessage('Note saved.')
    })
  }

  async function handleLeaveOrDelete() {
    const isOwner = data.group.ownerId === user.uid
    const question = isOwner
      ? `Delete "${data.group.name}" for everyone? All goals and check-ins will be removed.`
      : `Leave "${data.group.name}"? Your check-ins in this group will be removed.`
    if (!window.confirm(question)) return

    setMessage('')
    setActionError('')
    setGroupBusy(true)
    try {
      if (isOwner) await deleteGroup(data.group, user.uid)
      else await leaveGroup(groupId, user.uid)
      navigate('/groups', { replace: true, state: { message: isOwner ? 'Group deleted.' : 'You left the group.' } })
    } catch (firestoreError) {
      setActionError(getGroupErrorMessage(firestoreError))
      setGroupBusy(false)
    }
  }

  if (loading) return <p className="page-loading">Loading group…</p>
  if (error) return <LoadError message={error} />
  if (notFound || !data) {
    return (
      <EmptyState
        title="Group not found"
        message="It may have been deleted, or you’re not a member. Ask a member for the join code."
        action={
          <Link to="/groups" className="btn btn-primary">
            Go to groups
          </Link>
        }
      />
    )
  }

  const { group, members, goals, checkins } = data
  const isOwner = group.ownerId === user.uid
  const extraMembers = members.length - MAX_AVATARS

  // Your own status per goal: daily goals count today, weekly goals any day this week.
  function isDoneByMe(goal) {
    return checkins.some(
      (checkin) =>
        checkin.goalId === goal.id &&
        checkin.uid === user.uid &&
        (goal.frequency === 'weekly' ? checkin.date >= weekStartKey && checkin.date <= todayKey : checkin.date === todayKey),
    )
  }
  // Every goal shares the group's dates, so either all run today or none do.
  const runningToday = isGoalInRange(group, todayKey, todayKey)
  const todaysGoals = runningToday ? goals : []
  const otherGoals = runningToday ? [] : goals
  const completedGoals = todaysGoals.filter(isDoneByMe)
  const pendingGoals = todaysGoals.filter((goal) => !isDoneByMe(goal))
  const percent = completionPercent(completedGoals.length, todaysGoals.length)

  function renderItem(goal) {
    return (
      <GroupGoalItem
        key={goal.id}
        goal={goal}
        members={members}
        checkins={checkins.filter((checkin) => checkin.goalId === goal.id)}
        myUid={user.uid}
        isOwner={isOwner}
        todayKey={todayKey}
        weekStartKey={weekStartKey}
        days={days}
        busy={busyGoalId === goal.id}
        onCheckIn={handleCheckIn}
        onUndo={handleUndo}
        onSaveNote={handleSaveNote}
        onEdit={handleEditGoal}
        onDelete={handleDeleteGoal}
      />
    )
  }

  const manageGroup = (
    // Open by default while an owner still has to add the first goal.
    <details className="card manage-group" open={isOwner && goals.length === 0}>
      <summary>
        <span>Manage group</span>
        <span className="muted">{isOwner ? 'Invite, dates, add goals, delete' : 'Invite, leave'}</span>
      </summary>

      <ShareCode code={group.code} groupName={group.name} />

      {isOwner && <GroupDatesForm group={group} onSubmit={handleSaveDates} />}

      {isOwner && <GroupGoalForm onSubmit={handleAddGoal} />}

      <div className="form-actions">
        <button type="button" className="btn btn-danger" onClick={handleLeaveOrDelete} disabled={groupBusy}>
          {isOwner ? 'Delete group' : 'Leave group'}
        </button>
      </div>
    </details>
  )

  return (
    <>
      <p>
        <Link to="/groups" className="back-link">
          <ChevronLeftIcon />
          Groups
        </Link>
      </p>

      <header className="greeting-header">
        <div>
          <p className="label">{isOwner ? 'Your group' : `Created by ${group.ownerName}`}</p>
          <h1 className="greeting-name">{group.name}</h1>
          <p className="muted">
            {members.length} member{members.length === 1 ? '' : 's'} · {dateRangeLabel(group, todayKey)}
          </p>
        </div>
        <ul className="avatar-stack" aria-label={`${members.length} members`}>
          {members.slice(0, MAX_AVATARS).map((member) => (
            <li key={member.id} className="member-avatar" title={member.name}>
              {initialsOf(member.name)}
            </li>
          ))}
          {extraMembers > 0 && <li className="member-avatar member-avatar-more">+{extraMembers}</li>}
        </ul>
      </header>

      <div className="segmented" role="group" aria-label="Group view">
        {Object.entries(VIEWS).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="segmented-option"
            aria-pressed={view === value}
            onClick={() => setView(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {message && <p className="status status-success page-status">{message}</p>}
      {actionError && <p className="status status-error page-status">{actionError}</p>}

      {goals.length === 0 ? (
        <>
          <EmptyState
            title="No group goals yet"
            message={
              isOwner
                ? 'Add the first goal below. Everyone in the group will track it.'
                : 'The group owner hasn’t added any goals yet.'
            }
          />
          {manageGroup}
        </>
      ) : view === 'week' ? (
        <GroupWeekView
          group={group}
          goals={goals}
          members={members}
          checkins={checkins}
          myUid={user.uid}
          isOwner={isOwner}
          today={today}
          busyCellId={busyCellId}
          onToggleDay={handleToggleDay}
        />
      ) : view === 'month' ? (
        <GroupMonthView goals={goals} members={members} checkins={checkins} myUid={user.uid} today={today} />
      ) : (
        // Phones: one column. Desktop: progress card on the left, goal lists on the right.
        <div className="dashboard-grid group-dashboard">
          <div className="group-side">
            <section className="hero-card" aria-labelledby="group-today-title">
              <span className="hero-blob" aria-hidden="true" />
              <div className="hero-heading">
                <span className="hero-icon" aria-hidden="true">
                  <UsersIcon size={30} />
                </span>
                <div>
                  <p className="label">Today</p>
                  <h2 id="group-today-title">Your progress</h2>
                </div>
              </div>

              <div className="bento-grid">
                <div className="bento">
                  <span className="bento-icon" aria-hidden="true">
                    <CheckCircleIcon size={16} />
                  </span>
                  <div>
                    <p className="label">Completed</p>
                    <p className="bento-value">{completedGoals.length}</p>
                  </div>
                </div>
                <div className="bento">
                  <span className="bento-icon" aria-hidden="true">
                    <ClockIcon size={16} />
                  </span>
                  <div>
                    <p className="label">Pending</p>
                    <p className="bento-value">{pendingGoals.length}</p>
                  </div>
                </div>
                <div className="bento">
                  <span className="bento-icon" aria-hidden="true">
                    <CalendarIcon size={16} />
                  </span>
                  <div>
                    <p className="label">Today’s goals</p>
                    <p className="bento-value">{todaysGoals.length}</p>
                  </div>
                </div>
                <div className="bento">
                  <span className="bento-icon" aria-hidden="true">
                    <TrendingUpIcon size={16} />
                  </span>
                  <div>
                    <p className="label">Done</p>
                    <p className="bento-value">{percent}%</p>
                  </div>
                </div>
              </div>

              <div
                className="progress-bar"
                role="progressbar"
                aria-label="Your completion today"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
              >
                <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
              </div>

              <p className="info-box">
                {runningToday && pendingGoals.length === 0 ? <CheckCircleIcon size={20} /> : <InfoIcon size={20} />}
                <span>
                  {!runningToday
                    ? group.startDate > todayKey
                      ? `The group starts on ${formatDateKey(group.startDate)}. Check-ins open then.`
                      : `The group ended on ${formatDateKey(group.endDate)}. See the Month tab for how everyone did.`
                    : pendingGoals.length === 0
                    ? 'You’re done with every group goal. Great work!'
                    : `${pendingGoals.length} goal${pendingGoals.length === 1 ? '' : 's'} left. Tap the circle to mark one done, or the goal to see everyone.`}
                </span>
              </p>
            </section>

            {manageGroup}
          </div>

          {runningToday ? (
            <div className="dashboard-feed">
              <section className="feed-section">
                <h2 className="section-title">Pending ({pendingGoals.length})</h2>
                {pendingGoals.length === 0 ? (
                  <p className="muted">Nothing left here. Great work!</p>
                ) : (
                  <ul className="feed-list">{pendingGoals.map(renderItem)}</ul>
                )}
              </section>

              <section className="feed-section">
                <h2 className="section-title">Completed ({completedGoals.length})</h2>
                {completedGoals.length === 0 ? (
                  <p className="muted">Nothing completed yet.</p>
                ) : (
                  <ul className="feed-list">{completedGoals.map(renderItem)}</ul>
                )}
              </section>
            </div>
          ) : (
            <div className="dashboard-feed">
              <section className="feed-section">
                <h2 className="section-title">Group goals ({otherGoals.length})</h2>
                <ul className="feed-list">{otherGoals.map(renderItem)}</ul>
              </section>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default GroupDetails
