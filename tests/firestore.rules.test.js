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
  where,
  writeBatch,
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

describe('groups', () => {
  const CODE = 'K7MP2Q'

  // A group owned by alice, with one shared goal. Rules are off while seeding.
  async function seedGroup() {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore()
      await setDoc(doc(firestore, 'groups/grp'), {
        name: 'Runners',
        code: CODE,
        ownerId: 'alice',
        ownerName: 'Alice',
        createdAt: serverTimestamp(),
      })
      await setDoc(doc(firestore, `groupCodes/${CODE}`), { groupId: 'grp' })
      await setDoc(doc(firestore, 'groups/grp/members/alice'), {
        name: 'Alice',
        role: 'owner',
        code: CODE,
        joinedAt: serverTimestamp(),
      })
      await setDoc(doc(firestore, 'groups/grp/goals/run'), {
        title: 'Run 30 minutes',
        description: '',
        frequency: 'daily',
        createdAt: serverTimestamp(),
      })
    })
  }

  function member(code = CODE, role = 'member') {
    return { name: 'Bob', role, code, joinedAt: serverTimestamp() }
  }

  async function bobJoins() {
    await setDoc(doc(db('bob'), 'groups/grp/members/bob'), member())
  }

  function checkin(uid, date = '2026-10-28', note = '') {
    return { goalId: 'run', uid, name: uid, date, note, completedAt: serverTimestamp() }
  }

  test('owner creates a group, its code and their membership in one batch', async () => {
    const firestore = db('alice')
    const batch = writeBatch(firestore)
    batch.set(doc(firestore, 'groups/new'), {
      name: 'Readers',
      code: 'ABCD23',
      ownerId: 'alice',
      ownerName: 'Alice',
      createdAt: serverTimestamp(),
    })
    batch.set(doc(firestore, 'groupCodes/ABCD23'), { groupId: 'new' })
    batch.set(doc(firestore, 'groups/new/members/alice'), member('ABCD23', 'owner'))
    batch.set(doc(firestore, 'users/alice/groupMemberships/new'), { joinedAt: serverTimestamp() })
    await assertSucceeds(batch.commit())
  })

  test('cannot create a group for someone else or with a bad code', async () => {
    const group = { name: 'X', code: 'ABCD23', ownerId: 'bob', ownerName: 'Bob', createdAt: serverTimestamp() }
    await assertFails(setDoc(doc(db('alice'), 'groups/g2'), group))
    await assertFails(setDoc(doc(db('alice'), 'groups/g3'), { ...group, ownerId: 'alice', code: 'abc' }))
  })

  test('a code that is already taken cannot be overwritten', async () => {
    await seedGroup()
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'groups/bobs'), {
        name: 'Bob group',
        code: CODE,
        ownerId: 'bob',
        ownerName: 'Bob',
        createdAt: serverTimestamp(),
      })
    })
    await assertFails(setDoc(doc(db('bob'), `groupCodes/${CODE}`), { groupId: 'bobs' }))
  })

  test('signed-in users can read one code but not list codes', async () => {
    await seedGroup()
    await assertSucceeds(getDoc(doc(db('bob'), `groupCodes/${CODE}`)))
    await assertFails(getDocs(collection(db('bob'), 'groupCodes')))
    await assertFails(getDoc(doc(signedOutDb(), `groupCodes/${CODE}`)))
  })

  test('non-members cannot read the group or its data', async () => {
    await seedGroup()
    await assertFails(getDoc(doc(db('bob'), 'groups/grp')))
    await assertFails(getDocs(collection(db('bob'), 'groups/grp/members')))
    await assertFails(getDocs(collection(db('bob'), 'groups/grp/goals')))
    await assertFails(getDocs(collection(db('bob'), 'groups/grp/checkins')))
  })

  test('joining needs the right code, and only as yourself', async () => {
    await seedGroup()
    await assertFails(setDoc(doc(db('bob'), 'groups/grp/members/bob'), member('WRONG2')))
    await assertFails(setDoc(doc(db('bob'), 'groups/grp/members/bob'), member(CODE, 'owner')))
    await assertFails(setDoc(doc(db('bob'), 'groups/grp/members/carol'), member()))
    await assertSucceeds(setDoc(doc(db('bob'), 'groups/grp/members/bob'), member()))
    await assertSucceeds(getDoc(doc(db('bob'), 'groups/grp')))
  })

  test('only the owner adds and deletes group goals', async () => {
    await seedGroup()
    await bobJoins()
    const goal = { title: 'Read', description: '', frequency: 'weekly', createdAt: serverTimestamp() }
    await assertFails(addDoc(collection(db('bob'), 'groups/grp/goals'), goal))
    await assertFails(deleteDoc(doc(db('bob'), 'groups/grp/goals/run')))
    await assertSucceeds(addDoc(collection(db('alice'), 'groups/grp/goals'), goal))
    await assertFails(addDoc(collection(db('alice'), 'groups/grp/goals'), { ...goal, frequency: 'hourly' }))
  })

  test('members check in as themselves, once per goal and date', async () => {
    await seedGroup()
    await bobJoins()
    const bobDb = db('bob')
    const mine = doc(bobDb, 'groups/grp/checkins/run_2026-10-28_bob')
    await assertSucceeds(setDoc(mine, checkin('bob', '2026-10-28', '5k done')))
    await assertFails(setDoc(mine, checkin('bob', '2026-10-28')))
    await assertFails(setDoc(doc(bobDb, 'groups/grp/checkins/run_2026-10-28_alice'), checkin('alice')))
    await assertFails(setDoc(doc(bobDb, 'groups/grp/checkins/x_2026-10-28_bob'), checkin('bob')))
    await assertFails(
      setDoc(doc(bobDb, 'groups/grp/checkins/run_2026-10-29_bob'), checkin('bob', '2026-10-29', 'x'.repeat(141))),
    )
    // Everyone in the group can see it.
    await assertSucceeds(getDocs(query(collection(db('alice'), 'groups/grp/checkins'), where('date', '>=', '2026-10-26'))))
  })

  test('only the author edits the note, and only the note', async () => {
    await seedGroup()
    await bobJoins()
    await setDoc(doc(db('bob'), 'groups/grp/checkins/run_2026-10-28_bob'), checkin('bob'))
    await assertSucceeds(updateDoc(doc(db('bob'), 'groups/grp/checkins/run_2026-10-28_bob'), { note: 'Felt great' }))
    await assertFails(updateDoc(doc(db('bob'), 'groups/grp/checkins/run_2026-10-28_bob'), { date: '2026-10-01' }))
    await assertFails(updateDoc(doc(db('alice'), 'groups/grp/checkins/run_2026-10-28_bob'), { note: 'Edited' }))
  })

  test('members can leave; the owner can delete the group', async () => {
    await seedGroup()
    await bobJoins()
    await setDoc(doc(db('bob'), 'groups/grp/checkins/run_2026-10-28_bob'), checkin('bob'))

    // Bob can't remove Alice or delete the group.
    await assertFails(deleteDoc(doc(db('bob'), 'groups/grp/members/alice')))
    await assertFails(deleteDoc(doc(db('bob'), 'groups/grp')))
    await assertFails(deleteDoc(doc(db('bob'), `groupCodes/${CODE}`)))

    // Bob leaves: his check-ins, then his membership.
    await assertSucceeds(deleteDoc(doc(db('bob'), 'groups/grp/checkins/run_2026-10-28_bob')))
    await assertSucceeds(deleteDoc(doc(db('bob'), 'groups/grp/members/bob')))
    await assertFails(getDoc(doc(db('bob'), 'groups/grp')))

    // Alice deletes the group: the code, her membership and the group in one batch.
    const aliceDb = db('alice')
    await assertSucceeds(deleteDoc(doc(aliceDb, 'groups/grp/goals/run')))
    const batch = writeBatch(aliceDb)
    batch.delete(doc(aliceDb, `groupCodes/${CODE}`))
    batch.delete(doc(aliceDb, 'groups/grp/members/alice'))
    batch.delete(doc(aliceDb, 'groups/grp'))
    await assertSucceeds(batch.commit())
  })

  test('group memberships list is private to its owner', async () => {
    await assertSucceeds(setDoc(doc(db('bob'), 'users/bob/groupMemberships/grp'), { joinedAt: serverTimestamp() }))
    await assertFails(getDocs(collection(db('alice'), 'users/bob/groupMemberships')))
    await assertFails(setDoc(doc(db('alice'), 'users/bob/groupMemberships/x'), { joinedAt: serverTimestamp() }))
  })
})
