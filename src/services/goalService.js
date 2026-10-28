// All Firestore calls for goals live here, so pages never talk to Firestore directly.
//
// Data model: users/{uid}/goals/{goalId}
//   { title, description, category, frequency, startDate, endDate, status, createdAt, updatedAt }
// The goal's `id` is the document ID, so it is not stored as a field.
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
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { ensureOnline } from '../utils/network'
import { deleteAllProgress } from './progressService'

function goalsCollection(uid) {
  return collection(db, 'users', uid, 'goals')
}

function goalDoc(uid, goalId) {
  return doc(db, 'users', uid, 'goals', goalId)
}

// The fields a user can edit, cleaned up: strings trimmed, empty end date stored as null.
function toGoalFields(values) {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category,
    frequency: values.frequency,
    startDate: values.startDate,
    endDate: values.endDate || null,
    status: values.status,
  }
}

// Firestore document → plain object for React. Timestamps become JS Dates.
function fromSnapshot(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    ...data,
    createdAt: data.createdAt?.toDate() ?? null,
    updatedAt: data.updatedAt?.toDate() ?? null,
  }
}

// Read: all of the user's goals, newest first.
export async function getGoals(uid) {
  const snapshot = await getDocs(query(goalsCollection(uid), orderBy('createdAt', 'desc')))
  return snapshot.docs.map(fromSnapshot)
}

// Read: one goal, or null if it doesn't exist.
export async function getGoal(uid, goalId) {
  const snapshot = await getDoc(goalDoc(uid, goalId))
  return snapshot.exists() ? fromSnapshot(snapshot) : null
}

// Create: returns the new goal's id. Firestore generates the id.
export async function createGoal(uid, values) {
  ensureOnline()
  const ref = await addDoc(goalsCollection(uid), {
    ...toGoalFields(values),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

// Update: createdAt is never sent, so it can't change.
export async function updateGoal(uid, goalId, values) {
  ensureOnline()
  await updateDoc(goalDoc(uid, goalId), {
    ...toGoalFields(values),
    updatedAt: serverTimestamp(),
  })
}

export async function setGoalStatus(uid, goalId, status) {
  ensureOnline()
  await updateDoc(goalDoc(uid, goalId), { status, updatedAt: serverTimestamp() })
}

// Delete: progress records first, then the goal. If it fails part-way,
// the goal still exists and the user can simply try again.
export async function deleteGoal(uid, goalId) {
  ensureOnline()
  await deleteAllProgress(uid, goalId)
  await deleteDoc(goalDoc(uid, goalId))
}

export function getFirestoreErrorMessage(error) {
  switch (error?.code) {
    case 'permission-denied':
      return 'You don’t have permission to do that. Try signing in again, and check the Firestore rules are published.'
    case 'unauthenticated':
      return 'Your session has expired. Please sign in again.'
    case 'unavailable':
      return 'You’re offline or the connection failed. Check your internet and try again.'
    case 'not-found':
      return 'This goal no longer exists.'
    default:
      return 'Something went wrong. Please try again.'
  }
}
