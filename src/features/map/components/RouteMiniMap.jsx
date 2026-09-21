import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import MapErrorBoundary from './MapErrorBoundary.jsx'
import RouteLayer from './RouteLayer.jsx'
import { MAP_TILE_LAYER } from '../tileConfig.js'
import { isRenderableRoute, getCombinedBounds } from '../mapGeometry.js'
import { ROUTE_LINE_STYLE } from '../mapStyles.js'
import '../map.css'

// Fits the viewport to the Route geometry once on mount; the map is
// non-interactive so there is nothing else to react to afterwards.
function FitRouteBounds({ route }) {
  const map = useMap()

  useEffect(() => {
    const bounds = getCombinedBounds([route])
    if (bounds) {
      map.fitBounds(bounds, { padding: [10, 10], maxZoom: 15, animate: false })
    }
  }, [map, route])

  return null
}

/**
 * Compact, read-only Route preview for content cards (e.g. the homepage
 * Latest rail). Renders only OSM tiles and the Route line - no waypoint,
 * segment, or media overlays, and no editing/interaction controls.
 */
function RouteMiniMap({ route, className = '' }) {
  if (!isRenderableRoute(route)) {
    return null
  }

  return (
    <MapErrorBoundary fallback={null}>
      <div className={`route-mini-map ${className}`.trim()} aria-hidden="true">
        <MapContainer
          className="route-mini-map-inner"
          center={[0, 0]}
          zoom={2}
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
          boxZoom={false}
          keyboard={false}
          tap={false}
        >
          <TileLayer attribution={MAP_TILE_LAYER.attribution} url={MAP_TILE_LAYER.url} />
          <RouteLayer routes={[route]} routeLineStyle={ROUTE_LINE_STYLE} />
          <FitRouteBounds route={route} />
        </MapContainer>
      </div>
    </MapErrorBoundary>
  )
}

export default RouteMiniMap
