// Shared frame for every signed-in page: the current page, then the floating nav.
import { Outlet, useLocation } from 'react-router-dom'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import Navbar from './Navbar'

function AppLayout() {
  const online = useOnlineStatus()
  const location = useLocation()

  return (
    <>
      {!online && (
        <p className="offline-banner" role="status">
          You’re offline. Changes can’t be saved until your connection is back.
        </p>
      )}
      {/* A new key on each page change replays the CSS fade-in transition. */}
      <main className="container page-transition" key={location.pathname}>
        {/* React Router renders the matching child route here. */}
        <Outlet />
      </main>
      <Navbar />
    </>
  )
}

export default AppLayout
