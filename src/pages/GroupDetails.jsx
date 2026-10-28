import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AddGroupGoalForm from '../components/AddGroupGoalForm'
import EmptyState from '../components/EmptyState'
import GroupGoalCard from '../components/GroupGoalCard'
import { ChevronLeftIcon, UsersIcon } from '../components/Icons'
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
} from '../services/groupService'
import { addDays, dateKeysBetween, startOfWeek, toDateKey } from '../utils/dates'
import { initialsOf } from '../utils/names'

const MAX_AVATARS = 6

function GroupDetails() {
  const { groupId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const today = useToday()
  const todayKey = toDateKey(today)
  const monday = startOfWeek(today)
  const weekStartKey = toDateKey(monday)
  const days = dateKeysBetween(weekStartKey, toDateKey(addDays(monday, 6)))

  const { data, setData, loading, notFound, error } = useGroup(groupId, weekStartKey)
  const [message, setMessage] = useFlashMessage()
  const [actionError, setActionError] = useState('')
  const [busyGoalId, setBusyGoalId] = useState(null)
  const [groupBusy, setGroupBusy] = useState(false)

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
    setData((previous) => ({ ...previous, goals: [...previous.goals, goal] }))
    setMessage('Goal added. Everyone in the group can check in now.')
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
      const checkin = await checkIn(groupId, goal.id, todayKey, user, note)
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

  return (
    <>
      <p>
        <Link to="/groups" className="back-link">
          <ChevronLeftIcon />
          Groups
        </Link>
      </p>

      {message && <p className="status status-success page-status">{message}</p>}
      {actionError && <p className="status status-error page-status">{actionError}</p>}

      {/* Phones: stacked. Desktop: group info on the left, goals on the right. */}
      <div className="details-grid">
        <section className="hero-card group-hero" aria-labelledby="group-title">
          <span className="hero-blob" aria-hidden="true" />
          <div className="hero-heading">
            <span className="hero-icon" aria-hidden="true">
              <UsersIcon size={30} />
            </span>
            <div>
              <p className="label">{isOwner ? 'Your group' : `Created by ${group.ownerName}`}</p>
              <h1 id="group-title">{group.name}</h1>
            </div>
          </div>

          <div className="member-row">
            <ul className="avatar-stack" aria-label={`${members.length} members`}>
              {members.slice(0, MAX_AVATARS).map((member) => (
                <li key={member.id} className="member-avatar" title={member.name}>
                  {initialsOf(member.name)}
                </li>
              ))}
              {extraMembers > 0 && <li className="member-avatar member-avatar-more">+{extraMembers}</li>}
            </ul>
            <span className="muted">
              {members.length} member{members.length === 1 ? '' : 's'}
            </span>
          </div>

          <ShareCode code={group.code} groupName={group.name} />

          <div className="form-actions">
            <button type="button" className="btn btn-danger" onClick={handleLeaveOrDelete} disabled={groupBusy}>
              {isOwner ? 'Delete group' : 'Leave group'}
            </button>
          </div>
        </section>

        <section className="group-goals" aria-labelledby="group-goals-title">
          <h2 id="group-goals-title" className="section-title">
            Group goals
          </h2>

          {isOwner && <AddGroupGoalForm onAdd={handleAddGoal} />}

          {goals.length === 0 ? (
            <p className="muted">
              {isOwner
                ? 'Add the first goal above. Everyone in the group will track it.'
                : 'The group owner hasn’t added any goals yet.'}
            </p>
          ) : (
            <ul className="group-goal-list">
              {goals.map((goal) => (
                <GroupGoalCard
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
                  onDelete={handleDeleteGoal}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

export default GroupDetails
