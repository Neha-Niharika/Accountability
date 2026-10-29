// All Firestore calls for groups live here.
//
// Data model:
//   groups/{groupId}                       { name, code, ownerId, ownerName, startDate,
//                                            endDate, createdAt }
//                                          The dates apply to every goal in the group.
//                                          Groups made before dates existed have none.
//   groups/{groupId}/members/{uid}         { name, role, code, joinedAt }
//   groups/{groupId}/goals/{goalId}        { title, description, frequency, createdAt, updatedAt }
//   groups/{groupId}/checkins/{goalId}_{date}_{uid}
//                                          { goalId, uid, name, date, note, completedAt }
//   groupCodes/{CODE}                      { groupId }   lets a code find its group
//   users/{uid}/groupMemberships/{groupId} { joinedAt }  lists "my groups"
//
// firestore.rules decides who may read and write each of these.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { formatDateKey, toDateKey } from '../utils/dates'
import { generateGroupCode, normaliseCode } from '../utils/groupCode'
import { ensureOnline } from '../utils/network'
import { getFirestoreErrorMessage } from './goalService'

function groupDoc(groupId) {
  return doc(db, 'groups', groupId)
}

function membersCollection(groupId) {
  return collection(db, 'groups', groupId, 'members')
}

function groupGoalsCollection(groupId) {
  return collection(db, 'groups', groupId, 'goals')
}

function checkinsCollection(groupId) {
  return collection(db, 'groups', groupId, 'checkins')
}

function codeDoc(code) {
  return doc(db, 'groupCodes', code)
}

function membershipsCollection(uid) {
  return collection(db, 'users', uid, 'groupMemberships')
}

// One check-in per goal, per date, per person: the ID makes duplicates impossible.
function checkinDoc(groupId, goalId, date, uid) {
  return doc(checkinsCollection(groupId), `${goalId}_${date}_${uid}`)
}

// The name other members see. Rules allow 1–50 characters.
export function memberName(user) {
  return (user.displayName || user.email.split('@')[0]).slice(0, 50)
}

function withId(snapshot) {
  return { id: snapshot.id, ...snapshot.data() }
}

// Groups made before dates existed start on the day they were created and never end.
function withGroupDates(group) {
  if (group.startDate) return group
  const created = group.createdAt ? group.createdAt.toDate() : new Date()
  return { ...group, startDate: toDateKey(created), endDate: null }
}

// An empty end date is saved as null.
function toGroupDates(values) {
  return { startDate: values.startDate, endDate: values.endDate || null }
}

function toGroupGoalFields(values) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    frequency: values.frequency,
  }
}

// An Error with a `code`, like the ones Firebase throws.
function codedError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

// Firestore allows at most 500 writes per batch.
const BATCH_LIMIT = 500

async function deleteInBatches(refs) {
  for (let start = 0; start < refs.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db)
    refs.slice(start, start + BATCH_LIMIT).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }
}

/* ---------- Groups ---------- */

// Creates the group, its code, the owner's membership, all in one batch:
// either everything is saved or nothing is.
// `values` is { name, startDate, endDate } from the create form.
export async function createGroup(user, values) {
  ensureOnline()

  // A new random code is tried if one is already taken (the rules reject it).
  const MAX_ATTEMPTS = 5
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const code = generateGroupCode()
    const groupRef = doc(collection(db, 'groups'))
    const batch = writeBatch(db)

    batch.set(groupRef, {
      name: values.name.trim(),
      code,
      ownerId: user.uid,
      ownerName: memberName(user),
      ...toGroupDates(values),
      createdAt: serverTimestamp(),
    })
    batch.set(codeDoc(code), { groupId: groupRef.id })
    batch.set(doc(membersCollection(groupRef.id), user.uid), {
      name: memberName(user),
      role: 'owner',
      code,
      joinedAt: serverTimestamp(),
    })
    batch.set(doc(membershipsCollection(user.uid), groupRef.id), { joinedAt: serverTimestamp() })

    try {
      await batch.commit()
      return groupRef.id
    } catch (error) {
      if (error.code !== 'permission-denied' || attempt === MAX_ATTEMPTS) throw error
    }
  }
  return null
}

