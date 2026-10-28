// Form validation helpers. Each function returns an object of
// { fieldName: 'error message' }. An empty object means the form is valid.
import { FREQUENCY_LABELS, GOAL_CATEGORIES, STATUS_LABELS } from './constants'
import { DATE_KEY_PATTERN } from './dates'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const MIN_PASSWORD_LENGTH = 8
export const MAX_NAME_LENGTH = 50
export const MAX_GOAL_TITLE_LENGTH = 100
export const MAX_GOAL_DESCRIPTION_LENGTH = 500

export function validateSignUp({ name, email, password, confirmPassword }) {
  const errors = {}

  if (!name.trim()) {
    errors.name = 'Name is required.'
  } else if (name.trim().length > MAX_NAME_LENGTH) {
    errors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer.`
  }

  if (!email.trim()) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }

  if (confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

export function validateSignIn({ email, password }) {
  const errors = {}

  if (!email.trim()) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (!password) {
    errors.password = 'Password is required.'
  }

  return errors
}

export function validateGoal({ title, description, category, frequency, startDate, endDate, status }) {
  const errors = {}

  if (!title.trim()) {
    errors.title = 'Goal title is required.'
  } else if (title.trim().length > MAX_GOAL_TITLE_LENGTH) {
    errors.title = `Goal title must be ${MAX_GOAL_TITLE_LENGTH} characters or fewer.`
  }

  if (description.trim().length > MAX_GOAL_DESCRIPTION_LENGTH) {
    errors.description = `Description must be ${MAX_GOAL_DESCRIPTION_LENGTH} characters or fewer.`
  }

  if (!GOAL_CATEGORIES.includes(category)) {
    errors.category = 'Choose a category.'
  }

  if (!Object.hasOwn(FREQUENCY_LABELS, frequency)) {
    errors.frequency = 'Choose how often.'
  }

  if (!DATE_KEY_PATTERN.test(startDate)) {
    errors.startDate = 'Start date is required.'
  }

  // End date is optional. 'YYYY-MM-DD' strings compare in date order.
  if (endDate) {
    if (!DATE_KEY_PATTERN.test(endDate)) {
      errors.endDate = 'Enter a valid date.'
    } else if (!errors.startDate && endDate < startDate) {
      errors.endDate = 'End date must be on or after the start date.'
    }
  }

  if (!Object.hasOwn(STATUS_LABELS, status)) {
    errors.status = 'Choose a status.'
  }

  return errors
}
