// Catches unexpected errors while rendering, so a bug shows a friendly
// message instead of a blank white page. Error boundaries must be class
// components; React has no hook for this yet.
import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Unexpected error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="auth-page">
          <div className="card auth-card empty-state">
            <h1>Something went wrong</h1>
            <p className="muted">An unexpected error occurred. Reloading usually fixes it.</p>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
