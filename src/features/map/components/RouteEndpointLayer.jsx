import { useMemo } from 'react'
import { Marker } from 'react-leaflet'
import { getWaypointDisplayName } from '../../routes/routeMap/routeMapUtils.js'
import { createWaypointMarkerIcon } from '../waypointMarkerIcon.js'

// Renders start/finish/stop/via markers for a Route's waypoints.
// Note: markers select the associated waypoint (onWaypointSelect), matching
// the existing RoutePage itinerary interaction; there is no separate
// Route-level endpoint concept in the current data model. Public markers are
// read-only: click still selects a waypoint, but no editing UI is exposed.
function PublicWaypointMarker({ waypoint, mediaCount, selected, onWaypointSelect }) {
  const displayName = getWaypointDisplayName(waypoint)
  const hasMedia = mediaCount > 0
  const icon = useMemo(
    () => createWaypointMarkerIcon({
      order: waypoint.order,
      displayName,
      selected,
      hasMedia,
      extraClassNames: ['public-route-waypoint-marker', `is-${waypoint.markerType}`],
    }),
    [displayName, hasMedia, selected, waypoint.markerType, waypoint.order],
  )

  return (
    <Marker
      position={[waypoint.coordinates.lat, waypoint.coordinates.lng]}
      icon={icon}
      title={displayName}
      eventHandlers={onWaypointSelect ? { click: () => onWaypointSelect(waypoint.id) } : undefined}
    />
  )
}

function RouteEndpointLayer({ waypoints, waypointMediaCountById, selectedWaypointId, onWaypointSelect }) {
  return waypoints.map((waypoint) => (
    <PublicWaypointMarker
      key={waypoint.id}
      waypoint={waypoint}
      mediaCount={waypointMediaCountById.get(waypoint.id) || 0}
      selected={waypoint.id === selectedWaypointId}
      onWaypointSelect={onWaypointSelect}
    />
  ))
}

export default RouteEndpointLayer
