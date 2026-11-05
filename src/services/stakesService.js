// All Firestore calls for rewards and punishments ("stakes") live here.
//
// Data model, the same for you and for a group:
//   users/{uid}/stakes/settings              { reward, punishment, rewardEvery, since, updatedAt }
//   users/{uid}/stakeClaims/{kind}_{date}    { kind, date, label, doneAt }
//   groups/{groupId}/stakes/settings         (as above; only the owner sets it)
//   groups/{groupId}/stakeClaims/{uid}_{kind}_{date}
//                                            { uid, kind, date, label, doneAt }
//
// Which rewards are earned and punishments owed is worked out from the streak
// (see streakStats in utils/stats.js), so only the settings and the claims are
// saved. A claim existing means "reward claimed" or "punishment done".
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import { ensureOnline } from '../utils/network'

// `owner` is { uid } for your own stakes, or { groupId } for a group's.
function basePath(owner) {
  return owner.groupId ? ['groups', owner.groupId] : ['users', owner.uid]
}

function settingsDoc(owner) {
  return doc(db, ...basePath(owner), 'stakes', 'settings')
}

function claimsCollection(owner) {
  return collection(db, ...basePath(owner), 'stakeClaims')
}

// The claim's document id. Group claims start with the member's uid.
export function claimId(kind, date, uid = null) {
  return uid ? `${uid}_${kind}_${date}` : `${kind}_${date}`
}

// Returns { stakes, claims }: stakes is null when none are set.
export async function getStakes(owner) {
  const [settingsSnapshot, claimsSnapshot] = await Promise.all([
    getDoc(settingsDoc(owner)),
    getDocs(claimsCollection(owner)),
  ])
  return {
    stakes: settingsSnapshot.exists() ? settingsSnapshot.data() : null,
    claims: claimsSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() })),
  }
}

// `values` is { reward, punishment, rewardEvery } from the form. `since` stays
// the day the stakes were first set, so editing them keeps earlier events.
// Clearing both reward and punishment removes the stakes.
export async function saveStakes(owner, values, previous, todayKey) {
  ensureOnline()
  const reward = values.reward.trim()
  const punishment = values.punishment.trim()
  if (!reward && !punishment) {
    await deleteDoc(settingsDoc(owner))
    return null
  }
  const stakes = { reward, punishment, rewardEvery: Number(values.rewardEvery), since: previous?.since ?? todayKey }
  await setDoc(settingsDoc(owner), { ...stakes, updatedAt: serverTimestamp() })
  return stakes
}

// Mark a reward claimed or a punishment done. `uid` is set for group claims.
export async function addClaim(owner, { kind, date, label, uid = null }) {
  ensureOnline()
  const claim = { ...(uid && { uid }), kind, date, label }
  const id = claimId(kind, date, uid)
  await setDoc(doc(claimsCollection(owner), id), { ...claim, doneAt: serverTimestamp() })
  return { id, ...claim }
}

export async function removeClaim(owner, id) {
  ensureOnline()
  await deleteDoc(doc(claimsCollection(owner), id))
}

// For tidying up a group: every claim in it, or one member's when they leave.
// Firestore does not delete subcollections automatically. Null when the rules
// don't cover rewards yet, so leaving or deleting a group still works.
export async function getGroupClaimRefs(groupId, uid = null) {
  const claims = claimsCollection({ groupId })
  try {
    const snapshot = await getDocs(uid ? query(claims, where('uid', '==', uid)) : claims)
    return snapshot.docs.map((claim) => claim.ref)
  } catch (error) {
    if (error.code === 'permission-denied') return null
    throw error
  }
}

export function groupStakesRef(groupId) {
  return settingsDoc({ groupId })
}
