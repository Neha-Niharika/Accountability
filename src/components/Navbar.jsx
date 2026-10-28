// Floating bottom navigation: Home, Goals, a raised "+" button for a new goal,
// Groups, and Sign out. Each item is a 48px touch target.
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { signOut } from '../services/authService'
import { HomeIcon, ListIcon, LogOutIcon, PlusIcon, UsersIcon } from './Icons'

function Navbar() {
  const location = useLocation()
  const [error, setError] = useState('')

  // Work out which item is active. /goals/new belongs to the "+" button.
  const goalsActive = location.pathname.startsWith('/goals') && location.pathname !== '/goals/new'
  const groupsActive = location.pathname.startsWith('/groups')

  async function handleSignOut() {
    setError('')
    try {
      await signOut()
      // onAuthStateChanged sets user to null, and ProtectedRoute redirects.
    } catch {
      setError('Could not sign out. Please try again.')
    }
  }

  function itemProps(active) {
    return {
      className: `nav-item${active ? ' nav-item-active' : ''}`,
      'aria-current': active ? 'page' : undefined,
    }
  }

  return (
    <>
      {error && (
        <p className="status status-error nav-toast" role="alert">
          {error}
        </p>
      )}
      <nav className="bottom-nav" aria-label="Main">
        <Link to="/" {...itemProps(location.pathname === '/')} aria-label="Dashboard">
          <HomeIcon />
        </Link>
        <Link to="/goals" {...itemProps(goalsActive)} aria-label="My goals">
          <ListIcon />
        </Link>
        <Link to="/goals/new" className="nav-fab" aria-label="New goal">
          <PlusIcon />
        </Link>
        <Link to="/groups" {...itemProps(groupsActive)} aria-label="Groups">
          <UsersIcon />
        </Link>
        <button type="button" className="nav-item" onClick={handleSignOut} aria-label="Sign out">
          <LogOutIcon />
        </button>
      </nav>
    </>
  )
}

export default Navbar
