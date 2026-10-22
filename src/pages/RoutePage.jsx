import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import MapView from '../features/map/components/MapView.jsx'
import RouteDirectionsLayer from '../features/map/components/RouteDirectionsLayer.jsx'
import RouteUserLocationLayer from '../features/map/components/RouteUserLocationLayer.jsx'
import { isRenderableRoute } from '../features/map/mapGeometry.js'
import { createRouteArrivalDetector } from '../features/map/routeProximity.js'
import { MAX_LOCAL_DIRECTIONS_KM } from '../services/routeDirectionsApi.js'
import EntityMediaSection from '../features/routes/components/EntityMediaSection.jsx'
import RouteMapDetailOverlay from '../features/routes/components/RouteMapDetailOverlay.jsx'
import RouteMediaGrid from '../features/routes/components/RouteMediaGrid.jsx'
import RoutePlacesAlongRoute from '../features/routes/components/RoutePlacesAlongRoute.jsx'
import RelatedFood from '../features/food/RelatedFood.jsx'
import { getRouteFoodIds, publicRelationshipIds } from '../features/food/publicFoodResolution.js'
import { getAttachedMediaCount, normalizeMediaIds, orderedCollectionImages, orderedImageCollections, resolveAttachedVideos, resolveImageCollections } from '../features/routes/components/routeMediaUtils.js'
import RouteSections from '../features/routes/components/RouteSections.jsx'
import { getCountries } from '../services/countriesApi.js'
import { getPublicImageCollection } from '../services/imageCollectionsApi.js'
import { getPublicRouteBySlug } from '../services/routesApi.js'
import { getPublicVideos } from '../services/videosApi.js'
import CountryFlag from '../shared/components/CountryFlag.jsx'
import DetailHero from '../shared/components/DetailHero.jsx'
import ImageLightbox from '../shared/components/ImageLightbox.jsx'
import PageMetadata from '../shared/components/PageMetadata.jsx'
import ShareControl from '../shared/components/ShareControl.jsx'
import useUserLocation from '../shared/hooks/useUserLocation.js'
import { countryName, findCountry } from '../shared/utils/country.js'
import { getContentDescription, getContentSocialImage, getPublicUrl } from '../shared/utils/publicUrls.js'
import VideoPlayerDialog from '../features/video/VideoPlayerDialog.jsx'
import NotFoundPage from './NotFoundPage.jsx'

const ROUTE_DETAIL_LINE_STYLE = {
  color: '#4F8A3C',
  weight: 7,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round',
}

const WAYPOINT_HOVER_QUERY = '(hover: hover) and (pointer: fine)'
const HOVER_CLOSE_DELAY_MS = 300

