// Firestore waits for the server before a write's promise finishes, so an
// offline save would show "Saving…" forever. Fail fast with a clear error instead.
// The 'unavailable' code is what Firestore itself uses for network problems.
export function ensureOnline() {
  if (!navigator.onLine) {
    const error = new Error('You are offline.')
    error.code = 'unavailable'
    throw error
  }
}
