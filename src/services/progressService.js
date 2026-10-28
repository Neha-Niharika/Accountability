// All Firestore calls for daily progress live here.
//
// Data model: users/{uid}/goals/{goalId}/progress/{YYYY-MM-DD}  { date, completedAt }
// The document existing means "done on that date". Because the date IS the
// document ID, there can never be two records for the same goal and date.
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { ensureOnline } from '../utils/network'

function progressCollection(uid, goalId) {
  return collection(db, 'users', uid, 'goals', goalId, 'progress')
}

// Mark done. The rules only allow creating, so a second mark for the same date is rejected.
export async function markGoalDone(uid, goalId, dateKey) {
  ensureOnline()
  await setDoc(doc(progressCollection(uid, goalId), dateKey), {
    date: dateKey,
    completedAt: serverTimestamp(),
  })
}

// Undo: deleting the record means "not done" again.
export async function undoGoalDone(uid, goalId, dateKey) {
  ensureOnline()
  await deleteDoc(doc(progressCollection(uid, goalId), dateKey))
}

// Full history for one goal: date keys, newest first.
export async function getProgressDates(uid, goalId) {
  const snapshot = await getDocs(query(progressCollection(uid, goalId), orderBy('date', 'desc')))
  return snapshot.docs.map((progressDoc) => progressDoc.id)
}

// Date keys from `fromDateKey` to `toDateKey`, inclusive (used by the dashboard views).
// Both filters are on the same field, so no extra Firestore index is needed.
export async function getProgressDatesBetween(uid, goalId, fromDateKey, toDateKey) {
  const snapshot = await getDocs(
    query(
      progressCollection(uid, goalId),
      where('date', '>=', fromDateKey),
      where('date', '<=', toDateKey),
    ),
  )
  return snapshot.docs.map((progressDoc) => progressDoc.id)
}

// Firestore allows at most 500 writes per batch.
const BATCH_LIMIT = 500

// Deletes every progress record of a goal. Firestore does not delete
// subcollections when their parent document is deleted, so we do it ourselves.
export async function deleteAllProgress(uid, goalId) {
  const snapshot = await getDocs(progressCollection(uid, goalId))
  const refs = snapshot.docs.map((progressDoc) => progressDoc.ref)

  for (let start = 0; start < refs.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db)
    refs.slice(start, start + BATCH_LIMIT).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }
}
