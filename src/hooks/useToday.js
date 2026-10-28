import { useEffect, useState } from 'react'

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

// Today's date at local midnight. Updates when the day changes, so a page
// left open overnight moves its progress and stats to the new day.
// Usage: const today = useToday()
export function useToday() {
  const [today, setToday] = useState(startOfToday)

  useEffect(() => {
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    const timeoutId = setTimeout(() => setToday(startOfToday()), tomorrow - Date.now())
    return () => clearTimeout(timeoutId)
  }, [today])

  return today
}
