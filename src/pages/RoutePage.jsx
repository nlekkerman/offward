import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MapView from '../features/map/components/MapView.jsx'
import { isRenderableRoute } from '../features/map/mapGeometry.js'
import RouteMapDetailOverlay from '../features/routes/components/RouteMapDetailOverlay.jsx'
import RouteMediaGrid from '../features/routes/components/RouteMediaGrid.jsx'
import { getAttachedMediaCount, normalizeMediaIds, resolveAttachedVideos, resolveImageCollections } from '../features/routes/components/routeMediaUtils.js'
import RouteSections from '../features/routes/components/RouteSections.jsx'
import VideoPlayerDialog from '../features/video/VideoPlayerDialog.jsx'
import ImageLightbox from '../shared/components/ImageLightbox.jsx'
import { getCountries } from '../services/countriesApi.js'
import { getPublicImageCollection } from '../services/imageCollectionsApi.js'
import { getPublicRouteBySlug } from '../services/routesApi.js'
import { getPublicVideos } from '../services/videosApi.js'
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

function RoutePage() {
  const { routeSlug } = useParams()
  const [routeResult, setRouteResult] = useState({ slug: null, status: 'loading', route: null })
  const [countries, setCountries] = useState([])
  const [countriesStatus, setCountriesStatus] = useState('loading')
  const [selectedWaypointId, setSelectedWaypointId] = useState(null)
  const [hoveredWaypointId, setHoveredWaypointId] = useState(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState(null)
  const [openPanel, setOpenPanel] = useState(null)
  const [videoCatalog, setVideoCatalog] = useState({ status: 'idle', videos: [] })
  const [activeVideo, setActiveVideo] = useState(null)
  const [lightbox, setLightbox] = useState({ gallery: null, index: -1 })
  const [galleryLoadingId, setGalleryLoadingId] = useState(null)
  const [galleryErrorByCollectionId, setGalleryErrorByCollectionId] = useState({})
  const [routeFocusRequest, setRouteFocusRequest] = useState(0)
  const hoverCloseTimerRef = useRef(null)
  const galleryCacheRef = useRef(new Map())
  const supportsHover = useHoverCapability()

  useEffect(() => () => window.clearTimeout(hoverCloseTimerRef.current), [])

  useEffect(() => {
    let isCurrent = true

    async function loadRoute() {
      setSelectedWaypointId(null)
      setSelectedSegmentId(null)
      setOpenPanel(null)
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
  }, [routeSlug])

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

  const routeStatus = routeResult.slug === routeSlug ? routeResult.status : 'loading'
  const route = routeResult.slug === routeSlug ? routeResult.route : null
  const countryNames = useMemo(() => new Map(countries.map((country) => [country.slug, country.name])), [countries])
  const waypoints = useMemo(() => getOrderedRouteWaypoints(route), [route])
  const segments = useMemo(() => (Array.isArray(route?.segments) ? route.segments : []), [route])
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
  const toggleVideosPanel = () => setOpenPanel((current) => (current === 'videos' ? null : 'videos'))

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
  const waypointMediaCountById = useMemo(() => new Map(waypoints.map((waypoint) => [
    waypoint.id,
    getAttachedMediaCount(waypoint, videoById),
  ])), [videoById, waypoints])
  const activeWaypointId = selectedSegmentId ? null : selectedWaypointId || hoveredWaypointId
  const mapDetail = useMemo(() => {
    const waypoint = waypoints.find((item) => item.id === activeWaypointId)
    if (waypoint) {
      return {
        type: 'waypoint',
        eyebrow: `Waypoint ${waypoint.order}`,
        title: getWaypointTitle(waypoint),
        subtitle: String(waypoint.type || 'via').toUpperCase(),
        summary: waypoint.summary || waypoint.note || waypoint.description || '',
        videos: resolveAttachedVideos(waypoint, videoById),
        imageCollections: resolveImageCollections(waypoint),
      }
    }

    const segment = segments.find((item) => item.id === selectedSegmentId)
    if (!segment) return null
    const start = waypoints.find((waypointItem) => waypointItem.id === segment.start_waypoint_id)
    const end = waypoints.find((waypointItem) => waypointItem.id === segment.end_waypoint_id)
    return {
      type: 'segment',
      eyebrow: `Section ${segment.order}`,
      title: segment.title || `${getWaypointTitle(start)} → ${getWaypointTitle(end)}`,
      subtitle: start && end ? `${getWaypointTitle(start)} → ${getWaypointTitle(end)}` : '',
      summary: segment.summary || segment.note || '',
      videos: resolveAttachedVideos(segment, videoById),
      imageCollections: resolveImageCollections(segment),
    }
  }, [activeWaypointId, segments, selectedSegmentId, videoById, waypoints])
  const closeMapDetail = () => {
    clearHoveredWaypoint()
    setSelectedWaypointId(null)
    setSelectedSegmentId(null)
  }
  const pinHoveredWaypoint = () => {
    if (!selectedWaypointId && hoveredWaypointId) setSelectedWaypointId(hoveredWaypointId)
    clearHoveredWaypoint()
  }
  const openVideo = (video) => {
    pinHoveredWaypoint()
    setOpenPanel(null)
    setActiveVideo(video)
  }
  // Preview data only carries lightweight ImageCollection summaries. The full
  // ordered image list is fetched on demand, cached per session, and only
  // then handed to the existing ImageLightbox.
  const openGallery = async (galleryPreview) => {
    const collectionId = galleryPreview?.id ? String(galleryPreview.id) : ''
    if (!collectionId || galleryLoadingId === collectionId) {
      return
    }

    pinHoveredWaypoint()
    setGalleryErrorByCollectionId((current) => ({ ...current, [collectionId]: null }))

    const cached = galleryCacheRef.current.get(collectionId)
    if (cached) {
      setLightbox({ gallery: cached, index: 0 })
      return
    }

    setGalleryLoadingId(collectionId)
    try {
      const fullCollection = await getPublicImageCollection(collectionId)
      galleryCacheRef.current.set(collectionId, fullCollection)
      setLightbox({ gallery: fullCollection, index: 0 })
    } catch {
      setGalleryErrorByCollectionId((current) => ({ ...current, [collectionId]: 'Unable to load gallery. Try again.' }))
    } finally {
      setGalleryLoadingId((current) => (current === collectionId ? null : current))
    }
  }
  const handleWaypointVisibilityChange = (isVisible) => {
    if (isVisible) return
    clearHoveredWaypoint()
    setSelectedWaypointId(null)
  }
  const showFullRoute = () => setRouteFocusRequest((current) => current + 1)
  const lightboxImages = lightbox.gallery?.images || []
  const mapRoute = route && route.is_map_renderable === true && isRenderableRoute(route) ? route : null
  const hasMalformedGeometry = route?.geometry && route?.is_map_renderable === true && !mapRoute
  const countryLabel = countryNames.get(route?.country) || route?.country || 'Country pending'
  const activityLabel = formatActivity(route?.activity_type)

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
    <section className="route-detail-page">
      <Link className="route-detail-back" to="/explore">Back to Explore</Link>
      <header className="route-detail-header">
        <div>
          <p className="eyebrow">PUBLIC ROUTE</p>
          <h1>{route.title}</h1>
        </div>
        <div className="route-detail-meta" aria-label="Route metadata">
          <span>{countryLabel}</span>
          <span>{activityLabel}</span>
        </div>
        {route.summary && <p className="route-detail-summary">{route.summary}</p>}
        {countriesStatus === 'error' && <p className="route-detail-muted" role="status">Country details are unavailable, so the canonical country slug is shown.</p>}
      </header>

      <div className="route-detail-toggles" role="group" aria-label="Route detail panels">
        {routeVideos.length > 0 && (
          <button
            type="button"
            id="route-videos-toggle"
            className={openPanel === 'videos' ? 'route-panel-toggle is-open' : 'route-panel-toggle'}
            aria-expanded={openPanel === 'videos'}
            aria-controls="route-videos-panel"
            onClick={toggleVideosPanel}
          >
            <span className="route-panel-toggle-copy">
              <span className="route-panel-toggle-title">Media</span>
              <span className="route-panel-toggle-count">{routeVideos.length} {routeVideos.length === 1 ? 'video' : 'videos'}</span>
            </span>
            <span className="route-panel-toggle-chevron" aria-hidden="true">{openPanel === 'videos' ? '▲' : '▼'}</span>
          </button>
        )}
      </div>

      {openPanel === 'videos' && routeVideos.length > 0 && (
        <section id="route-videos-panel" className="route-panel-revealed" aria-labelledby="route-videos-toggle">
          <RouteMediaGrid videos={routeVideos} />
        </section>
      )}

      <section className="route-map-section" aria-labelledby="route-map-title">
        <div className="route-map-heading">
          <p className="eyebrow">MAP</p>
          <h2 id="route-map-title">Published path</h2>
        </div>
        {(!route.geometry || route.is_map_renderable === false) && <p className="route-map-message">This Route does not yet have a published map path.</p>}
        {hasMalformedGeometry && <p className="route-map-message" role="status">The published map path could not be displayed.</p>}
        <MapView
          className="route-detail-map"
          routes={mapRoute ? [mapRoute] : []}
          waypoints={waypoints}
          waypointMediaCountById={waypointMediaCountById}
          selectedWaypointId={selectedWaypointId}
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
        >
          <RouteSections
            segments={segments}
            selectedSegmentId={selectedSegmentId}
            onSegmentSelect={selectSegment}
          />
          <RouteMapDetailOverlay
            detail={mapDetail}
            onClose={closeMapDetail}
            onPlayVideo={openVideo}
            onOpenGallery={openGallery}
            onShowFullRoute={showFullRoute}
            onPointerEnter={cancelHoverClose}
            onPointerLeave={scheduleHoverClose}
            loadingGalleryId={galleryLoadingId}
            galleryErrorByCollectionId={galleryErrorByCollectionId}
          />
        </MapView>
      </section>
      <VideoPlayerDialog video={activeVideo} onClose={() => setActiveVideo(null)} />
      <ImageLightbox
        images={lightboxImages}
        activeIndex={lightbox.index}
        isOpen={lightbox.index >= 0}
        onClose={() => setLightbox({ gallery: null, index: -1 })}
        onPrevious={() => setLightbox((current) => ({ ...current, index: (current.index - 1 + lightboxImages.length) % lightboxImages.length }))}
        onNext={() => setLightbox((current) => ({ ...current, index: (current.index + 1) % lightboxImages.length }))}
      />
    </section>
  )
}

export default RoutePage