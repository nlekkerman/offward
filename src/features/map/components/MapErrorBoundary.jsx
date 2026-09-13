import { Component } from 'react'

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Map error boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="offward-map-container">
          <div className="offward-map-fallback">
            Unable to display map at this time.
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default MapErrorBoundary
