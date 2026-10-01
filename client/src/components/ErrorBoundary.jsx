import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ERROR BOUNDARY caught error]:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page round-page-centered" style={{ background: '#050a08' }}>
          <div className="card card-glow round-error-card" style={{ maxWidth: '440px', padding: '36px 28px', textAlign: 'center' }}>
            
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--red-bright, #f87171)',
              letterSpacing: '0.15em',
              fontSize: '1.3rem',
              marginBottom: '12px',
              textTransform: 'uppercase'
            }}>
              SYSTEM ERROR
            </h2>
            <p style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--text-muted, #94a3b8)',
              fontSize: '0.9rem',
              letterSpacing: '0.05em',
              marginBottom: '24px',
              lineHeight: 1.5
            }}>
              TRIAL COULD NOT BE LOADED
            </p>

            <button
              className="btn btn-primary"
              onClick={this.handleReset}
              style={{ width: '100%', padding: '12px' }}
            >
              RETURN HOME
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
