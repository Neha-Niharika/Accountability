// One-off: adds past check-ins to a group, the same shape the app writes.
//
// Uses the Firebase Admin SDK, which skips the security rules, so run it only
// on data you have checked. It never deletes anything and skips check-ins
// that already exist.
//
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
//     node scripts/backfill-group-checkins.mjs --group <groupId> --data <file.json>          # dry run
//   ...same command... --apply                                                             # writes
//
// The data file (keep it out of git, it holds member names):
//   {
//     "startDate": "2026-10-20",        // optional: moves the group start earlier
//     "checkins": [ { "date": "2026-10-21", "goal": "Drink water", "member": "Alex" } ]
//   }
// "goal" matches a goal title and "member" a member name (case-insensitive).
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const { values: args } = parseArgs({
  options: {
    group: { type: 'string' },
    data: { type: 'string' },
    project: { type: 'string', default: 'accountability-350ef' },
    apply: { type: 'boolean', default: false },
  },
})
if (!args.group || !args.data) {
  console.error('Usage: node scripts/backfill-group-checkins.mjs --group <groupId> --data <file.json> [--apply]')
  process.exit(1)
}

const input = JSON.parse(readFileSync(args.data, 'utf8'))
initializeApp({ credential: applicationDefault(), projectId: args.project })
const db = getFirestore()
const groupRef = db.doc(`groups/${args.group}`)

function toDateKey(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function findByName(items, field, wanted) {
  const matches = items.filter((item) => item[field].trim().toLowerCase() === wanted.trim().toLowerCase())
  return matches.length === 1 ? matches[0] : null
}

const groupSnapshot = await groupRef.get()
if (!groupSnapshot.exists) throw new Error(`No group with id ${args.group} in project ${args.project}.`)
const group = groupSnapshot.data()
const [membersSnapshot, goalsSnapshot] = await Promise.all([
  groupRef.collection('members').get(),
  groupRef.collection('goals').get(),
])
const members = membersSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
const goals = goalsSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))

console.log(`Group: ${group.name} (${args.project})`)
console.log(`Members: ${members.map((member) => member.name).join(', ')}`)
console.log(`Goals: ${goals.map((goal) => goal.title).join(', ')}\n`)

// The group's dates, as the app reads them (groups made before dates start on their creation day).
const currentStart = group.startDate ?? toDateKey(group.createdAt.toDate())
const endDate = group.endDate ?? null
let startDate = currentStart
const problems = []

if (input.startDate) {
  if (!DATE_KEY_PATTERN.test(input.startDate)) problems.push(`startDate "${input.startDate}" is not YYYY-MM-DD.`)
  else if (input.startDate > currentStart) problems.push('startDate can only move the group start earlier here.')
  else startDate = input.startDate
}

const writes = []
for (const row of input.checkins) {
  const goal = findByName(goals, 'title', row.goal)
  const member = findByName(members, 'name', row.member)
  if (!DATE_KEY_PATTERN.test(row.date)) problems.push(`Bad date "${row.date}".`)
  if (!goal) problems.push(`No single goal titled "${row.goal}".`)
  if (!member) problems.push(`No single member named "${row.member}" (they must have joined the group).`)
  if (!goal || !member || !DATE_KEY_PATTERN.test(row.date)) continue
  if (row.date < startDate || (endDate && row.date > endDate)) {
    problems.push(`${row.date} is outside the group dates (${startDate} – ${endDate ?? 'no end'}).`)
    continue
  }
  writes.push({ id: `${goal.id}_${row.date}_${member.id}`, goal, member, date: row.date })
}

if (problems.length > 0) {
  console.error('Nothing written. Fix these first:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

const existing = await Promise.all(writes.map((write) => groupRef.collection('checkins').doc(write.id).get()))
const toCreate = writes.filter((_, index) => !existing[index].exists)

if (startDate !== currentStart || !group.startDate) {
  console.log(`Group start date: ${group.startDate ?? `(none, reads as ${currentStart})`} → ${startDate}`)
}
for (const write of writes) {
  const skip = !toCreate.includes(write)
  console.log(`${skip ? 'skip (exists)' : 'add          '}  ${write.date}  ${write.goal.title}  —  ${write.member.name}`)
}
console.log(`\n${toCreate.length} check-in(s) to add, ${writes.length - toCreate.length} already there.`)

if (!args.apply) {
  console.log('Dry run: nothing written. Add --apply to write.')
  process.exit(0)
}

const batch = db.batch()
if (startDate !== group.startDate) batch.update(groupRef, { startDate, endDate })
for (const write of toCreate) {
  batch.create(groupRef.collection('checkins').doc(write.id), {
    goalId: write.goal.id,
    uid: write.member.id,
    name: write.member.name,
    date: write.date,
    note: '',
    completedAt: FieldValue.serverTimestamp(),
  })
}
await batch.commit()
console.log('Written.')
