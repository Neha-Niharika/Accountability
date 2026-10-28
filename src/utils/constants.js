// Allowed values for goal fields. firestore.rules has the same lists,
// so keep both in sync when adding a category.
export const GOAL_CATEGORIES = [
  'Health',
  'Fitness',
  'Learning',
  'Career',
  'Finance',
  'Mindfulness',
  'Personal',
  'Other',
]

export const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
}

export const STATUS_LABELS = {
  active: 'Active',
  completed: 'Completed',
}
