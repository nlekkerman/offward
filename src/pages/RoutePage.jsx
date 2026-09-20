import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MapView from '../features/map/components/MapView.jsx'
import { isRenderableRoute } from '../features/map/mapGeometry.js'
import RouteItinerary from '../features/routes/components/RouteItinerary.jsx'
import RouteSections from '../features/routes/components/RouteSections.jsx'
import { getCountries } from '../services/countriesApi.js'
import { getPublicRouteBySlug } from '../services/routesApi.js'
import NotFoundPage from './NotFoundPage.jsx'

const ROUTE_DETAIL_LINE_STYLE = {
  color: '#4F8A3C',
  weight: 7,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round',
}

function formatActivity(value) {
  if (!value || typeof value !== 'string') {
    return 'Route'
  }

  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getOrderedRouteWaypoints(route) {
  if (!Array.isArray(route?.waypoints)) {
    return []
  }

  return route.waypoints
    .filter((waypoint) => waypoint && typeof waypoint === 'object' && waypoint.route_id === route.id && typeof waypoint.id === 'string')
    .map((waypoint, index) => ({
      ...waypoint,
      order: Number.isFinite(Number(waypoint.order)) ? Number(waypoint.order) : index + 1,
    }))
    .sort((a, b) => a.order - b.order)
}

function RoutePage() {
  const { routeSlug } = useParams()
  const [routeResult, setRouteResult] = useState({ slug: null, status: 'loading', route: null })
  const [countries, setCountries] = useState([])
  const [countriesStatus, setCountriesStatus] = useState('loading')
  const [selectedWaypointId, setSelectedWaypointId] = useState(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState(null)
  const [openPanel, setOpenPanel] = useState(null)

  useEffect(() => {
    let isCurrent = true

    async function loadRoute() {
      setSelectedWaypointId(null)
      setSelectedSegmentId(null)
      setOpenPanel(null)
      try {
        const data = await getPublicRouteBySlug(routeSlug)
        if (!isCurrent) {
          return
        }

        setRouteResult({ slug: routeSlug, status: data ? 'success' : 'not-found', route: data })
      } catch {
        if (isCurrent) {
          setRouteResult({ slug: routeSlug, status: 'error', route: null })
        }
      }
    }

    loadRoute()

    return () => {
      isCurrent = false
    }
  }, [routeSlug])

  useEffect(() => {
    let isCurrent = true

    async function loadCountries() {
      try {
        const data = await getCountries()
        if (isCurrent) {
          setCountries(data)
          setCountriesStatus('success')
        }
      } catch {
        if (isCurrent) {
          setCountries([])
          setCountriesStatus('error')
        }
      }
    }

    loadCountries()

    return () => {
      isCurrent = false
    }
  }, [])

  const routeStatus = routeResult.slug === routeSlug ? routeResult.status : 'loading'
  const route = routeResult.slug === routeSlug ? routeResult.route : null
  const countryNames = useMemo(() => new Map(countries.map((country) => [country.slug, country.name])), [countries])
  const waypoints = useMemo(() => getOrderedRouteWaypoints(route), [route])
  const segments = useMemo(() => (Array.isArray(route?.segments) ? route.segments : []), [route])
  const selectSegment = (segmentId) => setSelectedSegmentId((currentId) => currentId === segmentId ? null : segmentId)
  // Accordion: opening one panel closes the other to keep page height minimal.
  const toggleWaypointsPanel = () => setOpenPanel((current) => (current === 'waypoints' ? null : 'waypoints'))
  const toggleSectionsPanel = () => setOpenPanel((current) => (current === 'sections' ? null : 'sections'))
  const mapRoute = route && route.is_map_renderable === true && isRenderableRoute(route) ? route : null
  const hasMalformedGeometry = route?.geometry && route?.is_map_renderable === true && !mapRoute
  const countryLabel = countryNames.get(route?.country) || route?.country || 'Country pending'
  const activityLabel = formatActivity(route?.activity_type)

  if (routeStatus === 'loading') {
    return <section className="route-detail-page"><p className="route-detail-status" role="status">Loading route...</p></section>
  }

  if (routeStatus === 'not-found') {
    return <NotFoundPage />
  }

  if (routeStatus === 'error') {
    return (
      <section className="route-detail-page">
        <Link className="route-detail-back" to="/explore">Back to Explore</Link>
        <div className="route-detail-error" role="alert">
          <p className="eyebrow">ROUTE UNAVAILABLE</p>
          <h1>Unable to load this Route</h1>
          <p>There was a network or server problem loading the Route detail. Try again from Explore.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="route-detail-page">
      <Link className="route-detail-back" to="/explore">Back to Explore</Link>
      <header className="route-detail-header">
        <div>
          <p className="eyebrow">PUBLIC ROUTE</p>
          <h1>{route.title}</h1>
        </div>
        <div className="route-detail-meta" aria-label="Route metadata">
          <span>{countryLabel}</span>
          <span>{activityLabel}</span>
        </div>
        {route.summary && <p className="route-detail-summary">{route.summary}</p>}
        {countriesStatus === 'error' && <p className="route-detail-muted" role="status">Country details are unavailable, so the canonical country slug is shown.</p>}
      </header>

      <div className="route-detail-toggles" role="group" aria-label="Route detail panels">
        <button
          type="button"
          id="route-waypoints-toggle"
          className={openPanel === 'waypoints' ? 'route-panel-toggle is-open' : 'route-panel-toggle'}
          aria-expanded={openPanel === 'waypoints'}
          aria-controls="route-waypoints-panel"
          onClick={toggleWaypointsPanel}
          disabled={waypoints.length === 0}
        >
          Waypoints {waypoints.length}{openPanel === 'waypoints' && <span aria-hidden="true"> ▲</span>}
        </button>
        <button
          type="button"
          id="route-sections-toggle"
          className={openPanel === 'sections' ? 'route-panel-toggle is-open' : 'route-panel-toggle'}
          aria-expanded={openPanel === 'sections'}
          aria-controls="route-sections-panel"
          onClick={toggleSectionsPanel}
          disabled={segments.length === 0}
        >
          Sections {segments.length}{openPanel === 'sections' && <span aria-hidden="true"> ▲</span>}
        </button>
      </div>

      {openPanel === 'waypoints' && (
        <section id="route-waypoints-panel" className="route-panel-revealed" aria-labelledby="route-waypoints-toggle">
          <RouteItinerary waypoints={waypoints} selectedWaypointId={selectedWaypointId} onWaypointSelect={setSelectedWaypointId} />
        </section>
      )}

      {openPanel === 'sections' && (
        <section id="route-sections-panel" className="route-panel-revealed" aria-labelledby="route-sections-toggle">
          <RouteSections
            segments={segments}
            waypoints={waypoints}
            selectedSegmentId={selectedSegmentId}
            onSegmentSelect={selectSegment}
            onDeselect={() => setSelectedSegmentId(null)}
          />
        </section>
      )}

      <section className="route-map-section" aria-labelledby="route-map-title">
        <div className="route-map-heading">
          <p className="eyebrow">MAP</p>
          <h2 id="route-map-title">Published path</h2>
        </div>
        {(!route.geometry || route.is_map_renderable === false) && <p className="route-map-message">This Route does not yet have a published map path.</p>}
        {hasMalformedGeometry && <p className="route-map-message" role="status">The published map path could not be displayed.</p>}
        <MapView
          className="route-detail-map"
          routes={mapRoute ? [mapRoute] : []}
          waypoints={waypoints}
          selectedWaypointId={selectedWaypointId}
          onWaypointSelect={setSelectedWaypointId}
          routeLineStyle={{ ...ROUTE_DETAIL_LINE_STYLE, opacity: selectedSegmentId ? 0.35 : ROUTE_DETAIL_LINE_STYLE.opacity, weight: selectedSegmentId ? 5 : ROUTE_DETAIL_LINE_STYLE.weight }}
          segments={segments}
          selectedSegmentId={selectedSegmentId}
          onSegmentSelect={selectSegment}
          initialCenter={[50, 10]}
          initialZoom={4}
        />
      </section>
    </section>
  )
}

export default RoutePage