import { useMemo } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import MapErrorBoundary from './MapErrorBoundary.jsx'
import RouteLayer from './RouteLayer.jsx'
import RouteEndpointLayer from './RouteEndpointLayer.jsx'
import MapViewportController from './MapViewportController.jsx'
import { MAP_TILE_LAYER } from '../tileConfig.js'
import { isRenderableRoute, getValidWaypoints, normalizeCenter } from '../mapGeometry.js'
import '../map.css'

function MapViewContent({
  className = '',
  initialCenter = [50.0, 10.0],
  initialZoom = 4,
  routes = [],
  waypoints = [],
  selectedRouteId = null,
  selectedWaypointId = null,
  onRouteSelect,
  onWaypointSelect,
  routeLineStyle,
}) {
  const center = normalizeCenter(initialCenter)
  const zoom = typeof initialZoom === 'number' ? initialZoom : 4
  const containerClassName = `offward-map-container ${className}`.trim()

  const validRoutes = useMemo(() => {
    if (!Array.isArray(routes)) {
      return []
    }
    return routes.filter(isRenderableRoute)
  }, [routes])
  const validWaypoints = useMemo(() => getValidWaypoints(waypoints), [waypoints])

  return (
    <div className={containerClassName}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="offward-map-inner"
      >
        <TileLayer
          attribution={MAP_TILE_LAYER.attribution}
          url={MAP_TILE_LAYER.url}
        />
        <RouteLayer
          routes={validRoutes}
          selectedRouteId={selectedRouteId}
          onRouteSelect={onRouteSelect}
          routeLineStyle={routeLineStyle}
        />
        <RouteEndpointLayer
          waypoints={validWaypoints}
          selectedWaypointId={selectedWaypointId}
          onWaypointSelect={onWaypointSelect}
        />
        {(validRoutes.length > 0 || validWaypoints.length > 0) && (
          <MapViewportController validRoutes={validRoutes} validWaypoints={validWaypoints} selectedRouteId={selectedRouteId} />
        )}
      </MapContainer>
    </div>
  )
}

function MapView(props) {
  return (
    <MapErrorBoundary>
      <MapViewContent {...props} />
    </MapErrorBoundary>
  )
}

export default MapView
