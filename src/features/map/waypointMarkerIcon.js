import { useEffect } from 'react'
import L from 'leaflet'
import { useMapEvents } from 'react-leaflet'

// Single source of truth for waypoint marker zoom behaviour, shared by the
// management Route Map Editor and the public Route map.
// zoom < nameVisibleMinZoom       -> number only, compact marker
// nameVisibleMinZoom..enlargedMinZoom -> number + name, normal size
// zoom >= enlargedMinZoom         -> number + name, slightly larger marker/text
export const WAYPOINT_MARKER_ZOOM = {
  nameVisibleMinZoom: 8,
  enlargedMinZoom: 13,
}

const ZOOM_CLASS_NAMES = ['route-marker-zoom-low', 'route-marker-zoom-mid', 'route-marker-zoom-high']

export function getWaypointMarkerZoomClass(zoom) {
  if (zoom < WAYPOINT_MARKER_ZOOM.nameVisibleMinZoom) return 'route-marker-zoom-low'
  if (zoom >= WAYPOINT_MARKER_ZOOM.enlargedMinZoom) return 'route-marker-zoom-high'
  return 'route-marker-zoom-mid'
}

function applyWaypointMarkerZoomClass(map) {
  const container = map.getContainer()
  container.classList.remove(...ZOOM_CLASS_NAMES)
  container.classList.add(getWaypointMarkerZoomClass(map.getZoom()))
}

// Mount once inside a MapContainer to keep marker zoom classes in sync.
export function WaypointMarkerZoomController() {
  const map = useMapEvents({
    zoomend() {
      applyWaypointMarkerZoomClass(map)
    },
  })

  useEffect(() => {
    const container = map.getContainer()
    applyWaypointMarkerZoomClass(map)
    return () => container.classList.remove(...ZOOM_CLASS_NAMES)
  }, [map])

  return null
}

function escapeMarkerText(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

// The marker DOM has two layers:
//  - .route-waypoint-marker: the Leaflet icon element itself. Its size is
//    fixed (WRAPPER_WIDTH x WRAPPER_HEIGHT) purely so Leaflet has a stable
//    box to anchor; it is otherwise invisible and ignores pointer events.
//  - .route-waypoint-body: the visible pin (number + name + pointed tip
//    clipped into one silhouette), absolutely positioned bottom-center
//    within the wrapper with a fixed, narrow width (via CSS) so the name
//    wraps onto extra lines instead of widening the pin, and its bottom
//    tip never moves off the anchored coordinate.
const WRAPPER_WIDTH = 140
const WRAPPER_HEIGHT = 64

// Shared marker presentation: number + name live inside one unified pin body.
// Name visibility/size is controlled purely by CSS via the zoom classes
// above, so the icon does not need to be rebuilt on every zoomend.
export function createWaypointMarkerIcon({ order, displayName, selected = false, extraClassNames = [] }) {
  const className = ['route-waypoint-marker', ...extraClassNames, selected ? 'is-selected' : '']
    .filter(Boolean)
    .join(' ')

  const nameHtml = displayName
    ? `<span class="route-waypoint-name">${escapeMarkerText(displayName)}</span>`
    : ''

  return L.divIcon({
    className,
    html: `<span class="route-waypoint-body"><span class="route-waypoint-number">${escapeMarkerText(order)}</span>${nameHtml}<span class="route-waypoint-media-slot" aria-hidden="true"></span></span>`,
    iconSize: [WRAPPER_WIDTH, WRAPPER_HEIGHT],
    iconAnchor: [WRAPPER_WIDTH / 2, WRAPPER_HEIGHT],
  })
}
