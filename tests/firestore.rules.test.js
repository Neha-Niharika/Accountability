// Firestore Security Rules tests. They run against the local Firestore
// emulator, never the real database. Run with: npm run test:rules
//
// Each test acts as a signed-in user ("alice" or "bob") or a signed-out
// visitor, and checks the rules allow (assertSucceeds) or block (assertFails).
import { readFileSync } from 'node:fs'
import { after, before, beforeEach, describe, test } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
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
} from 'firebase/firestore'

let testEnv

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-accountability',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

after(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

function db(uid) {
  return testEnv.authenticatedContext(uid, { email: `${uid}@example.com` }).firestore()
}

function signedOutDb() {
  return testEnv.unauthenticatedContext().firestore()
}

function validGoal(overrides = {}) {
  return {
    title: 'Run 5k',
    description: '',
    category: 'Fitness',
    frequency: 'daily',
    startDate: '2026-10-01',
    endDate: null,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  }
}

// Creates a goal for alice with rules switched off, so tests can start from known data.
async function seedGoal(goalId, overrides = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), `users/alice/goals/${goalId}`), validGoal(overrides))
  })
}

function progressDoc(firestore, goalId, date) {
  return doc(firestore, `users/alice/goals/${goalId}/progress/${date}`)
}

function progress(date) {
  return { date, completedAt: serverTimestamp() }
}

describe('user profile', () => {
  test('owner can create a valid profile', async () => {
    await assertSucceeds(
      setDoc(doc(db('alice'), 'users/alice'), {
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: serverTimestamp(),
      }),
    )
  })

  test('cannot save an email different from the signed-in one', async () => {
    await assertFails(
      setDoc(doc(db('alice'), 'users/alice'), {
        name: 'Alice',
        email: 'someone@else.com',
        createdAt: serverTimestamp(),
      }),
    )
  })

  test('cannot add extra fields such as isAdmin', async () => {
    await assertFails(
      setDoc(doc(db('alice'), 'users/alice'), {
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: serverTimestamp(),
        isAdmin: true,
      }),
    )
  })

  test('another user cannot read the profile', async () => {
    await assertFails(getDoc(doc(db('bob'), 'users/alice')))
  })

  test('signed-out visitors cannot read anything', async () => {
    await assertFails(getDoc(doc(signedOutDb(), 'users/alice')))
  })
})

describe('goals', () => {
  test('owner can create a valid goal', async () => {
    await assertSucceeds(addDoc(collection(db('alice'), 'users/alice/goals'), validGoal()))
  })

  test('owner can list goals newest first', async () => {
    await seedGoal('g1')
    await assertSucceeds(
      getDocs(query(collection(db('alice'), 'users/alice/goals'), orderBy('createdAt', 'desc'))),
    )
  })

  test('another user cannot read, edit or delete the goal', async () => {
    await seedGoal('g1')
    const bobGoal = doc(db('bob'), 'users/alice/goals/g1')
    await assertFails(getDoc(bobGoal))
    await assertFails(updateDoc(bobGoal, { title: 'Hacked', updatedAt: serverTimestamp() }))
    await assertFails(deleteDoc(bobGoal))
  })

  test('another user cannot create goals under your account', async () => {
    await assertFails(addDoc(collection(db('bob'), 'users/alice/goals'), validGoal()))
  })

  test('rejects invalid goals', async () => {
    const goals = collection(db('alice'), 'users/alice/goals')
    await assertFails(addDoc(goals, validGoal({ title: '' })))
    await assertFails(addDoc(goals, validGoal({ title: 'x'.repeat(101) })))
    await assertFails(addDoc(goals, validGoal({ category: 'Gaming' })))
    await assertFails(addDoc(goals, validGoal({ frequency: 'monthly' })))
    await assertFails(addDoc(goals, validGoal({ status: 'archived' })))
    await assertFails(addDoc(goals, validGoal({ startDate: 'tomorrow' })))
    await assertFails(addDoc(goals, validGoal({ endDate: '2026-09-01' })))
    await assertFails(addDoc(goals, validGoal({ isAdmin: true })))
  })

  test('createdAt must be the server time', async () => {
    await assertFails(
      addDoc(collection(db('alice'), 'users/alice/goals'), validGoal({ createdAt: new Date('2020-01-01') })),
    )
  })

  test('owner can update fields and status', async () => {
    await seedGoal('g1')
    const goal = doc(db('alice'), 'users/alice/goals/g1')
    await assertSucceeds(updateDoc(goal, { title: 'Run 10k', updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(goal, { status: 'completed', updatedAt: serverTimestamp() }))
  })

  test('createdAt cannot be changed', async () => {
    await seedGoal('g1')
    await assertFails(
      updateDoc(doc(db('alice'), 'users/alice/goals/g1'), {
        createdAt: new Date('2020-01-01'),
        updatedAt: serverTimestamp(),
      }),
    )
  })

  test('owner can delete a goal', async () => {
    await seedGoal('g1')
    await assertSucceeds(deleteDoc(doc(db('alice'), 'users/alice/goals/g1')))
  })
})

describe('progress', () => {
  test('owner can mark a goal done and undo it', async () => {
    await seedGoal('g1')
    const record = progressDoc(db('alice'), 'g1', '2026-10-28')
    await assertSucceeds(setDoc(record, progress('2026-10-28')))
    await assertSucceeds(deleteDoc(record))
  })

  test('the same date cannot be recorded twice', async () => {
    await seedGoal('g1')
    const record = progressDoc(db('alice'), 'g1', '2026-10-28')
    await assertSucceeds(setDoc(record, progress('2026-10-28')))
    await assertFails(setDoc(record, progress('2026-10-28')))
  })

  test('document ID must be a date that matches the date field', async () => {
    await seedGoal('g1')
    await assertFails(setDoc(progressDoc(db('alice'), 'g1', 'yesterday'), progress('yesterday')))
    await assertFails(setDoc(progressDoc(db('alice'), 'g1', '2026-10-28'), progress('2026-10-27')))
  })

  test('cannot add extra fields', async () => {
    await seedGoal('g1')
    await assertFails(
      setDoc(progressDoc(db('alice'), 'g1', '2026-10-28'), { ...progress('2026-10-28'), note: 'x' }),
    )
  })

  test('cannot log progress for a goal that does not exist', async () => {
    await assertFails(setDoc(progressDoc(db('alice'), 'missing', '2026-10-28'), progress('2026-10-28')))
  })

  test('cannot log progress for a completed goal', async () => {
    await seedGoal('g1', { status: 'completed' })
    await assertFails(setDoc(progressDoc(db('alice'), 'g1', '2026-10-28'), progress('2026-10-28')))
  })

  test('cannot log progress outside the goal dates', async () => {
    await seedGoal('g1', { startDate: '2026-10-10', endDate: '2026-10-20' })
    await assertFails(setDoc(progressDoc(db('alice'), 'g1', '2026-10-09'), progress('2026-10-09')))
    await assertFails(setDoc(progressDoc(db('alice'), 'g1', '2026-10-21'), progress('2026-10-21')))
    await assertSucceeds(setDoc(progressDoc(db('alice'), 'g1', '2026-10-20'), progress('2026-10-20')))
  })

  test('another user cannot read or write progress', async () => {
    await seedGoal('g1')
    await assertFails(getDocs(collection(db('bob'), 'users/alice/goals/g1/progress')))
    await assertFails(setDoc(progressDoc(db('bob'), 'g1', '2026-10-28'), progress('2026-10-28')))
  })
})
