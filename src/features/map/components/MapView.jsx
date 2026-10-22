import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import MapErrorBoundary from './MapErrorBoundary.jsx'
import RouteLayer from './RouteLayer.jsx'
import SegmentLayer from './SegmentLayer.jsx'
import RouteEndpointLayer from './RouteEndpointLayer.jsx'
import PlaceLayer from './PlaceLayer.jsx'
import MapViewportController from './MapViewportController.jsx'
import MapResizeController from './MapResizeController.jsx'
import { MAP_TILE_LAYERS } from '../tileConfig.js'
import { isRenderableRoute, getRenderablePlaces, getValidWaypoints, normalizeCenter } from '../mapGeometry.js'
import { WaypointMarkerZoomController } from '../waypointMarkerIcon.js'
import '../map.css'

const BASEMAP_STORAGE_KEY = 'offward-public-basemap'
const DEFAULT_BASEMAP_ID = 'standard'

function getStoredBasemapId() {
  try {
    const storedId = window.sessionStorage.getItem(BASEMAP_STORAGE_KEY)
    return Object.prototype.hasOwnProperty.call(MAP_TILE_LAYERS, storedId) ? storedId : DEFAULT_BASEMAP_ID
  } catch (error) {
    console.warn('Unable to read the saved basemap preference.', error)
    return DEFAULT_BASEMAP_ID
  }
}

function MapViewContent({
  children,
  className = '',
  showBasemapSwitcher = false,
  initialCenter = [50.0, 10.0],
  initialZoom = 4,
  routes = [],
  waypoints = [],
  waypointMediaCountById = new Map(),
  selectedRouteId = null,
  selectedWaypointId = null,
  directionsStartWaypointId = null,
  places = [],
  selectedPlaceId = null,
  directionsPlaceId = null,
  showPlaceLabel = false,
  onRouteSelect,
  onWaypointSelect,
  onWaypointHoverStart,
  onWaypointHoverEnd,
  onWaypointVisibilityChange,
  onPlaceSelect,
  routeLineStyle,
  segments = [],
  selectedSegmentId = null,
  onSegmentSelect,
  routeFocusRequest = 0,
  resetViewWhenRoutesEmpty = false,
  followEnabled = false,
  mapChildren = null,
}) {
  const [basemapId, setBasemapId] = useState(() => (
    showBasemapSwitcher ? getStoredBasemapId() : DEFAULT_BASEMAP_ID
  ))
  const [basemapMenuOpen, setBasemapMenuOpen] = useState(false)
  const [tileError, setTileError] = useState(false)
  const basemapControlRef = useRef(null)
  const basemapTriggerRef = useRef(null)
  const tileErrorTimeoutRef = useRef(null)
  const center = normalizeCenter(initialCenter)
  const zoom = typeof initialZoom === 'number' ? initialZoom : 4
  const containerClassName = `offward-map-container ${className}`.trim()
  const activeBasemap = showBasemapSwitcher
    ? MAP_TILE_LAYERS[basemapId]
    : MAP_TILE_LAYERS[DEFAULT_BASEMAP_ID]

  useEffect(() => () => window.clearTimeout(tileErrorTimeoutRef.current), [])

  useEffect(() => {
    if (!basemapMenuOpen) {
      return undefined
    }

    const dismissMenu = (event) => {
      if (event.type === 'keydown' && event.key === 'Escape') {
        setBasemapMenuOpen(false)
        basemapTriggerRef.current?.focus()
      } else if (event.type === 'pointerdown' && !basemapControlRef.current?.contains(event.target)) {
        setBasemapMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', dismissMenu)
    document.addEventListener('keydown', dismissMenu)
    return () => {
      document.removeEventListener('pointerdown', dismissMenu)
      document.removeEventListener('keydown', dismissMenu)
    }
  }, [basemapMenuOpen])

  const selectBasemap = (id) => {
    setBasemapId(id)
    try {
      window.sessionStorage.setItem(BASEMAP_STORAGE_KEY, id)
    } catch (error) {
      console.warn('Unable to save the basemap preference for this session.', error)
    }
    setBasemapMenuOpen(false)
    setTileError(false)
    window.clearTimeout(tileErrorTimeoutRef.current)
  }

  const handleTileError = () => {
    setTileError(true)
    window.clearTimeout(tileErrorTimeoutRef.current)
    tileErrorTimeoutRef.current = window.setTimeout(() => setTileError(false), 5000)
  }

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
          key={activeBasemap.id}
          attribution={activeBasemap.attribution}
          url={activeBasemap.url}
          subdomains={activeBasemap.subdomains}
          minZoom={activeBasemap.minZoom}
          maxNativeZoom={activeBasemap.maxNativeZoom}
          maxZoom={activeBasemap.maxZoom}
          eventHandlers={{ tileerror: handleTileError }}
        />
        {mapChildren}
        <WaypointMarkerZoomController onVisibilityChange={onWaypointVisibilityChange} />
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
          waypointMediaCountById={waypointMediaCountById}
          selectedWaypointId={selectedWaypointId}
          directionsStartWaypointId={directionsStartWaypointId}
          onWaypointSelect={onWaypointSelect}
          onWaypointHoverStart={onWaypointHoverStart}
          onWaypointHoverEnd={onWaypointHoverEnd}
        />
        <PlaceLayer places={validPlaces} selectedPlaceId={selectedPlaceId} directionsPlaceId={directionsPlaceId} onPlaceSelect={onPlaceSelect} showPlaceLabel={showPlaceLabel} />
        {(resetViewWhenRoutesEmpty || validRoutes.length > 0 || validSegments.length > 0 || validWaypoints.length > 0 || validPlaces.length > 0) && (
          <MapViewportController validRoutes={validRoutes} validSegments={validSegments} validWaypoints={validWaypoints} validPlaces={validPlaces} selectedRouteId={selectedRouteId} selectedSegmentId={selectedSegmentId} selectedWaypointId={selectedWaypointId} selectedPlaceId={selectedPlaceId} routeFocusRequest={routeFocusRequest} resetViewWhenRoutesEmpty={resetViewWhenRoutesEmpty} initialCenter={center} initialZoom={zoom} followEnabled={followEnabled} />
        )}
      </MapContainer>
      {showBasemapSwitcher && (
        <div
          className="map-basemap-control"
          ref={basemapControlRef}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="map-basemap-trigger"
            ref={basemapTriggerRef}
            aria-expanded={basemapMenuOpen}
            aria-controls="map-basemap-options"
            aria-label={`Choose basemap, currently ${activeBasemap.name}`}
            onClick={() => setBasemapMenuOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="m12 3 9 5-9 5-9-5 9-5Z" />
              <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
            </svg>
            <span>{activeBasemap.name}</span>
          </button>
          <div
            className="map-basemap-options"
            id="map-basemap-options"
            role="group"
            aria-label="Basemap"
            hidden={!basemapMenuOpen}
          >
            {Object.values(MAP_TILE_LAYERS).map((layer) => (
              <button
                type="button"
                className={`map-basemap-option${layer.id === basemapId ? ' is-selected' : ''}`}
                key={layer.id}
                aria-pressed={layer.id === basemapId}
                onClick={() => selectBasemap(layer.id)}
              >
                {layer.name}
              </button>
            ))}
          </div>
          {tileError && (
            <p className="map-basemap-error" role="status">
              Some basemap tiles could not be loaded.
            </p>
          )}
        </div>
      )}
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
