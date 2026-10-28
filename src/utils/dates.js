// Date helpers. Dates are stored as 'YYYY-MM-DD' strings in the user's LOCAL
// calendar day, so "today" matches what the user sees on their clock, and
// strings sort and compare in date order.

export const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// '2026-10-28' → Date at local midnight.
export function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Adding to the day number (not milliseconds) stays correct across daylight-saving changes.
export function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

// Monday of the week containing `date`.
export function startOfWeek(date) {
  const daysSinceMonday = (date.getDay() + 6) % 7
  return addDays(date, -daysSinceMonday)
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

// Day 0 of next month is the last day of this month.
export function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

// Every date key from `fromKey` to `toKey`, inclusive.
export function dateKeysBetween(fromKey, toKey) {
  const keys = []
  for (let date = parseDateKey(fromKey); toDateKey(date) <= toKey; date = addDays(date, 1)) {
    keys.push(toDateKey(date))
  }
  return keys
}

const dateKeyFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

// '2026-10-28' → '28 Oct 2026' (in the user's locale).
export function formatDateKey(dateKey) {
  if (!dateKey) return '—'
  return dateKeyFormatter.format(parseDateKey(dateKey))
}
