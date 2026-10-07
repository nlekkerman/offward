import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import MapErrorBoundary from '../map/components/MapErrorBoundary.jsx'
import MapResizeController from '../map/components/MapResizeController.jsx'
import RouteLayer from '../map/components/RouteLayer.jsx'
import PlaceLayer from '../map/components/PlaceLayer.jsx'
import { MAP_TILE_LAYER } from '../map/tileConfig.js'
import { getRenderablePlaces, isRenderableRoute } from '../map/mapGeometry.js'
import { getExploreBounds } from './exploreUtils.js'
import '../map/map.css'

function ExploreViewport({ routes, places, selectedId }) {
  const map = useMap()
  useEffect(() => {
    const bounds = getExploreBounds(routes, places, selectedId)
    if (bounds) map.fitBounds(bounds, { padding: [36, 36], maxZoom: selectedId ? 14 : 8, animate: false })
  }, [map, routes, places, selectedId])
  return null
}

export default function ExploreMapBrowser({ children, mode, items, country, status, selectedId, onSelect, onReset }) {
  const routes = mode === 'routes' ? items.filter(isRenderableRoute) : []
  const places = mode === 'places' ? getRenderablePlaces(items) : []
  const bounds = getExploreBounds(routes, places)
  const available = country && status === 'success' && bounds

  return (
    <div className="explore-discovery-browser">
      <div className="explore-browser-results">{children}</div>
      <section className="explore-browser-map" aria-label={`${mode === 'routes' ? 'Routes' : 'Places'} map`}>
        {available ? (
          <>
            <MapErrorBoundary>
              <div className="offward-map-container explore-discovery-map">
                <MapContainer center={bounds[0]} zoom={4} className="offward-map-inner" scrollWheelZoom={false}>
                  <TileLayer attribution={MAP_TILE_LAYER.attribution} url={MAP_TILE_LAYER.url} />
                  <MapResizeController />
                  {routes.map((route) => (
                    <RouteLayer key={route.id} routes={[route]} routeLineStyle={{ color: route.id === selectedId ? '#ff3838' : '#d9232e', weight: route.id === selectedId ? 6 : 3, opacity: 0.95 }} />
                  ))}
                  <PlaceLayer places={places} selectedPlaceId={selectedId} onPlaceSelect={onSelect} showPlaceLabel />
                  <ExploreViewport routes={routes} places={places} selectedId={selectedId} />
                </MapContainer>
              </div>
            </MapErrorBoundary>
            {selectedId && <button type="button" className="explore-discovery-button explore-map-reset" onClick={onReset}>Show country results</button>}
          </>
        ) : (
          <div className="explore-map-empty" role="status">
            <h3>{!country ? 'Choose a country' : status === 'loading' ? 'Loading map...' : status === 'error' ? 'Map unavailable' : 'No mapped results'}</h3>
          </div>
        )}
      </section>
    </div>
  )
}