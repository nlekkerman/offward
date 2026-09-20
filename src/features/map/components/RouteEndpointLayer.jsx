import L from 'leaflet'
import { Marker } from 'react-leaflet'
import { getWaypointDisplayName } from '../../routes/routeMap/routeMapUtils.js'

// Renders start/finish/stop/via markers for a Route's waypoints.
// Note: markers select the associated waypoint (onWaypointSelect), matching
// the existing RoutePage itinerary interaction; there is no separate
// Route-level endpoint concept in the current data model.
function createWaypointIcon(waypoint, selected) {
  const markerClass = [
    'route-waypoint-marker',
    'public-route-waypoint-marker',
    `is-${waypoint.markerType}`,
    selected ? 'is-selected' : '',
  ].filter(Boolean).join(' ')

  return L.divIcon({
    className: markerClass,
    html: `<span>${waypoint.order}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function RouteEndpointLayer({ waypoints, selectedWaypointId, onWaypointSelect }) {
  return waypoints.map((waypoint) => {
    const selected = waypoint.id === selectedWaypointId
    return (
      <Marker
        key={waypoint.id}
        position={[waypoint.coordinates.lat, waypoint.coordinates.lng]}
        icon={createWaypointIcon(waypoint, selected)}
        title={getWaypointDisplayName(waypoint)}
        eventHandlers={onWaypointSelect ? { click: () => onWaypointSelect(waypoint.id) } : undefined}
      />
    )
  })
}

export default RouteEndpointLayer
