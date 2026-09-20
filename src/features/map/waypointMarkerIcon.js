import { useEffect } from 'react'
import L from 'leaflet'
import { useMapEvents } from 'react-leaflet'

// Single source of truth for waypoint marker zoom behaviour, shared by the
// management Route Map Editor and the public Route map.
// zoom < markerVisibleMinZoom          -> no markers rendered/visible at all
// markerVisibleMinZoom..enlargedMinZoom -> number + name, normal size
// zoom >= enlargedMinZoom              -> number + name, slightly larger marker/text
export const WAYPOINT_MARKER_ZOOM = {
  markerVisibleMinZoom: 8,
  nameVisibleMinZoom: 8,
  enlargedMinZoom: 13,
}

const ZOOM_CLASS_NAMES = ['route-marker-zoom-hidden', 'route-marker-zoom-mid', 'route-marker-zoom-high']

export function getWaypointMarkerZoomClass(zoom) {
  if (zoom < WAYPOINT_MARKER_ZOOM.markerVisibleMinZoom) return 'route-marker-zoom-hidden'
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
//  - .route-waypoint-pill: the single visible rounded pill (number + name
//    + reserved media slot) absolutely positioned at the wrapper's
//    bottom-left corner (left: 0; bottom: 0). Because it is anchored to
//    that corner - not centered - the pill can grow/shrink in width
//    without ever moving the wrapper's bottom-left point, which is also
//    the Leaflet iconAnchor. A small corner dot on the pill marks that
//    exact anchor point on the map.
const WRAPPER_WIDTH = 220
const WRAPPER_HEIGHT = 40

// Shared marker presentation: a single-line number + name pill anchored at
// its bottom-left corner (the geographic waypoint coordinate). Name
// visibility/size/truncation is controlled purely by CSS via the zoom
// classes above, so the icon does not need to be rebuilt on every zoomend.
export function createWaypointMarkerIcon({ order, displayName, selected = false, hasMedia = false, extraClassNames = [] }) {
  const className = ['route-waypoint-marker', ...extraClassNames, selected ? 'is-selected' : '', hasMedia ? 'has-media' : '']
    .filter(Boolean)
    .join(' ')

  const nameHtml = displayName
    ? `<span class="route-waypoint-name">${escapeMarkerText(displayName)}</span>`
    : ''

  // Only rendered when the Waypoint actually has attached media; otherwise
  // no icon markup exists at all (no empty reserved slot in the DOM).
  const mediaHtml = hasMedia
    ? '<span class="route-waypoint-media-slot" aria-hidden="true">▶</span>'
    : ''

  return L.divIcon({
    className,
    html: `<span class="route-waypoint-pill"><span class="route-waypoint-number">${escapeMarkerText(order)}</span>${nameHtml}${mediaHtml}</span>`,
    iconSize: [WRAPPER_WIDTH, WRAPPER_HEIGHT],
    iconAnchor: [0, WRAPPER_HEIGHT],
  })
}
