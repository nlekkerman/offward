import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EntityMediaSection from '../features/routes/components/EntityMediaSection.jsx'
import EntityRouteContext from '../features/routes/components/EntityRouteContext.jsx'
import { normalizeMediaIds, resolveAttachedVideos, resolveImageCollections } from '../features/routes/components/routeMediaUtils.js'
import { getPublicImageCollection } from '../services/imageCollectionsApi.js'
import { getPublicPlaces } from '../services/placesApi.js'
import { getPublicRouteBySlug } from '../services/routesApi.js'
import { getPublicVideos } from '../services/videosApi.js'
import ImageLightbox from '../shared/components/ImageLightbox.jsx'
import NotFoundPage from './NotFoundPage.jsx'

function WaypointDetailPage() {
  const { routeSlug, id } = useParams()
  const [routeResult, setRouteResult] = useState({ slug: null, status: 'loading', route: null })
  const [placeContext, setPlaceContext] = useState(null)
  const [videoCatalog, setVideoCatalog] = useState({ status: 'idle', videos: [] })
  const [lightbox, setLightbox] = useState({ gallery: null, index: -1 })
  const [galleryLoadingId, setGalleryLoadingId] = useState(null)
  const [galleryErrorByCollectionId, setGalleryErrorByCollectionId] = useState({})
  const galleryCacheRef = useRef(new Map())

  useEffect(() => {
    let isCurrent = true

    async function loadRoute() {
      try {
        const data = await getPublicRouteBySlug(routeSlug)
        if (!isCurrent) return
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

  const route = routeResult.slug === routeSlug ? routeResult.route : null
  const routeStatus = routeResult.slug === routeSlug ? routeResult.status : 'loading'
  const waypoint = useMemo(() => {
    if (!route || !Array.isArray(route.waypoints)) {
      return null
    }
    return route.waypoints.find((item) => String(item.id) === String(id)) || null
  }, [route, id])

  useEffect(() => {
    if (!waypoint?.place_id) {
      setPlaceContext(null)
      return undefined
    }

    let isCurrent = true

    async function loadPlaceContext() {
      try {
        const places = await getPublicPlaces()
        if (!isCurrent) return
        const match = places.find((place) => String(place.id) === String(waypoint.place_id))
        setPlaceContext(match || null)
      } catch {
        if (isCurrent) {
          setPlaceContext(null)
        }
      }
    }

    loadPlaceContext()
    return () => {
      isCurrent = false
    }
  }, [waypoint])

  const mediaIds = useMemo(() => normalizeMediaIds(waypoint?.media_ids ?? waypoint?.video_ids), [waypoint])

  useEffect(() => {
    if (mediaIds.length === 0) {
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
  }, [mediaIds])

  const videoById = useMemo(() => new Map(videoCatalog.videos.map((video) => [String(video.id), video])), [videoCatalog.videos])
  const videos = useMemo(() => resolveAttachedVideos(waypoint, videoById), [waypoint, videoById])
  const galleries = useMemo(() => resolveImageCollections(waypoint), [waypoint])

  const openGallery = async (galleryPreview) => {
    const collectionId = galleryPreview?.id ? String(galleryPreview.id) : ''
    if (!collectionId || galleryLoadingId === collectionId) {
      return
    }

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

  if (routeStatus === 'loading') {
    return <section className="route-detail-page"><p className="route-detail-status" role="status">Loading waypoint...</p></section>
  }

  if (routeStatus === 'not-found') {
    return <NotFoundPage />
  }

  if (routeStatus === 'error') {
    return (
      <section className="route-detail-page">
        <Link className="route-detail-back" to={`/routes/${encodeURIComponent(routeSlug)}`}>Back to Route</Link>
        <div className="route-detail-error" role="alert">
          <p className="eyebrow">WAYPOINT UNAVAILABLE</p>
          <h1>Unable to load this Waypoint</h1>
          <p>There was a network or server problem loading the Route detail. Try again from the Route page.</p>
        </div>
      </section>
    )
  }

  if (!waypoint) {
    return <NotFoundPage />
  }

  const lightboxImages = lightbox.gallery?.images || []
  const waypointLabel = waypoint.name || waypoint.label || waypoint.place_name || `Waypoint ${waypoint.order}`

  return (
    <section className="route-detail-page">
      <EntityRouteContext
        route={route}
        routeSlug={routeSlug}
        childLabel="Waypoint"
        childSubtitle={waypoint.type ? String(waypoint.type).toUpperCase() : 'VIA'}
      />

      <header className="route-detail-header">
        <div>
          <p className="eyebrow">WAYPOINT {waypoint.order}</p>
          <h1>{waypointLabel}</h1>
        </div>
        {waypoint.type && <div className="route-detail-meta" aria-label="Waypoint metadata"><span>{String(waypoint.type).toUpperCase()}</span>{route?.title && <span>{route.title}</span>}</div>}
        {(waypoint.summary || waypoint.note || waypoint.description) && (
          <p className="route-detail-summary">{waypoint.summary || waypoint.note || waypoint.description}</p>
        )}
      </header>

      {placeContext && (
        <section className="route-detail-place-context" aria-label="Place context">
          <p className="eyebrow">Place</p>
          <div className="route-detail-place-card">
            <strong>{placeContext.name}</strong>
            <Link to={`/places/${encodeURIComponent(placeContext.slug)}`}>View place</Link>
          </div>
        </section>
      )}

      {waypoint.place_id && !placeContext && (
        <section className="route-detail-place-context" aria-label="Linked place status">
          <p className="eyebrow">Place</p>
          <p className="route-detail-place-unavailable">This waypoint is linked to a Place reference, but the public Place detail could not be resolved.</p>
        </section>
      )}

      <EntityMediaSection
        videos={videos}
        galleries={galleries}
        onOpenGallery={openGallery}
        loadingGalleryId={galleryLoadingId}
        galleryErrorByCollectionId={galleryErrorByCollectionId}
      />

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

export default WaypointDetailPage
