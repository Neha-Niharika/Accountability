import { Link, useSearchParams } from 'react-router-dom'
import CreateGroupForm from '../components/CreateGroupForm'
import { ChevronRightIcon, UsersIcon } from '../components/Icons'
import JoinGroupForm from '../components/JoinGroupForm'
import LoadError from '../components/LoadError'
import { useAuth } from '../hooks/useAuth'
import { useFlashMessage } from '../hooks/useFlashMessage'
import { useMyGroups } from '../hooks/useMyGroups'
import { normaliseCode } from '../utils/groupCode'

function Groups() {
  const { user } = useAuth()
  const { groups, loading, error } = useMyGroups(user.uid)
  const [message] = useFlashMessage()
  // Invite links look like /groups?join=K7MP2Q.
  const [searchParams] = useSearchParams()
  const inviteCode = normaliseCode(searchParams.get('join') ?? '')

  return (
    <>
      <div className="page-header">
        <h1>Groups</h1>
      </div>

      {message && <p className="status status-success page-status">{message}</p>}
      {inviteCode && (
        <p className="status status-info page-status">You’ve been invited. Check the code below and tap Join group.</p>
      )}

      <div className="groups-layout">
        <section className="groups-list" aria-labelledby="my-groups-title">
          <h2 id="my-groups-title" className="section-title">
            Your groups
          </h2>
          {loading ? (
            <p className="page-loading">Loading your groups…</p>
          ) : error ? (
            <LoadError message={error} />
          ) : groups.length === 0 ? (
            <p className="muted">You’re not in any groups yet. Create one, or join a friend’s with their code.</p>
          ) : (
            <ul className="feed-list">
              {groups.map((group) => (
                <li key={group.id} className="feed-item">
                  <span className="icon-box" aria-hidden="true">
                    <UsersIcon />
                  </span>
                  <div className="feed-item-text">
                    <Link to={`/groups/${group.id}`} className="feed-item-title">
                      {group.name}
                    </Link>
                    <span className="feed-item-meta">
                      {group.memberCount} member{group.memberCount === 1 ? '' : 's'} ·{' '}
                      {group.ownerId === user.uid ? 'Owner' : `Created by ${group.ownerName}`}
                    </span>
                  </div>
                  <ChevronRightIcon />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="group-forms">
          {/* Show the join form first when arriving from an invite link. */}
          {inviteCode ? (
            <>
              <JoinGroupForm initialCode={inviteCode} />
              <CreateGroupForm />
            </>
          ) : (
            <>
              <CreateGroupForm />
              <JoinGroupForm />
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default Groups
