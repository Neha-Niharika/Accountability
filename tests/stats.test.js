// Unit tests for the week/month statistics. No emulator needed: npm test
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { addDays, dateKeysBetween, endOfMonth, startOfWeek, toDateKey } from '../src/utils/dates.js'
import { dayCompletion, isGoalInRange, periodStats, shadeLevel, sinceStartStats, stakeEvents, streakStats } from '../src/utils/stats.js'

function goal(overrides = {}) {
  return { id: 'g1', frequency: 'daily', startDate: '2026-10-01', endDate: null, status: 'active', ...overrides }
}

describe('dates', () => {
  test('weeks start on Monday', () => {
    assert.equal(toDateKey(startOfWeek(new Date(2026, 9, 28))), '2026-10-26') // Wednesday
    assert.equal(toDateKey(startOfWeek(new Date(2026, 10, 1))), '2026-10-26') // Sunday
    assert.equal(toDateKey(startOfWeek(new Date(2026, 9, 26))), '2026-10-26') // Monday
  })

  test('month end and day ranges', () => {
    assert.equal(toDateKey(endOfMonth(new Date(2028, 1, 10))), '2028-02-29') // leap year
    assert.deepEqual(dateKeysBetween('2026-10-30', '2026-11-02'), [
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ])
    assert.equal(toDateKey(addDays(new Date(2026, 11, 31), 1)), '2027-01-01')
  })
})

describe('periodStats', () => {
  test('daily goal counts only days up to today', () => {
    const done = new Set(['2026-10-26', '2026-10-28'])
    // Week Mon 26 – Sun 1, today is Wed 28 → 3 due days, 2 done.
    assert.deepEqual(periodStats(goal(), done, '2026-10-26', '2026-11-01', '2026-10-28'), { due: 3, done: 2 })
  })

  test('daily goal respects its own start and end dates', () => {
    const g = goal({ startDate: '2026-10-27', endDate: '2026-10-29' })
    assert.deepEqual(periodStats(g, new Set(), '2026-10-26', '2026-11-01', '2026-11-01'), { due: 3, done: 0 })
  })

  test('goal not started yet has nothing due', () => {
    const g = goal({ startDate: '2026-12-01' })
    assert.deepEqual(periodStats(g, new Set(), '2026-10-26', '2026-11-01', '2026-10-28'), { due: 0, done: 0 })
  })

  test('weekly goal: one per week, done on any day of that week', () => {
    const g = goal({ frequency: 'weekly' })
    // October 2026 touches weeks starting Sep 28, Oct 5, 12, 19, 26 → 5 weeks.
    // Done in the week of Oct 5 and, via Nov 1, the week of Oct 26.
    const done = new Set(['2026-10-07', '2026-11-01'])
    assert.deepEqual(periodStats(g, done, '2026-10-01', '2026-10-31', '2026-11-15'), { due: 5, done: 2 })
  })
})

describe('isGoalInRange and dayCompletion', () => {
  test('range overlap', () => {
    assert.equal(isGoalInRange(goal({ endDate: '2026-10-25' }), '2026-10-26', '2026-11-01'), false)
    assert.equal(isGoalInRange(goal({ startDate: '2026-11-01' }), '2026-10-26', '2026-11-01'), true)
  })

  test('heatmap counts daily goals only', () => {
    const goals = [goal({ id: 'a' }), goal({ id: 'b' }), goal({ id: 'w', frequency: 'weekly' })]
    const doneDatesByGoal = new Map([['a', new Set(['2026-10-28'])]])
    assert.deepEqual(dayCompletion(goals, doneDatesByGoal, '2026-10-28'), { due: 2, done: 1 })
  })
})

describe('shadeLevel and sinceStartStats', () => {
  test('shade goes from none to all done', () => {
    assert.equal(shadeLevel({ due: 4, done: 0 }), 0)
    assert.equal(shadeLevel({ due: 4, done: 1 }), 1)
    assert.equal(shadeLevel({ due: 4, done: 2 }), 2)
    assert.equal(shadeLevel({ due: 4, done: 4 }), 3)
  })

  test('counts every goal from its own start date to today', () => {
    // Today is Wed 28 Oct. Daily from Mon 26 → 3 due. Weekly from Oct 19 → 2 weeks.
    // A daily goal that starts tomorrow adds nothing.
    const goals = [
      goal({ id: 'd', startDate: '2026-10-26' }),
      goal({ id: 'w', frequency: 'weekly', startDate: '2026-10-19' }),
      goal({ id: 'later', startDate: '2026-10-29' }),
    ]
    const doneDatesByGoal = new Map([
      ['d', new Set(['2026-10-26', '2026-10-28'])],
      ['w', new Set(['2026-10-20'])],
    ])
    assert.deepEqual(sinceStartStats(goals, doneDatesByGoal, '2026-10-28'), { due: 5, done: 3 })
  })

  test('nothing due gives zeros', () => {
    assert.deepEqual(sinceStartStats([], new Map(), '2026-10-28'), { due: 0, done: 0 })
  })
})

