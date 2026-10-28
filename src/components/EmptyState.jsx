// Friendly message for when there is nothing to show yet, with an optional action.
function EmptyState({ title, message, action }) {
  return (
    <div className="card empty-state">
      <h2>{title}</h2>
      <p className="muted">{message}</p>
      {action}
    </div>
  )
}

export default EmptyState