// Returns { groupId, alreadyMember }.
export async function joinGroupByCode(user, rawCode) {
  ensureOnline()
  const code = normaliseCode(rawCode)

  // Anyone signed in may read a single code document, but never list them,
  // so you can only find a group if you know its code.
  const codeSnapshot = await getDoc(codeDoc(code))
  if (!codeSnapshot.exists()) {
    throw codedError('code-not-found', 'No group with that code.')
  }
  const { groupId } = codeSnapshot.data()

  const membership = await getDoc(doc(membershipsCollection(user.uid), groupId))
  if (membership.exists()) return { groupId, alreadyMember: true }

  const batch = writeBatch(db)
  // The rules check that `code` matches the group's code.
  batch.set(doc(membersCollection(groupId), user.uid), {
    name: memberName(user),
    role: 'member',
    code,
    joinedAt: serverTimestamp(),
  })
  batch.set(doc(membershipsCollection(user.uid), groupId), { joinedAt: serverTimestamp() })
  await batch.commit()
  return { groupId, alreadyMember: false }
}

// The groups the user belongs to, with member counts, sorted by name.
// Memberships of groups that were deleted (or that we were removed from)
// are cleaned up along the way.
export async function getMyGroups(uid) {
  const memberships = await getDocs(membershipsCollection(uid))

  const groups = await Promise.all(
    memberships.docs.map(async (membership) => {
      const groupId = membership.id
      try {
        const [groupSnapshot, membersSnapshot] = await Promise.all([
          getDoc(groupDoc(groupId)),
          getDocs(membersCollection(groupId)),
        ])
        if (!groupSnapshot.exists()) throw codedError('not-found', 'Group deleted.')
        return { ...withId(groupSnapshot), memberCount: membersSnapshot.size }
      } catch (error) {
        if (error.code === 'permission-denied' || error.code === 'not-found') {
          await deleteDoc(membership.ref).catch(() => {})
          return null
        }
        throw error
      }
    }),
  )

  return groups.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name))
}

// Everything the group page needs: the group, members, goals and the
// check-ins from `fromDateKey` onwards.
// Each goal is given the group's dates, so the stats helpers can treat group
// goals like personal ones. Check-ins are loaded from the group's start date
// (or `fromDateKey`, if earlier), so the page can show progress since the start.
export async function getGroupData(groupId, fromDateKey) {
  const groupSnapshot = await getDoc(groupDoc(groupId))
  if (!groupSnapshot.exists()) return null
  const group = withGroupDates(withId(groupSnapshot))
  const fromKey = group.startDate < fromDateKey ? group.startDate : fromDateKey

  const [membersSnapshot, goalsSnapshot, checkinsSnapshot] = await Promise.all([
    getDocs(query(membersCollection(groupId), orderBy('joinedAt', 'asc'))),
    getDocs(query(groupGoalsCollection(groupId), orderBy('createdAt', 'asc'))),
    getDocs(query(checkinsCollection(groupId), where('date', '>=', fromKey))),
  ])

  return {
    group,
    members: membersSnapshot.docs.map(withId),
    goals: goalsSnapshot.docs.map((snapshot) => withDates(withId(snapshot), group)),
    checkins: checkinsSnapshot.docs.map(withId),
  }
}

// For the dashboard: every goal in every group you're in, with the dates
// you checked in since `fromDateKey`. Only your own check-ins are kept.
// Returns [{ group, goal, doneDates: Set }]. Groups you can no longer open
// are skipped (the Groups page tidies those up).
export async function getMyGroupGoals(uid, fromDateKey) {
  const memberships = await getDocs(membershipsCollection(uid))

  const perGroup = await Promise.all(
    memberships.docs.map(async (membership) => {
      const groupId = membership.id
      try {
        const groupSnapshot = await getDoc(groupDoc(groupId))
        if (!groupSnapshot.exists()) return []
        const group = withGroupDates(withId(groupSnapshot))

        // A date-only filter needs no extra index; others' check-ins are dropped here.
        const [goalsSnapshot, checkinsSnapshot] = await Promise.all([
          getDocs(query(groupGoalsCollection(groupId), orderBy('createdAt', 'asc'))),
          getDocs(query(checkinsCollection(groupId), where('date', '>=', fromDateKey))),
        ])
        const myDates = new Map()
        for (const snapshot of checkinsSnapshot.docs) {
          const checkin = snapshot.data()
          if (checkin.uid !== uid) continue
          if (!myDates.has(checkin.goalId)) myDates.set(checkin.goalId, new Set())
          myDates.get(checkin.goalId).add(checkin.date)
        }

        return goalsSnapshot.docs.map((snapshot) => {
          const goal = withDates(withId(snapshot), group)
          return { group, goal, doneDates: myDates.get(goal.id) ?? new Set() }
        })
      } catch (error) {
        if (error.code === 'permission-denied') return []
        throw error
      }
    }),
  )

  return perGroup.flat()
}

// A goal with its group's start and end dates.
export function withDates(goal, group) {
  return { ...goal, startDate: group.startDate, endDate: group.endDate }
}