describe('streakStats', () => {
  const goals = [goal({ startDate: '2026-10-20' }), goal({ id: 'g2', startDate: '2026-10-20' })]
  const both = (...dates) => new Map([['g1', new Set(dates)], ['g2', new Set(dates)]])

  test('counts complete days up to today; an unfinished today does not break it', () => {
    const doneDatesByGoal = both('2026-10-20', '2026-10-21', '2026-10-23', '2026-10-24', '2026-10-25')
    const stats = streakStats(goals, doneDatesByGoal, '2026-10-26')
    assert.equal(stats.current, 3)
    assert.equal(stats.best, 3)
    assert.deepEqual([...stats.streakDays].sort(), ['2026-10-20', '2026-10-21', '2026-10-23', '2026-10-24', '2026-10-25'])
  })

  test('a day with one goal left undone breaks the streak', () => {
    const doneDatesByGoal = both('2026-10-20', '2026-10-22')
    doneDatesByGoal.get('g1').add('2026-10-21')
    const stats = streakStats(goals, doneDatesByGoal, '2026-10-22')
    assert.equal(stats.current, 1)
    assert.equal(stats.best, 1)
    assert.equal(stats.streakDays.size, 0) // runs of one day are not marked
  })

  test('a day with no daily goals due is skipped, not a break', () => {
    const gapGoals = [goal({ startDate: '2026-10-20', endDate: '2026-10-21' }), goal({ id: 'g2', startDate: '2026-10-23' })]
    const doneDatesByGoal = new Map([
      ['g1', new Set(['2026-10-20', '2026-10-21'])],
      ['g2', new Set(['2026-10-23', '2026-10-24'])],
    ])
    const stats = streakStats(gapGoals, doneDatesByGoal, '2026-10-24')
    assert.equal(stats.current, 4)
    assert.equal(stats.best, 4)
    assert.equal(stats.streakDays.has('2026-10-22'), false) // the empty day itself isn't marked
  })

  test('weekly goals are ignored', () => {
    const stats = streakStats([goal({ frequency: 'weekly' })], new Map(), '2026-10-24')
    assert.deepEqual(stats, { current: 0, best: 0, streakDays: new Set(), events: [] })
  })

  test('80% of the day is enough when percentNeeded is 80', () => {
    const five = ['a', 'b', 'c', 'd', 'e'].map((id) => goal({ id, startDate: '2026-10-20' }))
    const doneDatesByGoal = new Map(five.map((g) => [g.id, new Set(g.id === 'e' ? [] : ['2026-10-20'])]))
    assert.equal(streakStats(five, doneDatesByGoal, '2026-10-20').current, 0) // 4 of 5 isn't 100%
    assert.equal(streakStats(five, doneDatesByGoal, '2026-10-20', { percentNeeded: 80 }).current, 1)
    // 1 of 2 is only 50%.
    const two = new Map([['g1', new Set(['2026-10-20'])], ['g2', new Set()]])
    assert.equal(streakStats(goals, two, '2026-10-21', { percentNeeded: 80 }).best, 0)
  })

  test('rewards every N streak days, punishment when a streak breaks', () => {
    const doneDatesByGoal = both('2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-25')
    // 24th missed (breaks a 4-day run), 26th missed (breaks the 1-day run of the 25th), 27th is today.
    const { events } = streakStats(goals, doneDatesByGoal, '2026-10-27', { rewardEvery: 2 })
    assert.deepEqual(events, [
      { kind: 'reward', date: '2026-10-21' },
      { kind: 'reward', date: '2026-10-23' },
      { kind: 'punishment', date: '2026-10-24' },
      { kind: 'punishment', date: '2026-10-26' },
    ])
  })
})

describe('stakeEvents', () => {
  const events = [
    { kind: 'reward', date: '2026-10-21' },
    { kind: 'punishment', date: '2026-10-24' },
    { kind: 'reward', date: '2026-10-27' },
  ]

  test('only events since the stakes were set, newest first', () => {
    const stakes = { reward: 'Spa day', punishment: 'Skip tea for 7 days', since: '2026-10-22' }
    assert.deepEqual(stakeEvents(stakes, events), [events[2], events[1]])
  })

  test('an empty punishment has no events, and no stakes means none at all', () => {
    assert.deepEqual(stakeEvents({ reward: 'Spa day', punishment: '', since: '2026-10-01' }, events), [events[2], events[0]])
    assert.deepEqual(stakeEvents(null, events), [])
  })
})
