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

// Monday of the week containing `date`.
export function startOfWeek(date) {
  const daysSinceMonday = (date.getDay() + 6) % 7
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday)
}

const dateKeyFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

// '2026-10-28' → '28 Oct 2026' (in the user's locale).
export function formatDateKey(dateKey) {
  if (!dateKey) return '—'
  const [year, month, day] = dateKey.split('-').map(Number)
  return dateKeyFormatter.format(new Date(year, month - 1, day))
}
