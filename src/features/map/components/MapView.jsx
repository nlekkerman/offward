import { useMemo } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import MapErrorBoundary from './MapErrorBoundary.jsx'
import RouteLayer from './RouteLayer.jsx'
import SegmentLayer from './SegmentLayer.jsx'
import RouteEndpointLayer from './RouteEndpointLayer.jsx'
import PlaceLayer from './PlaceLayer.jsx'
import MapViewportController from './MapViewportController.jsx'
import MapResizeController from './MapResizeController.jsx'
import { MAP_TILE_LAYER } from '../tileConfig.js'
import { isRenderableRoute, getRenderablePlaces, getValidWaypoints, normalizeCenter } from '../mapGeometry.js'
import { WaypointMarkerZoomController } from '../waypointMarkerIcon.js'
import '../map.css'

function MapViewContent({
  children,
  className = '',
  initialCenter = [50.0, 10.0],
  initialZoom = 4,
  routes = [],
  waypoints = [],
  selectedRouteId = null,
  selectedWaypointId = null,
  places = [],
  selectedPlaceId = null,
  onRouteSelect,
  onWaypointSelect,
  onPlaceSelect,
  routeLineStyle,
  segments = [],
  selectedSegmentId = null,
  onSegmentSelect,
  routeFocusRequest = 0,
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
  const validPlaces = useMemo(() => getRenderablePlaces(places), [places])
  const validSegments = useMemo(() => {
    if (!Array.isArray(segments)) {
      return []
    }
    return segments.filter((segment) => typeof segment?.id === 'string' && isRenderableRoute(segment))
  }, [segments])

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
        <WaypointMarkerZoomController />
        <MapResizeController />
        <RouteLayer
          routes={validRoutes}
          selectedRouteId={selectedRouteId}
          onRouteSelect={onRouteSelect}
          routeLineStyle={routeLineStyle}
        />
        <SegmentLayer
          segments={validSegments}
          selectedSegmentId={selectedSegmentId}
          onSegmentSelect={onSegmentSelect}
        />
        <RouteEndpointLayer
          waypoints={validWaypoints}
          selectedWaypointId={selectedWaypointId}
          onWaypointSelect={onWaypointSelect}
        />
        <PlaceLayer places={validPlaces} selectedPlaceId={selectedPlaceId} onPlaceSelect={onPlaceSelect} />
        {(validRoutes.length > 0 || validSegments.length > 0 || validWaypoints.length > 0 || validPlaces.length > 0) && (
          <MapViewportController validRoutes={validRoutes} validSegments={validSegments} validWaypoints={validWaypoints} validPlaces={validPlaces} selectedRouteId={selectedRouteId} selectedSegmentId={selectedSegmentId} selectedWaypointId={selectedWaypointId} selectedPlaceId={selectedPlaceId} routeFocusRequest={routeFocusRequest} />
        )}
      </MapContainer>
      {children}
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
