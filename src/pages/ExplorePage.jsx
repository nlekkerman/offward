import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCountries } from '../services/countriesApi.js'
import { getPublicRoutes } from '../services/routesApi.js'
import MapView from '../features/map/components/MapView.jsx'

function ExplorePage() {
  const [countries, setCountries] = useState([])
  const [countriesStatus, setCountriesStatus] = useState('loading')
  const [routes, setRoutes] = useState([])
  const [routesStatus, setRoutesStatus] = useState('loading')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedActivity, setSelectedActivity] = useState('')
  const [selectedRouteId, setSelectedRouteId] = useState(null)

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
          setCountriesStatus('error')
        }
      }
    }

    loadCountries()

    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    let isCurrent = true

    async function loadRoutes() {
      try {
        const data = await getPublicRoutes({
          country: selectedCountry || undefined,
          activityType: selectedActivity || undefined,
          status: 'active',
          includeGeometry: true,
        })
        if (isCurrent) {
          setRoutes(data)
          setRoutesStatus('success')
        }
      } catch {
        if (isCurrent) {
          setRoutes([])
          setRoutesStatus('error')
        }
      }
    }

    loadRoutes()
    return () => {
      isCurrent = false
    }
  }, [selectedActivity, selectedCountry])

  const countryNames = useMemo(() => new Map(countries.map((country) => [country.slug, country.name])), [countries])
  const availableActivities = useMemo(() => [...new Set(routes.map((route) => route.activity_type).filter(Boolean))].sort(), [routes])
  const activeSelectedRouteId = routes.some((route) => route.id === selectedRouteId) ? selectedRouteId : null
  const selectedRoute = routes.find((route) => route.id === activeSelectedRouteId)
  const renderableRouteCount = routes.filter((route) => route.is_map_renderable === true).length
  const visibleCountryOptions = countries.filter((country) => country.status === 'active' || country.status === 'upcoming')

  return (
    <section className="explore-page">
      <div className="explore-heading">
        <div>
          <p className="eyebrow">PUBLIC ROUTES</p>
          <h1>Explore</h1>
        </div>
        <p className="explore-count" aria-live="polite">{renderableRouteCount} mapped {renderableRouteCount === 1 ? 'route' : 'routes'}</p>
      </div>
      <div className="explore-layout">
        <aside className="explore-panel" aria-label="Route filters and list">
          <div className="explore-filters">
            <label className="explore-field">
              <span>Country</span>
              <select value={selectedCountry} onChange={(event) => { setRoutesStatus('loading'); setSelectedRouteId(null); setSelectedCountry(event.target.value) }}>
                <option value="">All countries</option>
                {visibleCountryOptions.map((country) => <option key={country.id} value={country.slug}>{country.name}</option>)}
              </select>
            </label>
            <label className="explore-field">
              <span>Activity</span>
              <select value={selectedActivity} onChange={(event) => { setRoutesStatus('loading'); setSelectedRouteId(null); setSelectedActivity(event.target.value) }}>
                <option value="">All activities</option>
                {availableActivities.map((activity) => <option key={activity} value={activity}>{activity}</option>)}
              </select>
            </label>
            {(selectedCountry || selectedActivity || activeSelectedRouteId) && <button type="button" className="explore-clear" onClick={() => { setRoutesStatus('loading'); setSelectedCountry(''); setSelectedActivity(''); setSelectedRouteId(null) }}>Clear selection and filters</button>}
          </div>
          {countriesStatus === 'loading' && <p className="explore-status" role="status">Loading countries...</p>}
          {countriesStatus === 'error' && <p className="explore-status" role="status">Unable to load country filters.</p>}
          {routesStatus === 'loading' && <p className="explore-status" role="status">Loading routes...</p>}
          {routesStatus === 'error' && <p className="explore-status" role="status">Unable to load routes. The map remains available.</p>}
          {routesStatus === 'success' && routes.length === 0 && <p className="explore-status" role="status">No routes match these filters.</p>}
          {routes.length > 0 && <div className="explore-route-list" aria-label="Routes">
            {routes.map((route) => <button key={route.id} type="button" className={route.id === selectedRouteId ? 'explore-route-item is-selected' : 'explore-route-item'} onClick={() => setSelectedRouteId(route.id)}><strong>{route.title}</strong><span>{countryNames.get(route.country) || route.country} · {route.activity_type}</span></button>)}
          </div>}
          {selectedRoute && <div className="explore-preview">
            <p className="eyebrow">SELECTED ROUTE</p>
            <h2>{selectedRoute.title}</h2>
            <p>{countryNames.get(selectedRoute.country) || selectedRoute.country} · {selectedRoute.activity_type}</p>
            {selectedRoute.summary && <p>{selectedRoute.summary}</p>}
            <div className="explore-preview-actions"><Link className="primary-button" to={`/routes/${selectedRoute.slug}`}>View Route</Link><button type="button" className="secondary-button" onClick={() => setSelectedRouteId(null)}>Deselect</button></div>
          </div>}
        </aside>
        <div className="explore-map-wrap">
          <MapView className="explore-map" routes={routes} selectedRouteId={activeSelectedRouteId} onRouteSelect={setSelectedRouteId} initialCenter={[50, 10]} initialZoom={4} />
          {routesStatus === 'success' && routes.length > 0 && renderableRouteCount === 0 && <p className="explore-map-notice" role="status">Published routes are not currently map-renderable.</p>}
        </div>
      </div>
    </section>
  )
}

export default ExplorePage