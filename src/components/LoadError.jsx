// Shown when data fails to load, with a way to try again.
function LoadError({ message }) {
  return (
    <div className="status status-error load-error" role="alert">
      <span>{message}</span>
      <button type="button" className="btn btn-secondary btn-small" onClick={() => window.location.reload()}>
        Try again
      </button>
    </div>
  )
}

export default LoadError