function useHoverCapability() {
  const [supportsHover, setSupportsHover] = useState(false)

  useEffect(() => {
    const query = window.matchMedia(WAYPOINT_HOVER_QUERY)
    const update = () => setSupportsHover(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])

  return supportsHover
}

function formatActivity(value) {
  if (!value || typeof value !== 'string') {
    return 'Route'
  }

  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getOrderedRouteWaypoints(route) {
  if (!Array.isArray(route?.waypoints)) {
    return []
  }

  return route.waypoints
    .filter((waypoint) => waypoint && typeof waypoint === 'object' && waypoint.route_id === route.id && typeof waypoint.id === 'string')
    .map((waypoint, index) => ({
      ...waypoint,
      order: Number.isFinite(Number(waypoint.order)) ? Number(waypoint.order) : index + 1,
    }))
    .sort((a, b) => a.order - b.order)
}

function getWaypointTitle(waypoint) {
  return waypoint?.name || waypoint?.label || waypoint?.place_name || `Waypoint ${waypoint?.order}`
}

function getMapEntityDetailPath(routeSlug, detail) {
  if (!routeSlug || !detail?.id) return null
  if (detail.type === 'waypoint') return `/routes/${encodeURIComponent(routeSlug)}/waypoints/${encodeURIComponent(detail.id)}`
  if (detail.type === 'segment') return `/routes/${encodeURIComponent(routeSlug)}/segments/${encodeURIComponent(detail.id)}`
  return null
}

function RoutePage() {
  const { routeSlug } = useParams()
  const navigate = useNavigate()
  const [routeResult, setRouteResult] = useState({ slug: null, status: 'loading', route: null })
  const routeStatus = routeResult.slug === routeSlug ? routeResult.status : 'loading'
  const route = routeResult.slug === routeSlug ? routeResult.route : null
  const [countries, setCountries] = useState([])
  const [countriesStatus, setCountriesStatus] = useState('loading')
  const [selectedWaypointId, setSelectedWaypointId] = useState(null)
  const [hoveredWaypointId, setHoveredWaypointId] = useState(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState(null)
  const [videoCatalog, setVideoCatalog] = useState({ status: 'idle', videos: [] })
  const [activeVideo, setActiveVideo] = useState(null)
  const [lightbox, setLightbox] = useState({ gallery: null, index: -1 })
  const [galleryLoadingId, setGalleryLoadingId] = useState(null)
  const [galleryErrorByCollectionId, setGalleryErrorByCollectionId] = useState({})
  const galleryCacheRef = useRef(new Map())
  const [routeFocusRequest, setRouteFocusRequest] = useState(0)
  const [navigationState, setNavigationState] = useState('idle')
  const [directionsMode, setDirectionsMode] = useState('walking')
  const [directionsStatus, setDirectionsStatus] = useState(null)
  const [locationFollowing, setLocationFollowing] = useState(false)
  const [independentTracking, setIndependentTracking] = useState(false)
  const [recenterRequest, setRecenterRequest] = useState(0)
  const [locationCenterRequest, setLocationCenterRequest] = useState(0)
  const arrivalDetectorRef = useRef(createRouteArrivalDetector())
  const hoverCloseTimerRef = useRef(null)
  const supportsHover = useHoverCapability()
  const handleLocationUpdate = useCallback((position) => {
    if (navigationState !== 'approaching') return
    const arrived = arrivalDetectorRef.current.process(
      position,
      route?.is_map_renderable === true ? route.geometry : null,
      directionsMode,
    )
    if (arrived) {
      setNavigationState('exploring')
      setLocationFollowing(true)
      setDirectionsStatus(null)
    }
  }, [directionsMode, navigationState, route])
  const {
    position: userPosition,
    active: locationActive,
    error: locationError,
    loading: locationLoading,
    start: startLocation,
    stop: stopLocation,
    locate: locateLocation,
  } = useUserLocation(handleLocationUpdate)
  const directionsSessionActive = navigationState !== 'idle'

  useEffect(() => {
    if (!independentTracking && !directionsSessionActive && locationActive) {
      stopLocation()
    }
  }, [directionsSessionActive, independentTracking, locationActive, stopLocation])

  useEffect(() => () => window.clearTimeout(hoverCloseTimerRef.current), [])

  useEffect(() => {
    let isCurrent = true

    async function loadRoute() {
      setSelectedWaypointId(null)
      setSelectedSegmentId(null)
      setNavigationState('idle')
      setDirectionsMode('walking')
      setDirectionsStatus(null)
      setLocationFollowing(false)
      setIndependentTracking(false)
      arrivalDetectorRef.current.reset()
      stopLocation()
      setActiveVideo(null)
      setLightbox({ gallery: null, index: -1 })
      try {
        const data = await getPublicRouteBySlug(routeSlug)
        if (!isCurrent) {
          return
        }

        setRouteResult({ slug: routeSlug, status: data ? 'success' : 'not-found', route: data })
      } catch {
        if (isCurrent) {
          setRouteResult({ slug: routeSlug, status: 'error', route: null })
        }
      }
    }

    loadRoute()

    return () => {
      isCurrent = false
    }
  }, [routeSlug, stopLocation])

  useEffect(() => {
    let isCurrent = true

    async function loadCountries() {
      try {
        const data = await getCountries()
        if (isCurrent) {
          setCountries(data)
          setCountriesStatus('success')
        }
      } catch {
        if (isCurrent) {
          setCountries([])
          setCountriesStatus('error')
        }
      }
    }

    loadCountries()

    return () => {
      isCurrent = false
    }
  }, [])

  const countryNames = useMemo(() => new Map(countries.map((country) => [country.slug, country.name])), [countries])
  const waypoints = useMemo(() => getOrderedRouteWaypoints(route), [route])
  const canonicalStartWaypoint = useMemo(() => {
    if (route?.id === null || route?.id === undefined || !Array.isArray(route?.waypoints)) return null
    const starts = route.waypoints.filter((item) =>
      item &&
      typeof item === 'object' &&
      item.type === 'start' &&
      item.route_id === route.id
    )
    if (starts.length !== 1) return null
    const waypoint = starts[0]
    const latitude = waypoint?.coordinates?.lat
    const longitude = waypoint?.coordinates?.lng
    if (
      typeof waypoint.id !== 'string' ||
      waypoint.id.length === 0 ||
      typeof latitude !== 'number' ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      typeof longitude !== 'number' ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null
    }
    return waypoint
  }, [route])
  const segments = useMemo(() => (Array.isArray(route?.segments) ? route.segments : []), [route])
  const foodIds = useMemo(() => getRouteFoodIds(route), [route])
  const routeImageCollections = useMemo(() => orderedImageCollections(route), [route])
  const cancelHoverClose = () => {
    window.clearTimeout(hoverCloseTimerRef.current)
    hoverCloseTimerRef.current = null
  }
  const clearHoveredWaypoint = () => {
    cancelHoverClose()
    setHoveredWaypointId(null)
  }
  const previewWaypoint = (waypointId) => {
    if (!supportsHover || selectedWaypointId || selectedSegmentId) return
    cancelHoverClose()
    setHoveredWaypointId(waypointId)
  }
  const scheduleHoverClose = () => {
    if (!supportsHover || selectedWaypointId || selectedSegmentId) return
    cancelHoverClose()
    hoverCloseTimerRef.current = window.setTimeout(() => setHoveredWaypointId(null), HOVER_CLOSE_DELAY_MS)
  }
  const selectWaypoint = (waypointId) => {
    clearHoveredWaypoint()
    setSelectedSegmentId(null)
    setSelectedWaypointId((currentId) => currentId === waypointId ? null : waypointId)
  }
  const selectSegment = (segmentId) => {
    clearHoveredWaypoint()
    setSelectedWaypointId(null)
    setSelectedSegmentId((currentId) => currentId === segmentId ? null : segmentId)
  }
  const openGallery = async (gallery, startIndex = 0) => {
    const collectionId = gallery?.id ? String(gallery.id) : ''
    if (!collectionId || galleryLoadingId === collectionId) return

    const embeddedImages = orderedCollectionImages(gallery)
    if (embeddedImages.length > 0) {
      setLightbox({ gallery: { ...gallery, images: embeddedImages }, index: Math.min(startIndex, embeddedImages.length - 1) })
      return
    }

    setGalleryErrorByCollectionId((current) => ({ ...current, [collectionId]: null }))
    const cached = galleryCacheRef.current.get(collectionId)
    if (cached) {
      const images = orderedCollectionImages(cached)
      if (images.length > 0) {
        setLightbox({ gallery: { ...cached, images }, index: Math.min(startIndex, images.length - 1) })
        return
      }
    }

    setGalleryLoadingId(collectionId)
    try {
      const collection = await getPublicImageCollection(collectionId)
      const images = orderedCollectionImages(collection)
      if (!images.length) {
        throw new Error('No public images are available in this gallery.')
      }
      galleryCacheRef.current.set(collectionId, collection)
      setLightbox({ gallery: { ...collection, images }, index: Math.min(startIndex, images.length - 1) })
    } catch {
      setGalleryErrorByCollectionId((current) => ({ ...current, [collectionId]: 'Unable to load gallery images. Try again.' }))
    } finally {
      setGalleryLoadingId((current) => (current === collectionId ? null : current))
    }
  }

  const unresolvedVideoIds = useMemo(() => [
    ...normalizeMediaIds(route?.video_ids ?? route?.media_ids),
    ...segments.flatMap((segment) => normalizeMediaIds(segment.media_ids ?? segment.video_ids)),
    ...waypoints.flatMap((waypoint) => normalizeMediaIds(waypoint.media_ids ?? waypoint.video_ids)),
  ], [route, segments, waypoints])
  const hasAnyAttachedMedia = useMemo(
    () => unresolvedVideoIds.length > 0,
    [unresolvedVideoIds],
  )

  // Videos load independently, resolved against the public Video list - the
  // same pattern used for public Story media. Only fetched when at least one
  // Route/Segment/Waypoint media id exists.
  useEffect(() => {
    if (!hasAnyAttachedMedia) {
      return undefined
    }

    let isCurrent = true

    async function loadVideos() {
      try {
        const data = await getPublicVideos()
        if (isCurrent) {
          setVideoCatalog({ status: 'success', videos: data })
        }
      } catch {
        if (isCurrent) {
          setVideoCatalog({ status: 'error', videos: [] })
        }
      }
    }

    loadVideos()
    return () => {
      isCurrent = false
    }
  }, [hasAnyAttachedMedia])

  const videoById = useMemo(() => new Map(videoCatalog.videos.map((video) => [String(video.id), video])), [videoCatalog.videos])
  const routeVideos = useMemo(() => resolveAttachedVideos(route, videoById), [route, videoById])
  const lightboxImages = lightbox.gallery?.images || []
  const closeVideoDialog = useCallback(() => setActiveVideo(null), [])
  const waypointMediaCountById = useMemo(() => new Map(waypoints.map((waypoint) => [
    waypoint.id,
    getAttachedMediaCount(waypoint, videoById),
  ])), [videoById, waypoints])
  const activeWaypointId = selectedSegmentId ? null : selectedWaypointId || hoveredWaypointId
  const mapDetail = useMemo(() => {
    const waypoint = waypoints.find((item) => item.id === activeWaypointId)
    if (waypoint) {
      return {
        id: waypoint.id,
        type: 'waypoint',
        eyebrow: `Waypoint ${waypoint.order}`,
        title: getWaypointTitle(waypoint),
        subtitle: String(waypoint.type || 'via').toUpperCase(),
        summary: waypoint.summary || waypoint.note || waypoint.description || '',
        foodIds: publicRelationshipIds(waypoint.food_ids),
        videos: resolveAttachedVideos(waypoint, videoById),
        imageCollections: resolveImageCollections(waypoint),
      }
    }

    const segment = segments.find((item) => item.id === selectedSegmentId)
    if (!segment) return null
    const start = waypoints.find((waypointItem) => waypointItem.id === segment.start_waypoint_id)
    const end = waypoints.find((waypointItem) => waypointItem.id === segment.end_waypoint_id)
    return {
      id: segment.id,
      type: 'segment',
      eyebrow: `Section ${segment.order}`,
      title: segment.title || `${getWaypointTitle(start)} → ${getWaypointTitle(end)}`,
      subtitle: start && end ? `${getWaypointTitle(start)} → ${getWaypointTitle(end)}` : '',
      summary: segment.summary || segment.note || '',
      foodIds: publicRelationshipIds(segment.food_ids),
      videos: resolveAttachedVideos(segment, videoById),
      imageCollections: resolveImageCollections(segment),
    }
  }, [activeWaypointId, segments, selectedSegmentId, videoById, waypoints])
  const closeMapDetail = () => {
    clearHoveredWaypoint()
    setSelectedWaypointId(null)
    setSelectedSegmentId(null)
  }
  const handleWaypointVisibilityChange = (isVisible) => {
    if (isVisible) return
    clearHoveredWaypoint()
    setSelectedWaypointId(null)
  }
  const showFullRoute = () => {
    setLocationFollowing(false)
    setRouteFocusRequest((current) => current + 1)
  }
  const locateCurrentPosition = () => {
    locateLocation(() => setLocationCenterRequest((current) => current + 1))
  }
  const startFollowing = () => {
    setIndependentTracking(true)
    setLocationFollowing(true)
    if (!locationActive) startLocation()
  }
  const stopFollowing = () => {
    setIndependentTracking(false)
    setLocationFollowing(false)
  }
  const startDirections = () => {
    if (!canonicalStartWaypoint) return
    arrivalDetectorRef.current.reset()
    if (!locationActive) startLocation()
    setDirectionsStatus({ status: 'locating' })
    setNavigationState('approaching')
  }
  const stopDirections = () => {
    setNavigationState('idle')
    setLocationFollowing(independentTracking)
    setDirectionsMode('walking')
    setDirectionsStatus(null)
  }
  const stopTracking = () => {
    arrivalDetectorRef.current.reset()
    setIndependentTracking(false)
    stopLocation()
    setNavigationState('idle')
    setLocationFollowing(false)
    setDirectionsMode('walking')
    setDirectionsStatus(null)
  }
  const recenterOnLocation = () => {
    if (!userPosition) return
    setLocationFollowing(true)
    setRecenterRequest((current) => current + 1)
  }
  const retryLocation = () => {
    if (directionsSessionActive) {
      startDirections()
    } else if (independentTracking) {
      startFollowing()
    } else {
      locateCurrentPosition()
    }
  }
  const handleManualMapMovement = useCallback(() => {
    setLocationFollowing(false)
  }, [])
  const handleDirectionsStatusChange = useCallback((status) => {
    setDirectionsStatus(status)
  }, [])
  const handleTravelModeChange = (mode) => {
    arrivalDetectorRef.current.reset()
    setDirectionsMode(mode)
  }
  const viewMapEntityDetails = (detail) => {
    const target = getMapEntityDetailPath(routeSlug, detail)
    if (target) navigate(target)
  }
  const mapRoute = route && route.is_map_renderable === true && isRenderableRoute(route) ? route : null
  const hasMalformedGeometry = route?.geometry && route?.is_map_renderable === true && !mapRoute
  const countryValue = route?.country
  const country = findCountry(countries, countryValue)
  const countryFallback = typeof countryValue === 'string'
    ? countryNames.get(countryValue) || countryValue
    : countryName(countryValue, countryValue?.slug || countryValue?.code || '')
  const countryLabel = countryName(country, countryFallback) || 'Country pending'
  const activityLabel = formatActivity(route?.activity_type)
  const routeTitle = route?.title || 'Route'
  const directionsActive = navigationState === 'approaching'
  const routeDescription = getContentDescription(route?.summary, routeTitle, route?.country ? countryLabel : '')
  const routePath = `/routes/${encodeURIComponent(routeSlug)}`
  const routeUrl = getPublicUrl(routePath)
  if (routeStatus === 'loading') {
    return <section className="route-detail-page"><p className="route-detail-status" role="status">Loading route...</p></section>
  }

  if (routeStatus === 'not-found') {
    return <NotFoundPage />
  }

  if (routeStatus === 'error') {
    return (
      <section className="route-detail-page">
        <Link className="route-detail-back" to="/explore">Back to Explore</Link>
        <div className="route-detail-error" role="alert">
          <p className="eyebrow">ROUTE UNAVAILABLE</p>
          <h1>Unable to load this Route</h1>
          <p>There was a network or server problem loading the Route detail. Try again from Explore.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="route-detail-page route-public-detail-page">
      <PageMetadata
        title={routeTitle}
        description={routeDescription}
        path={routePath}
        image={getContentSocialImage(route)}
      />
      <DetailHero>
        <header className="route-detail-header">
          <div>
            <p className="eyebrow">PUBLIC ROUTE</p>
            <h1>{routeTitle}</h1>
            <ShareControl type="route" title={routeTitle} url={routeUrl} description={typeof route.summary === 'string' && route.summary.trim() ? route.summary.trim() : undefined} />
          </div>
          <div className="route-detail-meta" aria-label="Route metadata">
            <span className="country-identity-inline"><CountryFlag code={country?.code} decorative />{countryLabel}</span>
            <span>{activityLabel}</span>
          </div>
          {countriesStatus === 'error' && <p className="route-detail-muted" role="status">Country details are unavailable, so the canonical country slug is shown.</p>}
        </header>
      </DetailHero>
      <Link className="route-detail-back" to="/explore">Back to Explore</Link>

      <div className="route-detail-content-grid">
        <section className="route-map-section" aria-labelledby="route-map-title">
          <div className="route-map-heading">
            <h2 id="route-map-title">Route Map</h2>
            <details className="public-map-actions-menu">
              <summary className="public-map-actions-trigger">Actions</summary>
              <div className="public-map-actions-content">
                <div className="route-directions-controls">
              <button
                type="button"
                className={`route-directions-button ${directionsActive ? 'danger-button' : 'primary-button'}`}
                onClick={directionsActive ? stopDirections : startDirections}
                disabled={!directionsActive && !canonicalStartWaypoint}
                aria-describedby={(directionsStatus || !canonicalStartWaypoint) ? 'route-directions-feedback' : undefined}
              >
                {directionsActive ? 'Stop directions' : 'Directions to start'}
              </button>
              {!canonicalStartWaypoint && (
                <p className="route-directions-feedback" id="route-directions-feedback">
                  Directions are unavailable because this Route does not have exactly one valid, Route-owned starting waypoint.
                </p>
              )}
              {directionsActive && (
                <div className="route-directions-modes" role="group" aria-label="Directions travel mode">
                  <button
                    type="button"
                    className="route-directions-mode"
                    aria-pressed={directionsMode === 'walking'}
                    onClick={() => handleTravelModeChange('walking')}
                  >
                    Walking
                  </button>
                  <button
                    type="button"
                    className="route-directions-mode"
                    aria-pressed={directionsMode === 'driving'}
                    onClick={() => handleTravelModeChange('driving')}
                  >
                    Driving
                  </button>
                </div>
              )}
              {directionsActive && !locationError && directionsStatus?.status === 'locating' && (
                <p className="route-directions-feedback" id="route-directions-feedback" role="status">Waiting for your location...</p>
              )}
              {directionsActive && directionsStatus?.status === 'routing' && (
                <p className="route-directions-feedback" id="route-directions-feedback" role="status">
                  Calculating {directionsMode === 'walking' ? 'walking' : 'driving'} directions...
                </p>
              )}
              {directionsActive && directionsStatus?.status === 'too-far' && (
                <p className="route-directions-feedback" id="route-directions-feedback" role="status">
                  You're more than {MAX_LOCAL_DIRECTIONS_KM} km from this Route's starting point. Directions are available when you're closer.
                </p>
              )}
              {directionsActive && directionsStatus?.status === 'ready' && (
                <p className="route-directions-feedback" id="route-directions-feedback" role="status">
                  {directionsMode === 'walking' ? 'Walking' : 'Driving'} route: {directionsStatus.distanceKm.toFixed(1)} km
                </p>
              )}
              {directionsStatus?.status === 'error' && (
                <p className="route-directions-feedback is-error" id="route-directions-feedback" role="alert">
                  {directionsStatus.message}
                </p>
              )}
              {locationError && (
                <p className="route-directions-feedback is-error" role="alert">
                  {locationError}{' '}
                  <button type="button" className="route-directions-mode" onClick={retryLocation}>
                    Retry location
                  </button>
                </p>
              )}
                </div>
                <div className="route-header-location-controls" role="group" aria-label="Location tracking controls">
                  {!directionsSessionActive && (
                    <>
                      <button
                        type="button"
                        className="route-location-control"
                        onClick={locateCurrentPosition}
                        disabled={locationLoading || locationActive}
                      >
                        {locationLoading ? 'Locating...' : 'Where Am I?'}
                      </button>
                      {independentTracking ? (
                        <button type="button" className="route-location-control" onClick={stopFollowing}>
                          Stop Following
                        </button>
                      ) : (
                        <button type="button" className="route-location-control" onClick={startFollowing}>
                          Follow Me
                        </button>
                      )}
                    </>
                  )}
                  {userPosition && (
                    <button
                      type="button"
                      className="route-location-control"
                      onClick={recenterOnLocation}
                    >
                      Recenter
                    </button>
                  )}
                  {directionsSessionActive && (
                    <button type="button" className="route-location-control" onClick={stopTracking}>
                      Stop tracking
                    </button>
                  )}
                </div>
              </div>
            </details>
          </div>
          {(!route.geometry || route.is_map_renderable === false) && <p className="route-map-message">This Route does not yet have a published map path.</p>}
          {hasMalformedGeometry && <p className="route-map-message" role="status">The published map path could not be displayed.</p>}
          <MapView
            className="route-detail-map"
            showBasemapSwitcher
            routes={mapRoute ? [mapRoute] : []}
            waypoints={waypoints}
            waypointMediaCountById={waypointMediaCountById}
            selectedWaypointId={selectedWaypointId}
            directionsStartWaypointId={directionsActive ? canonicalStartWaypoint?.id : null}
            onWaypointSelect={selectWaypoint}
            onWaypointHoverStart={supportsHover ? previewWaypoint : undefined}
            onWaypointHoverEnd={supportsHover ? scheduleHoverClose : undefined}
            onWaypointVisibilityChange={handleWaypointVisibilityChange}
            routeLineStyle={{ ...ROUTE_DETAIL_LINE_STYLE, opacity: selectedSegmentId ? 0.35 : ROUTE_DETAIL_LINE_STYLE.opacity, weight: selectedSegmentId ? 5 : ROUTE_DETAIL_LINE_STYLE.weight }}
            segments={segments}
            selectedSegmentId={selectedSegmentId}
            onSegmentSelect={selectSegment}
            routeFocusRequest={routeFocusRequest}
            initialCenter={[50, 10]}
            initialZoom={4}
            followEnabled={locationFollowing && Boolean(userPosition)}
            mapChildren={(
              <>
                <RouteDirectionsLayer
                  active={directionsActive && Boolean(canonicalStartWaypoint)}
                  position={userPosition}
                  routeSlug={routeSlug}
                  startCoordinates={canonicalStartWaypoint?.coordinates}
                  mode={directionsMode}
                  onStatusChange={handleDirectionsStatusChange}
                />
                <RouteUserLocationLayer
                  position={userPosition}
                  followEnabled={locationFollowing && Boolean(userPosition)}
                  recenterRequest={recenterRequest}
                  centerRequest={locationCenterRequest}
                  onManualMovement={handleManualMapMovement}
                />
              </>
            )}
          >
            {navigationState === 'exploring' && (
              <p className="route-arrival-notice" role="status">You're on the route now. Let's wander Offward!</p>
            )}
            <RouteSections
              segments={segments}
              selectedSegmentId={selectedSegmentId}
              onSegmentSelect={selectSegment}
            />
            <RouteMapDetailOverlay
              detail={mapDetail}
              onClose={closeMapDetail}
              onShowFullRoute={showFullRoute}
              onViewDetails={viewMapEntityDetails}
              onPointerEnter={cancelHoverClose}
              onPointerLeave={scheduleHoverClose}
            />
          </MapView>
        </section>
        <aside className="route-detail-side-content" aria-label="Route details">
          {route.summary && <p className="route-detail-summary">{route.summary}</p>}
          {routeImageCollections.length > 0 && (
            <EntityMediaSection
              galleries={routeImageCollections}
              onOpenGallery={openGallery}
              loadingGalleryId={galleryLoadingId}
              galleryErrorByCollectionId={galleryErrorByCollectionId}
              showAllImages
              sectionLabel="Images"
              showImageGroupLabel={false}
            />
          )}
          {routeVideos.length > 0 && (
            <section className="route-detail-media-section" aria-labelledby="route-videos-title">
              <h2 id="route-videos-title">Videos</h2>
              <RouteMediaGrid videos={routeVideos} onVideoSelect={setActiveVideo} />
            </section>
          )}
          <RoutePlacesAlongRoute waypoints={waypoints} countries={countries} />
          <RelatedFood foodIds={foodIds} />
        </aside>
      </div>
      <ImageLightbox
        images={lightboxImages}
        activeIndex={lightbox.index}
        isOpen={lightbox.index >= 0}
        onClose={() => setLightbox({ gallery: null, index: -1 })}
        onPrevious={() => setLightbox((current) => ({ ...current, index: (current.index - 1 + lightboxImages.length) % lightboxImages.length }))}
        onNext={() => setLightbox((current) => ({ ...current, index: (current.index + 1) % lightboxImages.length }))}
      />
      <VideoPlayerDialog video={activeVideo} onClose={closeVideoDialog} />
    </section>
  )
}

export default RoutePage