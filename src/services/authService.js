// All Firebase Authentication calls live here, so pages never talk to
// Firebase directly. Pages call these functions and show the result.
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

export async function signUp({ name, email, password }) {
  // 1. Create the account. Firebase stores and hashes the password; we never see it again.
  const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password)

  // 2. Save the name on the Auth profile so it is available as user.displayName.
  await updateProfile(user, { displayName: name.trim() })

  // 3. Create the profile document users/{uid}. No password is stored here.
  await setDoc(doc(db, 'users', user.uid), {
    name: name.trim(),
    email: user.email,
    createdAt: serverTimestamp(),
  })

  return user
}

export async function signIn({ email, password }) {
  const { user } = await signInWithEmailAndPassword(auth, email.trim(), password)
  return user
}

export function signOut() {
  return firebaseSignOut(auth)
}

// Turn Firebase error codes into messages a user can act on.
export function getAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in.'
    case 'auth/invalid-email':
      return 'That email address is not valid.'
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return 'Password is too weak. Use at least 8 characters.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.'
    case 'auth/user-disabled':
      return 'This account has been disabled.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection and try again.'
    case 'auth/user-token-expired':
    case 'auth/requires-recent-login':
      return 'Your session has expired. Please sign in again.'
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled for this app.'
    case 'permission-denied':
      return 'Your account was created, but saving your profile was blocked. Check the Firestore rules.'
    default:
      return 'Something went wrong. Please try again.'
  }
}
