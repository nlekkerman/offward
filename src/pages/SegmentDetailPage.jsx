import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EntityMediaSection from '../features/routes/components/EntityMediaSection.jsx'
import EntityRouteContext from '../features/routes/components/EntityRouteContext.jsx'
import RelatedStories from '../features/routes/components/RelatedStories.jsx'
import { normalizeMediaIds, resolveAttachedVideos, resolveImageCollections } from '../features/routes/components/routeMediaUtils.js'
import { getPublicImageCollection } from '../services/imageCollectionsApi.js'
import { getPublicRouteBySlug } from '../services/routesApi.js'
import { getPublicStories } from '../services/storiesApi.js'
import { getPublicVideos } from '../services/videosApi.js'
import ImageLightbox from '../shared/components/ImageLightbox.jsx'
import NotFoundPage from './NotFoundPage.jsx'

function SegmentDetailPage() {
  const { routeSlug, id } = useParams()
  const [routeResult, setRouteResult] = useState({ slug: null, status: 'loading', route: null })
  const [storyCatalog, setStoryCatalog] = useState([])
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

  const routeStatus = routeResult.slug === routeSlug ? routeResult.status : 'loading'
  const route = routeResult.slug === routeSlug ? routeResult.route : null
  const segment = useMemo(() => {
    if (!route || !Array.isArray(route.segments)) {
      return null
    }
    return route.segments.find((item) => String(item.id) === String(id)) || null
  }, [route, id])

  useEffect(() => {
    if (!segment || !Array.isArray(segment.story_ids) || segment.story_ids.length === 0) {
      setStoryCatalog([])
      return undefined
    }

    let isCurrent = true

    async function loadStories() {
      try {
        const data = await getPublicStories()
        if (!isCurrent) return
        setStoryCatalog(data)
      } catch {
        if (isCurrent) {
          setStoryCatalog([])
        }
      }
    }

    loadStories()
    return () => {
      isCurrent = false
    }
  }, [segment])

  const mediaIds = useMemo(() => normalizeMediaIds(segment?.media_ids ?? segment?.video_ids), [segment])

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
  const videos = useMemo(() => resolveAttachedVideos(segment, videoById), [segment, videoById])
  const galleries = useMemo(() => resolveImageCollections(segment), [segment])

  const relatedStories = useMemo(() => {
    if (!segment || !Array.isArray(segment.story_ids)) {
      return []
    }

    const ids = new Set(segment.story_ids.map((storyId) => String(storyId)))
    return storyCatalog.filter((story) => ids.has(String(story.id)))
  }, [segment, storyCatalog])

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
    return <section className="route-detail-page"><p className="route-detail-status" role="status">Loading segment...</p></section>
  }

  if (routeStatus === 'not-found') {
    return <NotFoundPage />
  }

  if (routeStatus === 'error') {
    return (
      <section className="route-detail-page">
        <Link className="route-detail-back" to={`/routes/${encodeURIComponent(routeSlug)}`}>Back to Route</Link>
        <div className="route-detail-error" role="alert">
          <p className="eyebrow">SEGMENT UNAVAILABLE</p>
          <h1>Unable to load this Segment</h1>
          <p>There was a network or server problem loading the Route detail. Try again from the Route page.</p>
        </div>
      </section>
    )
  }

  if (!segment) {
    return <NotFoundPage />
  }

  const startWaypoint = route.waypoints.find((item) => item.id === segment.start_waypoint_id)
  const endWaypoint = route.waypoints.find((item) => item.id === segment.end_waypoint_id)
  const segmentTitle = segment.title || `${startWaypoint ? (startWaypoint.name || startWaypoint.label || 'Start') : 'Start'} → ${endWaypoint ? (endWaypoint.name || endWaypoint.label || 'End') : 'End'}`
  const lightboxImages = lightbox.gallery?.images || []

  return (
    <section className="route-detail-page">
      <EntityRouteContext
        route={route}
        routeSlug={routeSlug}
        childLabel="Section"
        childSubtitle={startWaypoint && endWaypoint ? `${startWaypoint.name || startWaypoint.label || 'Start'} → ${endWaypoint.name || endWaypoint.label || 'End'}` : 'Route segment'}
      />

      <header className="route-detail-header">
        <div>
          <p className="eyebrow">SECTION {segment.order}</p>
          <h1>{segmentTitle}</h1>
        </div>
        {(segment.summary || segment.note) && <p className="route-detail-summary">{segment.summary || segment.note}</p>}
      </header>

      <EntityMediaSection
        videos={videos}
        galleries={galleries}
        onOpenGallery={openGallery}
        loadingGalleryId={galleryLoadingId}
        galleryErrorByCollectionId={galleryErrorByCollectionId}
      />

      <RelatedStories stories={relatedStories} />

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

export default SegmentDetailPage
