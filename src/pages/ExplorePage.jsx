import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getCountries } from '../services/countriesApi.js'
import { getPublicPlaces } from '../services/placesApi.js'
import { getPublicRoutes } from '../services/routesApi.js'
import MapView from '../features/map/components/MapView.jsx'
import { isRenderablePlace } from '../features/map/mapGeometry.js'
import ExploreCategoryNav from './ExploreCategoryNav.jsx'

function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawView = searchParams.get('view')
  const activeView = rawView === 'places' ? 'places' : 'routes'

  const [countries, setCountries] = useState([])
  const [countriesStatus, setCountriesStatus] = useState('loading')
  const [routes, setRoutes] = useState([])
  const [routesStatus, setRoutesStatus] = useState('loading')
  const [places, setPlaces] = useState([])
  const [placesStatus, setPlacesStatus] = useState('loading')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedActivity, setSelectedActivity] = useState('')
  const [selectedRouteId, setSelectedRouteId] = useState(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState(null)

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

  useEffect(() => {
    let isCurrent = true

    async function loadPlaces() {
      try {
        const data = await getPublicPlaces({ country: selectedCountry || undefined })
        if (isCurrent) {
          setPlaces(data)
          setPlacesStatus('success')
        }
      } catch {
        if (isCurrent) {
          setPlaces([])
          setPlacesStatus('error')
        }
      }
    }

    loadPlaces()
    return () => {
      isCurrent = false
    }
  }, [selectedCountry])

  const [prevActiveView, setPrevActiveView] = useState(activeView)
  if (prevActiveView !== activeView) {
    setPrevActiveView(activeView)
    setSelectedRouteId(null)
    setSelectedPlaceId(null)
  }

  const countryNames = useMemo(() => new Map(countries.map((country) => [country.slug, country.name])), [countries])
  const availableActivities = useMemo(() => [...new Set(routes.map((route) => route.activity_type).filter(Boolean))].sort(), [routes])
  const activeSelectedRouteId = activeView === 'routes' && routes.some((route) => route.id === selectedRouteId) ? selectedRouteId : null
  const activeSelectedPlaceId = activeView === 'places' && places.some((place) => place.id === selectedPlaceId) ? selectedPlaceId : null
  const selectedRoute = activeView === 'routes' ? routes.find((route) => route.id === activeSelectedRouteId) : null
  const selectedPlace = activeView === 'places' ? places.find((place) => place.id === activeSelectedPlaceId) : null
  const renderableRouteCount = routes.filter((route) => route.is_map_renderable === true).length
  const renderablePlaceCount = places.filter(isRenderablePlace).length
  const visibleCountryOptions = countries.filter((country) => country.status === 'active' || country.status === 'upcoming')
  const visibleRoutes = activeView === 'routes' ? routes : []
  const visiblePlaces = activeView === 'places' ? places : []

  const activeCount = activeView === 'routes' ? renderableRouteCount : renderablePlaceCount
  const activeCountLabel = activeView === 'routes' ? (renderableRouteCount === 1 ? 'route' : 'routes') : (renderablePlaceCount === 1 ? 'place' : 'places')

  const hasActiveFilterOrSelection = activeView === 'routes'
    ? Boolean(selectedCountry || selectedActivity || activeSelectedRouteId)
    : Boolean(selectedCountry || activeSelectedPlaceId)

  const handleCategoryChange = (newCategory) => {
    if (newCategory === activeView) return
    setSelectedRouteId(null)
    setSelectedPlaceId(null)
    setSearchParams({ view: newCategory })
  }

  return (
    <section className="explore-page">
      <div className="explore-heading">
        <div>
          <p className="eyebrow">{activeView === 'routes' ? 'PUBLIC ROUTES' : 'PUBLIC PLACES'}</p>
          <h1>Explore</h1>
        </div>
        <p className="explore-count" aria-live="polite">
          {activeCount} mapped {activeCountLabel}
        </p>
      </div>
      <ExploreCategoryNav activeView={activeView} onViewChange={handleCategoryChange} />
      <div className="explore-layout">
        <aside className="explore-panel" aria-label="Explore filters and list">
          <div className="explore-filters">
            <label className="explore-field">
              <span>Country</span>
              <select
                value={selectedCountry}
                onChange={(event) => {
                  setRoutesStatus('loading')
                  setPlacesStatus('loading')
                  setSelectedRouteId(null)
                  setSelectedPlaceId(null)
                  setSelectedCountry(event.target.value)
                }}
              >
                <option value="">All countries</option>
                {visibleCountryOptions.map((country) => (
                  <option key={country.id} value={country.slug}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
            {activeView === 'routes' && (
              <label className="explore-field">
                <span>Activity</span>
                <select
                  value={selectedActivity}
                  onChange={(event) => {
                    setRoutesStatus('loading')
                    setSelectedRouteId(null)
                    setSelectedActivity(event.target.value)
                  }}
                >
                  <option value="">All activities</option>
                  {availableActivities.map((activity) => (
                    <option key={activity} value={activity}>
                      {activity}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {hasActiveFilterOrSelection && (
              <button
                type="button"
                className="explore-clear"
                onClick={() => {
                  setRoutesStatus('loading')
                  setPlacesStatus('loading')
                  setSelectedCountry('')
                  setSelectedActivity('')
                  setSelectedRouteId(null)
                  setSelectedPlaceId(null)
                }}
              >
                Clear selection and filters
              </button>
            )}
          </div>
          {countriesStatus === 'loading' && <p className="explore-status" role="status">Loading countries...</p>}
          {countriesStatus === 'error' && <p className="explore-status" role="status">Unable to load country filters.</p>}
          {activeView === 'routes' && (
            <>
              {routesStatus === 'loading' && <p className="explore-status" role="status">Loading routes...</p>}
              {routesStatus === 'error' && <p className="explore-status" role="status">Unable to load routes. The map remains available.</p>}
              {routesStatus === 'success' && routes.length === 0 && <p className="explore-status" role="status">No routes match these filters.</p>}
              {routes.length > 0 && (
                <div className="explore-route-list" aria-label="Routes">
                  {routes.map((route) => (
                    <button
                      key={route.id}
                      type="button"
                      className={route.id === activeSelectedRouteId ? 'explore-route-item is-selected' : 'explore-route-item'}
                      onClick={() => {
                        setSelectedRouteId(route.id)
                        setSelectedPlaceId(null)
                      }}
                    >
                      <strong>{route.title}</strong>
                      <span>{countryNames.get(route.country) || route.country} · {route.activity_type}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedRoute && (
                <div className="explore-preview">
                  <p className="eyebrow">SELECTED ROUTE</p>
                  <h2>{selectedRoute.title}</h2>
                  <p>{countryNames.get(selectedRoute.country) || selectedRoute.country} · {selectedRoute.activity_type}</p>
                  {selectedRoute.summary && <p>{selectedRoute.summary}</p>}
                  <div className="explore-preview-actions">
                    <Link className="primary-button" to={`/routes/${selectedRoute.slug}`}>View Route</Link>
                    <button type="button" className="secondary-button" onClick={() => setSelectedRouteId(null)}>Deselect</button>
                  </div>
                </div>
              )}
            </>
          )}
          {activeView === 'places' && (
            <>
              {placesStatus === 'loading' && <p className="explore-status" role="status">Loading places...</p>}
              {placesStatus === 'error' && <p className="explore-status" role="status">Unable to load places. The map remains available.</p>}
              {placesStatus === 'success' && places.length === 0 && <p className="explore-status" role="status">No places match this country.</p>}
              {places.length > 0 && (
                <div className="explore-place-list" aria-label="Places">
                  {places.map((place) => (
                    <button
                      key={place.id}
                      type="button"
                      className={place.id === activeSelectedPlaceId ? 'explore-route-item is-selected' : 'explore-route-item'}
                      onClick={() => {
                        setSelectedPlaceId(place.id)
                        setSelectedRouteId(null)
                      }}
                    >
                      <strong>{place.name}</strong>
                      <span>{countryNames.get(place.country) || place.country}{!isRenderablePlace(place) && ' · Not mapped'}</span>
                      {place.summary && <span>{place.summary}</span>}
                    </button>
                  ))}
                </div>
              )}
              {selectedPlace && (
                <div className="explore-preview">
                  <p className="eyebrow">SELECTED PLACE</p>
                  <h2>{selectedPlace.name}</h2>
                  <p>{countryNames.get(selectedPlace.country) || selectedPlace.country}</p>
                  {selectedPlace.summary && <p>{selectedPlace.summary}</p>}
                  <div className="explore-preview-actions">
                    <Link className="primary-button" to={`/places/${selectedPlace.slug}`}>View Place</Link>
                    <button type="button" className="secondary-button" onClick={() => setSelectedPlaceId(null)}>Deselect</button>
                  </div>
                </div>
              )}
            </>
          )}
        </aside>
        <div className="explore-map-wrap">
          <MapView
            className="explore-map"
            routes={visibleRoutes}
            places={visiblePlaces}
            selectedRouteId={activeSelectedRouteId}
            selectedPlaceId={activeSelectedPlaceId}
            onRouteSelect={(routeId) => {
              setSelectedRouteId(routeId)
              setSelectedPlaceId(null)
            }}
            onPlaceSelect={(placeId) => {
              setSelectedPlaceId(placeId)
              setSelectedRouteId(null)
            }}
            initialCenter={[50, 10]}
            initialZoom={4}
          />
          {activeView === 'routes' && routesStatus === 'success' && routes.length > 0 && renderableRouteCount === 0 && (
            <p className="explore-map-notice" role="status">
              Published routes are not currently map-renderable.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export default ExplorePage