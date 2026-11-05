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

// One-tap suggestions in the rewards and punishments form. Anything else can be typed.
export const SAMPLE_REWARDS = ['Eat out', 'Hot chocolate', 'Shopping', 'Spa day']

export const SAMPLE_PUNISHMENTS = ['Skip tea for 7 days', 'Skip Instagram for 7 days', 'Put 500 rupees in piggy bank']

// The group streak counts a day when at least this share of its daily goals is done.
export const GROUP_PERCENT_NEEDED = 80
