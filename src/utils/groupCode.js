// Group join codes: 6 characters, without look-alikes (no 0/O, 1/I/L),
// so they are easy to read out loud or type from a screenshot.
// firestore.rules checks the same pattern.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export const GROUP_CODE_LENGTH = 6
export const GROUP_CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/

// crypto.getRandomValues is the browser's secure random generator;
// Math.random() would be guessable.
export function generateGroupCode() {
  const values = crypto.getRandomValues(new Uint32Array(GROUP_CODE_LENGTH))
  return Array.from(values, (value) => ALPHABET[value % ALPHABET.length]).join('')
}

// ' ab c-123 ' → 'ABC123': uppercase, letters and digits only, max 6.
export function normaliseCode(value) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, GROUP_CODE_LENGTH)
}
