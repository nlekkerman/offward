import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EntityMediaSection from '../features/routes/components/EntityMediaSection.jsx'
import RelatedStories from '../features/routes/components/RelatedStories.jsx'
import { normalizeMediaIds, resolveAttachedVideos, resolveImageCollections } from '../features/routes/components/routeMediaUtils.js'
import MapView from '../features/map/components/MapView.jsx'
import { isRenderablePlace } from '../features/map/mapGeometry.js'
import { getPublicImageCollection } from '../services/imageCollectionsApi.js'
import { getPublicPlaceBySlug } from '../services/placesApi.js'
import { getPublicStories } from '../services/storiesApi.js'
import { getPublicVideos } from '../services/videosApi.js'
import ImageLightbox from '../shared/components/ImageLightbox.jsx'

function formatCountrySlug(value) {
  if (!value || typeof value !== 'string') {
    return 'Country pending'
  }

  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function PlacePage() {
  const { placeSlug } = useParams()
  const [placeResult, setPlaceResult] = useState({ slug: null, status: 'loading', place: null })
  const [videoCatalog, setVideoCatalog] = useState({ status: 'idle', videos: [] })
  const [storyCatalog, setStoryCatalog] = useState({ status: 'idle', stories: [] })
  const [lightbox, setLightbox] = useState({ gallery: null, index: -1 })
  const [galleryLoadingId, setGalleryLoadingId] = useState(null)
  const [galleryErrorByCollectionId, setGalleryErrorByCollectionId] = useState({})
  const galleryCacheRef = useRef(new Map())

  useEffect(() => {
    let isCurrent = true

    async function loadPlace() {
      try {
        const data = await getPublicPlaceBySlug(placeSlug)
        if (isCurrent) {
          setPlaceResult({ slug: placeSlug, status: data ? 'success' : 'not-found', place: data })
        }
      } catch {
        if (isCurrent) {
          setPlaceResult({ slug: placeSlug, status: 'error', place: null })
        }
      }
    }

    loadPlace()
    return () => {
      isCurrent = false
    }
  }, [placeSlug])

  const place = placeResult.slug === placeSlug ? placeResult.place : null
  const mediaIds = useMemo(() => normalizeMediaIds(place?.media_ids), [place])

  useEffect(() => {
    if (mediaIds.length === 0) {
      setVideoCatalog({ status: 'idle', videos: [] })
      return undefined
    }
    let isCurrent = true
    setVideoCatalog({ status: 'loading', videos: [] })
    getPublicVideos().then((videos) => {
      if (isCurrent) setVideoCatalog({ status: 'success', videos })
    }).catch(() => {
      if (isCurrent) setVideoCatalog({ status: 'error', videos: [] })
    })
    return () => { isCurrent = false }
  }, [mediaIds])

  useEffect(() => {
    const storyIds = Array.isArray(place?.story_ids) ? place.story_ids : []
    if (storyIds.length === 0) {
      setStoryCatalog({ status: 'idle', stories: [] })
      return undefined
    }
    let isCurrent = true
    setStoryCatalog({ status: 'loading', stories: [] })
    getPublicStories().then((stories) => {
      if (isCurrent) setStoryCatalog({ status: 'success', stories })
    }).catch(() => {
      if (isCurrent) setStoryCatalog({ status: 'error', stories: [] })
    })
    return () => { isCurrent = false }
  }, [place])

  const videoById = useMemo(() => new Map(videoCatalog.videos.map((video) => [String(video.id), video])), [videoCatalog.videos])
  const videos = useMemo(() => resolveAttachedVideos(place, videoById), [place, videoById])
  const galleries = useMemo(() => resolveImageCollections(place), [place])
  const relatedStories = useMemo(() => {
    const ids = new Set((place?.story_ids || []).map((storyId) => String(storyId)))
    return storyCatalog.stories.filter((story) => ids.has(String(story.id)))
  }, [place, storyCatalog.stories])

  const openGallery = async (galleryPreview) => {
    const collectionId = galleryPreview?.id ? String(galleryPreview.id) : ''
    if (!collectionId || galleryLoadingId === collectionId) return
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

  const placeStatus = placeResult.slug === placeSlug ? placeResult.status : 'loading'

  if (placeStatus === 'loading') {
    return <section className="place-detail-page"><p className="place-detail-status" role="status">Loading place...</p></section>
  }

  if (placeStatus === 'not-found') {
    return (
      <section className="place-detail-page">
        <Link className="route-detail-back" to="/explore?view=places">Back to Explore</Link>
        <div className="place-detail-error" role="alert">
          <p className="eyebrow">PLACE NOT FOUND</p>
          <h1>This Place could not be found</h1>
          <p>The Place you are looking for may have been removed or is no longer published.</p>
        </div>
      </section>
    )
  }

  if (placeStatus === 'error') {
    return <section className="place-detail-page"><Link className="route-detail-back" to="/explore?view=places">Back to Explore</Link><div className="place-detail-error" role="alert"><p className="eyebrow">PLACE UNAVAILABLE</p><h1>Unable to load this Place</h1><p>There was a network or server problem loading the Place detail. Try again from Explore.</p></div></section>
  }

  const hasCoordinates = isRenderablePlace(place)
  const lightboxImages = lightbox.gallery?.images || []

  return (
    <section className="place-detail-page">
      <Link className="route-detail-back" to="/explore?view=places">Back to Explore</Link>
      <header className="place-detail-header">
        <p className="eyebrow">PUBLIC PLACE</p>
        <h1>{place.name}</h1>
        <div className="route-detail-meta" aria-label="Place metadata"><span>{formatCountrySlug(place.country)}</span>{place.visited_at && <span>Visited {place.visited_at}</span>}</div>
        {place.summary && <p className="route-detail-summary">{place.summary}</p>}
      </header>
      <div className="place-detail-layout">
        {place.body && (
          <article className="place-detail-copy">
            <div className="place-detail-body">{place.body}</div>
          </article>
        )}
        <section className="place-detail-map-section" aria-labelledby="place-map-title">
          <div className="route-map-heading"><p className="eyebrow">MAP</p><h2 id="place-map-title">Place location</h2></div>
          {hasCoordinates ? (
            <MapView className="place-detail-map" places={[place]} selectedPlaceId={place.id} initialCenter={[place.latitude, place.longitude]} initialZoom={10} />
          ) : (
            <p className="route-map-message" role="status">Map location is unavailable for this Place.</p>
          )}
        </section>
      </div>
      {videoCatalog.status === 'error' && <p className="place-detail-secondary-error" role="alert">Unable to load Place videos.</p>}
      <EntityMediaSection videos={videos} galleries={galleries} onOpenGallery={openGallery} loadingGalleryId={galleryLoadingId} galleryErrorByCollectionId={galleryErrorByCollectionId} />
      {storyCatalog.status === 'error' && <p className="place-detail-secondary-error" role="alert">Unable to load related Stories.</p>}
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
export default PlacePage