// Owner only. New dates may not leave anyone's check-in outside them, so the
// change is refused if they would.
export async function updateGroupDates(groupId, values) {
  ensureOnline()
  const dates = toGroupDates(values)

  const [before, after] = await Promise.all([
    getDocs(query(checkinsCollection(groupId), where('date', '<', dates.startDate))),
    dates.endDate ? getDocs(query(checkinsCollection(groupId), where('date', '>', dates.endDate))) : null,
  ])
  const outside = [...before.docs, ...(after?.docs ?? [])].map((snapshot) => snapshot.data().date).sort()
  if (outside.length > 0) {
    const span =
      outside.length === 1
        ? `on ${formatDateKey(outside[0])}`
        : `from ${formatDateKey(outside[0])} to ${formatDateKey(outside[outside.length - 1])}`
    throw codedError(
      'checkins-outside-dates',
      `${outside.length} check-in${outside.length === 1 ? '' : 's'} (${span}) would fall outside these dates. ` +
        'Widen the dates, or ask members to undo those check-ins.',
    )
  }

  await updateDoc(groupDoc(groupId), dates)
  return dates
}

// Members: removes your check-ins, then your membership.
export async function leaveGroup(groupId, uid) {
  ensureOnline()
  const myCheckins = await getDocs(query(checkinsCollection(groupId), where('uid', '==', uid)))
  await deleteInBatches(myCheckins.docs.map((checkin) => checkin.ref))

  const batch = writeBatch(db)
  batch.delete(doc(membersCollection(groupId), uid))
  batch.delete(doc(membershipsCollection(uid), groupId))
  await batch.commit()
}

// Owner only: removes everything in the group, then the group itself.
// Firestore does not delete subcollections automatically.
export async function deleteGroup(group, uid) {
  ensureOnline()
  const [checkins, goals, members] = await Promise.all([
    getDocs(checkinsCollection(group.id)),
    getDocs(groupGoalsCollection(group.id)),
    getDocs(membersCollection(group.id)),
  ])
  await deleteInBatches([
    ...checkins.docs.map((snapshot) => snapshot.ref),
    ...goals.docs.map((snapshot) => snapshot.ref),
    ...members.docs.filter((snapshot) => snapshot.id !== uid).map((snapshot) => snapshot.ref),
  ])

  const batch = writeBatch(db)
  batch.delete(codeDoc(group.code))
  batch.delete(doc(membersCollection(group.id), uid))
  batch.delete(groupDoc(group.id))
  batch.delete(doc(membershipsCollection(uid), group.id))
  await batch.commit()
}

/* ---------- Group goals (owner manages them) ---------- */

export async function addGroupGoal(groupId, values) {
  ensureOnline()
  const fields = toGroupGoalFields(values)
  const ref = await addDoc(groupGoalsCollection(groupId), {
    ...fields,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return { id: ref.id, ...fields }
}

// createdAt is never sent, so it can't change.
export async function updateGroupGoal(groupId, goalId, values) {
  ensureOnline()
  const fields = toGroupGoalFields(values)
  await updateDoc(doc(groupGoalsCollection(groupId), goalId), { ...fields, updatedAt: serverTimestamp() })
  return fields
}

export async function deleteGroupGoal(groupId, goalId) {
  ensureOnline()
  const goalCheckins = await getDocs(query(checkinsCollection(groupId), where('goalId', '==', goalId)))
  await deleteInBatches(goalCheckins.docs.map((checkin) => checkin.ref))
  await deleteDoc(doc(groupGoalsCollection(groupId), goalId))
}

/* ---------- Check-ins (each member's status) ---------- */

// `member` is { id, name } from the group's members: yourself, or, for the
// owner filling in past days, another member.
export async function checkIn(groupId, goalId, date, member, note) {
  ensureOnline()
  const checkin = { goalId, uid: member.id, name: member.name, date, note: note.trim() }
  await setDoc(checkinDoc(groupId, goalId, date, member.id), { ...checkin, completedAt: serverTimestamp() })
  return { id: `${goalId}_${date}_${member.id}`, ...checkin }
}

// Your own note, or a member's when the owner fills in for them.
export async function updateCheckInNote(groupId, goalId, date, uid, note) {
  ensureOnline()
  await updateDoc(checkinDoc(groupId, goalId, date, uid), { note: note.trim() })
}

export async function undoCheckIn(groupId, goalId, date, uid) {
  ensureOnline()
  await deleteDoc(checkinDoc(groupId, goalId, date, uid))
}

export function getGroupErrorMessage(error) {
  if (error?.code === 'code-not-found') {
    return 'No group found with that code. Check it and try again.'
  }
  if (error?.code === 'checkins-outside-dates') {
    return error.message
  }
  return getFirestoreErrorMessage(error)
}
