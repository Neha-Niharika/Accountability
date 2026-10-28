// Shares the signed-in user with every component, without passing props down.
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import { AuthContext } from './AuthContext'

// Copy only the fields we need into a plain object. React re-renders when
// state gets a new object, so this also lets us refresh the user after updateProfile.
function toAppUser(firebaseUser) {
  if (!firebaseUser) return null
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // True until Firebase tells us whether someone is already signed in.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Firebase calls this on page load (restoring a saved session),
    // after sign-in, and after sign-out. It returns an unsubscribe function.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(toAppUser(firebaseUser))
      setLoading(false)
    })
    return unsubscribe
  }, [])

  // Call after changing the profile (e.g. displayName at sign-up).
  function refreshUser() {
    setUser(toAppUser(auth.currentUser))
  }

  if (loading) {
    return <p className="page-loading">Loading…</p>
  }

  return (
    <AuthContext.Provider value={{ user, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
