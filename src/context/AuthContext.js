import { createContext } from 'react'

// The "channel" the signed-in user travels through. AuthProvider puts a
// value in; useAuth() reads it out from any component.
export const AuthContext = createContext(null)
