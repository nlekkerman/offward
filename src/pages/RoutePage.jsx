import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MapView from '../features/map/components/MapView.jsx'
import { isRenderableRoute } from '../features/map/mapGeometry.js'
import RouteMapDetailOverlay from '../features/routes/components/RouteMapDetailOverlay.jsx'
import RouteMediaGrid from '../features/routes/components/RouteMediaGrid.jsx'
import { normalizeMediaIds, resolveAttachedVideos } from '../features/routes/components/routeMediaUtils.js'
import RouteSections from '../features/routes/components/RouteSections.jsx'
import VideoPlayerDialog from '../features/video/VideoPlayerDialog.jsx'
import ImageLightbox from '../shared/components/ImageLightbox.jsx'
import { getCountries } from '../services/countriesApi.js'
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

function getPublicGalleries(item) {
  const collections = Array.isArray(item?.image_collections)
    ? item.image_collections
    : Array.isArray(item?.galleries) ? item.galleries : []
  return collections.filter((collection) => collection && typeof collection === 'object' && Array.isArray(collection.images) && collection.images.length > 0)
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
  const [selectedSegmentId, setSelectedSegmentId] = useState(null)
  const [openPanel, setOpenPanel] = useState(null)
  const [videoCatalog, setVideoCatalog] = useState({ status: 'idle', videos: [] })
  const [activeVideo, setActiveVideo] = useState(null)
  const [lightbox, setLightbox] = useState({ gallery: null, index: -1 })
  const [routeFocusRequest, setRouteFocusRequest] = useState(0)

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
  const selectWaypoint = (waypointId) => {
    setSelectedSegmentId(null)
    setSelectedWaypointId((currentId) => currentId === waypointId ? null : waypointId)
  }
  const selectSegment = (segmentId) => {
    setSelectedWaypointId(null)
    setSelectedSegmentId((currentId) => currentId === segmentId ? null : segmentId)
  }
  const toggleVideosPanel = () => setOpenPanel((current) => (current === 'videos' ? null : 'videos'))

  const routeVideoIds = useMemo(() => normalizeMediaIds(route?.video_ids), [route])
  const hasAnyAttachedMedia = useMemo(
    () => routeVideoIds.length > 0
      || segments.some((segment) => normalizeMediaIds(segment.media_ids).length > 0)
      || waypoints.some((waypoint) => normalizeMediaIds(waypoint.media_ids).length > 0),
    [routeVideoIds, segments, waypoints],
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
  const routeVideos = useMemo(() => resolveAttachedVideos(routeVideoIds, videoById), [routeVideoIds, videoById])
  const mapDetail = useMemo(() => {
    const waypoint = waypoints.find((item) => item.id === selectedWaypointId)
    if (waypoint) {
      return {
        type: 'waypoint',
        eyebrow: `Waypoint ${waypoint.order}`,
        title: getWaypointTitle(waypoint),
        subtitle: String(waypoint.type || 'via').toUpperCase(),
        summary: waypoint.summary || waypoint.note || waypoint.description || '',
        videos: resolveAttachedVideos(waypoint.media_ids, videoById),
        galleries: getPublicGalleries(waypoint),
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
      videos: resolveAttachedVideos(segment.media_ids, videoById),
      galleries: getPublicGalleries(segment),
    }
  }, [segments, selectedSegmentId, selectedWaypointId, videoById, waypoints])
  const closeMapDetail = () => {
    setSelectedWaypointId(null)
    setSelectedSegmentId(null)
  }
  const openVideo = (video) => {
    setOpenPanel(null)
    setActiveVideo(video)
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
          selectedWaypointId={selectedWaypointId}
          onWaypointSelect={selectWaypoint}
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
            onOpenGallery={(gallery) => setLightbox({ gallery, index: 0 })}
            onShowFullRoute={showFullRoute}
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