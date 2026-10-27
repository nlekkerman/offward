import { useMemo } from 'react'
import { Marker } from 'react-leaflet'
import { getWaypointDisplayName } from '../../routes/routeMap/routeMapUtils.js'
import { createWaypointMarkerIcon } from '../waypointMarkerIcon.js'

// Renders start/finish/stop/via markers for a Route's waypoints.
// Public markers are read-only: click pins the rich detail overlay, while
// hover callbacks are attached only when the page detects a fine pointer.
function PublicWaypointMarker({ waypoint, mediaCount, selected, onWaypointSelect, onWaypointHoverStart, onWaypointHoverEnd }) {
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
      eventHandlers={{
        ...(onWaypointSelect ? { click: () => onWaypointSelect(waypoint.id) } : {}),
        ...(onWaypointHoverStart ? { mouseover: () => onWaypointHoverStart(waypoint.id) } : {}),
        ...(onWaypointHoverEnd ? { mouseout: onWaypointHoverEnd } : {}),
      }}
    />
  )
}

function RouteEndpointLayer({ waypoints, waypointMediaCountById, selectedWaypointId, onWaypointSelect, onWaypointHoverStart, onWaypointHoverEnd }) {
  return waypoints.map((waypoint) => (
    <PublicWaypointMarker
      key={waypoint.id}
      waypoint={waypoint}
      mediaCount={waypointMediaCountById.get(waypoint.id) || 0}
      selected={waypoint.id === selectedWaypointId}
      onWaypointSelect={onWaypointSelect}
      onWaypointHoverStart={onWaypointHoverStart}
      onWaypointHoverEnd={onWaypointHoverEnd}
    />
  ))
}

export default RouteEndpointLayer
