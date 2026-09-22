import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import VideoPlayer from '../features/video/VideoPlayer.jsx'
import ImageLightbox from '../shared/components/ImageLightbox.jsx'
import { collectionCount, collectionPreview } from '../features/management/imageCollectionUtils.js'
import { getCountries } from '../services/countriesApi.js'
import { getPublicPlaces } from '../services/placesApi.js'
import { getPublicRoutes } from '../services/routesApi.js'
import { getPublicStoryBySlug } from '../services/storiesApi.js'
import { getPublicVideos } from '../services/videosApi.js'
import NotFoundPage from './NotFoundPage.jsx'

function formatPublishedDate(value) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatActivity(value) {
  if (!value || typeof value !== 'string') {
    return null
  }

  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getImageUrl(image) {
  return image?.url || image?.image_url || image?.image?.url || image?.image?.image_url || ''
}

function getCollectionImages(collection) {
  return Array.isArray(collection?.images) ? collection.images : []
}

// Best-effort preview from data already present on the lightweight public
// Place/Route list items - never fetches per-item detail.
function getEntityPreviewUrl(entity) {
  const heroUrl = getImageUrl(entity?.hero_image)
  if (heroUrl) {
    return heroUrl
  }

  const firstCollection = Array.isArray(entity?.image_collections) ? entity.image_collections[0] : null
  const collectionUrl = collectionPreview(firstCollection)
  if (collectionUrl) {
    return collectionUrl
  }

  return getImageUrl(entity?.preview_image) || getImageUrl(entity?.image) || getImageUrl(entity?.thumbnail) || ''
}

function StoryPage() {
  const { storySlug } = useParams()
  const [storyResult, setStoryResult] = useState({ slug: null, status: 'loading', story: null })
  const [countries, setCountries] = useState([])
  const [videoCatalog, setVideoCatalog] = useState({ status: 'idle', videos: [] })
  const [placeCatalog, setPlaceCatalog] = useState({ status: 'idle', places: [] })
  const [routeCatalog, setRouteCatalog] = useState({ status: 'idle', routes: [] })
  // Lightbox state is scoped to a single collection key so previous/next never crosses collections.
  const [lightbox, setLightbox] = useState({ collectionKey: null, index: -1 })

  useEffect(() => {
    let isCurrent = true

    async function loadStory() {
      try {
        const data = await getPublicStoryBySlug(storySlug)
        if (isCurrent) {
          setStoryResult({ slug: storySlug, status: data ? 'success' : 'not-found', story: data })
        }
      } catch {
        if (isCurrent) {
          setStoryResult({ slug: storySlug, status: 'error', story: null })
        }
      }
    }

    loadStory()
    return () => {
      isCurrent = false
    }
  }, [storySlug])

  useEffect(() => {
    let isCurrent = true

    async function loadCountries() {
      try {
        const data = await getCountries()
        if (isCurrent) {
          setCountries(data)
        }
      } catch {
        if (isCurrent) {
          setCountries([])
        }
      }
    }

    loadCountries()
    return () => {
      isCurrent = false
    }
  }, [])

  const storyStatus = storyResult.slug === storySlug ? storyResult.status : 'loading'
  const story = storyResult.slug === storySlug ? storyResult.story : null
  const mediaIds = useMemo(() => (Array.isArray(story?.media_ids) ? story.media_ids : []), [story])
  const placeIds = useMemo(() => (Array.isArray(story?.place_ids) ? story.place_ids : []), [story])
  const routeIds = useMemo(() => (Array.isArray(story?.route_ids) ? story.route_ids : []), [story])

  // Videos load independently so Story text never waits on this fetch. The
  // public Story response only exposes attached Video UUIDs (`media_ids`), and
  // the public Video detail endpoint is slug-based, so we resolve IDs against
  // the public Video list, which already returns full playable records.
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

  // The public Story response only exposes attached Place UUIDs (`place_ids`),
  // and the public Place detail endpoint is slug-based, so we resolve IDs
  // against the public Place list (one request) instead of one request per ID.
  useEffect(() => {
    if (placeIds.length === 0) {
      return undefined
    }

    let isCurrent = true

    async function loadPlaces() {
      try {
        const data = await getPublicPlaces()
        if (isCurrent) {
          setPlaceCatalog({ status: 'success', places: data })
        }
      } catch {
        if (isCurrent) {
          setPlaceCatalog({ status: 'error', places: [] })
        }
      }
    }

    loadPlaces()
    return () => {
      isCurrent = false
    }
  }, [placeIds])

  // Same pattern as Places: resolve the Story's direct Route IDs against the
  // public Route list instead of fetching per-Route (and geometry-heavy) detail.
  useEffect(() => {
    if (routeIds.length === 0) {
      return undefined
    }

    let isCurrent = true

    async function loadRoutes() {
      try {
        const data = await getPublicRoutes({ includeGeometry: false })
        if (isCurrent) {
          setRouteCatalog({ status: 'success', routes: data })
        }
      } catch {
        if (isCurrent) {
          setRouteCatalog({ status: 'error', routes: [] })
        }
      }
    }

    loadRoutes()
    return () => {
      isCurrent = false
    }
  }, [routeIds])

  const countryNames = useMemo(() => new Map(countries.map((country) => [country.slug, country.name])), [countries])

  const relatedPlaces = useMemo(() => {
    if (placeIds.length === 0) {
      return []
    }

    const placeById = new Map(placeCatalog.places.map((place) => [place.id, place]))
    return placeIds.map((id) => placeById.get(id)).filter(Boolean)
  }, [placeIds, placeCatalog.places])

  const relatedRoutes = useMemo(() => {
    if (routeIds.length === 0) {
      return []
    }

    const routeById = new Map(routeCatalog.routes.map((route) => [route.id, route]))
    return routeIds.map((id) => routeById.get(id)).filter(Boolean)
  }, [routeIds, routeCatalog.routes])

  // Only Videos explicitly attached to this Story (via media_ids) are shown.
  const attachedVideos = useMemo(() => {
    if (mediaIds.length === 0) {
      return []
    }

    const videoById = new Map(videoCatalog.videos.map((video) => [video.id, video]))
    return mediaIds.map((id) => videoById.get(id)).filter((video) => video && video.playback_url)
  }, [mediaIds, videoCatalog.videos])

  const showVideosSection = mediaIds.length > 0 && (videoCatalog.status !== 'error' || attachedVideos.length > 0)
  const hasGalleries = Array.isArray(story?.image_collections) && story.image_collections.length > 0

  if (storyStatus === 'loading') {
    return <section className="story-detail-page"><p className="story-detail-status" role="status">Loading story...</p></section>
  }

  if (storyStatus === 'not-found') {
    return <NotFoundPage />
  }

  if (storyStatus === 'error') {
    return (
      <section className="story-detail-page">
        <Link className="route-detail-back" to="/explore?view=stories">Back to Explore</Link>
        <div className="story-detail-error" role="alert">
          <p className="eyebrow">STORY UNAVAILABLE</p>
          <h1>Unable to load this Story</h1>
          <p>There was a network or server problem loading the Story. Try again from Explore.</p>
        </div>
      </section>
    )
  }

  const countryLabel = story.country ? (countryNames.get(story.country) || story.country) : null
  const publishedLabel = formatPublishedDate(story.published_at)

  return (
    <section className="story-detail-page">
      <Link className="route-detail-back" to="/explore?view=stories">Back to Explore</Link>
      <header className="story-detail-header">
        <p className="eyebrow">Story</p>
        <h1>{story.title}</h1>
        {(countryLabel || publishedLabel) && (
          <div className="story-detail-meta" aria-label="Story metadata">
            {countryLabel && <span>{countryLabel}</span>}
            {publishedLabel && <span>{publishedLabel}</span>}
          </div>
        )}
        {story.excerpt && <p className="story-detail-excerpt">{story.excerpt}</p>}
      </header>

      {getImageUrl(story.hero_image) && (
        <figure className="story-detail-hero">
          <img src={getImageUrl(story.hero_image)} alt={story.hero_image.alt_text || story.title} />
        </figure>
      )}

      {story.body && <div className="story-detail-body">{story.body}</div>}

      {(showVideosSection || hasGalleries) && (
        <section className="story-detail-media" aria-label="Story media">
          <p className="eyebrow">Media</p>

          {showVideosSection && (
            <div className="story-detail-media-group">
              <p className="story-detail-media-group-label">{attachedVideos.length > 1 ? 'Videos' : 'Video'}</p>
              {attachedVideos.length === 0 ? (
                <p className="story-detail-video-loading" role="status">Loading video...</p>
              ) : (
                <div className="story-detail-media-grid">
                  {attachedVideos.map((video) => (
                    <article className="story-media-card" key={video.id}>
                      <VideoPlayer playbackUrl={video.playback_url} thumbnailUrl={video.thumbnail_url} title={video.title} className="story-media-card-video" />
                      {video.title && <p className="story-media-card-caption">{video.title}</p>}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {hasGalleries && (
            <div className="story-detail-media-group">
              <p className="story-detail-media-group-label">{story.image_collections.length > 1 ? 'Galleries' : 'Gallery'}</p>
              <div className="story-detail-gallery-grid">
                {story.image_collections.map((collection) => {
                  const collectionKey = collection.id || collection.title
                  const images = getCollectionImages(collection)
                  return (
                    <article className="story-gallery-card" key={collectionKey}>
                      {(collection.title || collection.description) && (
                        <header className="story-gallery-card-header">
                          {collection.title && <h2>{collection.title}</h2>}
                          {collection.description && <p className="story-detail-gallery-description">{collection.description}</p>}
                          <span className="story-gallery-card-count">{collectionCount(collection)} {collectionCount(collection) === 1 ? 'photo' : 'photos'}</span>
                        </header>
                      )}
                      <div className="story-detail-image-grid">
                        {images.map((image, index) => (
                          <figure key={image.id || image.image_id || `${collectionKey}-${index}`}>
                            {getImageUrl(image) ? (
                              <button
                                type="button"
                                className="story-detail-image-button"
                                onClick={() => setLightbox({ collectionKey, index })}
                                aria-label={`Open image ${index + 1} of ${images.length}${collection.title ? ` from ${collection.title}` : ''}`}
                              >
                                <img src={getImageUrl(image)} alt={image.alt_text || image.caption || `${collection.title || 'Gallery'} image ${index + 1}`} loading="lazy" />
                                <span className="story-detail-image-index">{index + 1}</span>
                              </button>
                            ) : null}
                          </figure>
                        ))}
                      </div>
                      {lightbox.collectionKey === collectionKey && (
                        <ImageLightbox
                          images={images}
                          activeIndex={lightbox.index}
                          isOpen={lightbox.index >= 0}
                          onClose={() => setLightbox({ collectionKey: null, index: -1 })}
                          onPrevious={() => setLightbox((current) => ({ ...current, index: (current.index - 1 + images.length) % images.length }))}
                          onNext={() => setLightbox((current) => ({ ...current, index: (current.index + 1) % images.length }))}
                        />
                      )}
                    </article>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {relatedPlaces.length > 0 && (
        <section className="story-detail-related-group" aria-label="Related places">
          <p className="eyebrow">{relatedPlaces.length > 1 ? 'Related Places' : 'Related Place'}</p>
          <div className="story-related-grid">
            {relatedPlaces.map((place) => {
              const previewUrl = getEntityPreviewUrl(place)
              const countryLabel = place.country ? (countryNames.get(place.country) || place.country) : null
              return (
                <Link to={`/places/${place.slug}`} className="story-related-card" key={place.id}>
                  <span className="story-related-card-media">
                    {previewUrl ? <img src={previewUrl} alt="" loading="lazy" /> : <span className="story-related-card-fallback" aria-hidden="true">◈</span>}
                  </span>
                  <span className="story-related-card-body">
                    <span className="story-related-card-eyebrow">Place</span>
                    <span className="story-related-card-title">{place.name}</span>
                    {countryLabel && <span className="story-related-card-meta">{countryLabel}</span>}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {relatedRoutes.length > 0 && (
        <section className="story-detail-related-group" aria-label="Related routes">
          <p className="eyebrow">{relatedRoutes.length > 1 ? 'Related Routes' : 'Related Route'}</p>
          <div className="story-related-grid">
            {relatedRoutes.map((route) => {
              const previewUrl = getEntityPreviewUrl(route)
              const metaLabel = [countryNames.get(route.country) || route.country, formatActivity(route.activity_type)].filter(Boolean).join(' · ')
              return (
                <Link to={`/routes/${route.slug}`} className="story-related-card" key={route.id}>
                  <span className="story-related-card-media">
                    {previewUrl ? <img src={previewUrl} alt="" loading="lazy" /> : <span className="story-related-card-fallback" aria-hidden="true">⤳</span>}
                  </span>
                  <span className="story-related-card-body">
                    <span className="story-related-card-eyebrow">Route</span>
                    <span className="story-related-card-title">{route.title}</span>
                    {metaLabel && <span className="story-related-card-meta">{metaLabel}</span>}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </section>
  )
}

export default StoryPage