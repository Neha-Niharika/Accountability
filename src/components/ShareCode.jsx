// Shows a group's join code with "Copy invite" and, on phones, the native share sheet.
import { useState } from 'react'
import { CopyIcon, ShareIcon } from './Icons'

function ShareCode({ code, groupName }) {
  const [status, setStatus] = useState('')

  // A link that opens the Groups page with the code already filled in.
  const joinUrl = `${window.location.origin}/groups?join=${code}`
  const inviteText = `Join my group "${groupName}" on Accountability with code ${code}`
  const canShare = typeof navigator.share === 'function'

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${inviteText}: ${joinUrl}`)
      setStatus('Invite copied.')
    } catch {
      setStatus('Could not copy. Select the code and copy it yourself.')
    }
  }

  async function handleShare() {
    try {
      await navigator.share({ title: groupName, text: inviteText, url: joinUrl })
    } catch (error) {
      // AbortError just means the share sheet was closed.
      if (error.name !== 'AbortError') setStatus('Could not open sharing.')
    }
  }

  return (
    <div className="share-code">
      <p className="label">Join code</p>
      <p className="code-chip">
        <span aria-hidden="true">{code}</span>
        {/* Read letter by letter by screen readers. */}
        <span className="visually-hidden">{code.split('').join(' ')}</span>
      </p>
      <div className="share-actions">
        <button type="button" className="btn btn-secondary btn-small" onClick={handleCopy}>
          <CopyIcon />
          Copy invite
        </button>
        {canShare && (
          <button type="button" className="btn btn-secondary btn-small" onClick={handleShare}>
            <ShareIcon />
            Share
          </button>
        )}
      </div>
      <p className="share-status muted" role="status">
        {status}
      </p>
    </div>
  )
}

export default ShareCode
