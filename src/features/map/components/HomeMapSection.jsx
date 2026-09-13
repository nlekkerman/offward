import { useEffect, useState } from 'react'
import { getPublicRoutes } from '../../../services/routesApi.js'
import MapView from './MapView.jsx'

function HomeMapSection() {
  const [routes, setRoutes] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let isCurrent = true

    async function loadRoutes() {
      try {
        const data = await getPublicRoutes({ includeGeometry: true })
        if (isCurrent) {
          if (Array.isArray(data) && data.length > 0) {
            setRoutes(data)
            setStatus('success')
          } else {
            setRoutes([])
            setStatus('empty')
          }
        }
      } catch {
        if (isCurrent) {
          setRoutes([])
          setStatus('error')
        }
      }
    }

    loadRoutes()

    return () => {
      isCurrent = false
    }
  }, [])

  return (
    <section className="home-map-section">
      <p className="eyebrow">MAP</p>
      <h2>Explore the map</h2>
      <p className="home-map-description">
        Routes, places and stories will appear here as Offward grows.
      </p>
      {status === 'loading' && (
        <p className="map-status-text" aria-live="polite">
          Loading map routes...
        </p>
      )}
      {status === 'empty' && (
        <p className="map-status-text">
          Mapped routes will appear as they are published.
        </p>
      )}
      {status === 'error' && (
        <p className="map-status-text">
          Unable to load map routes at this time.
        </p>
      )}
      <MapView routes={routes} initialCenter={[50.0, 10.0]} initialZoom={4} />
    </section>
  )
}

export default HomeMapSection
