import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import VideoPlayer from '../features/video/VideoPlayer.jsx'
import ImageLightbox from '../shared/components/ImageLightbox.jsx'
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

      {showVideosSection && (
        <section className="story-detail-videos" aria-label="Story videos">
          <p className="eyebrow">{attachedVideos.length > 1 ? 'Videos' : 'Video'}</p>
          {attachedVideos.length === 0 && (
            <p className="story-detail-video-loading" role="status">Loading video...</p>
          )}
          {attachedVideos.length > 0 && (
            <div className={attachedVideos.length === 1 ? 'story-detail-video-list story-detail-video-list-single' : 'story-detail-video-list'}>
              {attachedVideos.map((video) => (
                <div className="story-detail-video-item" key={video.id}>
                  <div className="story-media-video">
                    <VideoPlayer playbackUrl={video.playback_url} thumbnailUrl={video.thumbnail_url} title={video.title} />
                    {video.title && <p className="story-detail-video-caption">{video.title}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {Array.isArray(story.image_collections) && story.image_collections.length > 0 && (
        <section className="story-detail-galleries" aria-label="Story image galleries">
          <p className="eyebrow">Images</p>
          {story.image_collections.map((collection) => (
            <section className="story-detail-gallery" key={collection.id || collection.title}>
              {collection.title && <h2>{collection.title}</h2>}
              {collection.description && <p className="story-detail-gallery-description">{collection.description}</p>}
              <div className="story-detail-image-grid">
                {getCollectionImages(collection).map((image, index) => {
                  const collectionKey = collection.id || collection.title
                  return (
                    <figure key={image.id || image.image_id || `${collection.id}-${index}`}>
                      {getImageUrl(image) ? (
                        <button
                          type="button"
                          className="story-detail-image-button"
                          onClick={() => setLightbox({ collectionKey, index })}
                          aria-label={`Open image ${index + 1} of ${getCollectionImages(collection).length}${collection.title ? ` from ${collection.title}` : ''}`}
                        >
                          <img src={getImageUrl(image)} alt={image.alt_text || image.caption || `${collection.title || 'Gallery'} image ${index + 1}`} loading="lazy" />
                          <span className="story-detail-image-index">{index + 1}</span>
                        </button>
                      ) : null}
                      <figcaption>{image.caption || `Image ${index + 1}`}</figcaption>
                    </figure>
                  )
                })}
              </div>
              {lightbox.collectionKey === (collection.id || collection.title) && (
                <ImageLightbox
                  images={getCollectionImages(collection)}
                  activeIndex={lightbox.index}
                  isOpen={lightbox.index >= 0}
                  onClose={() => setLightbox({ collectionKey: null, index: -1 })}
                  onPrevious={() => setLightbox((current) => {
                    const images = getCollectionImages(collection)
                    return { ...current, index: (current.index - 1 + images.length) % images.length }
                  })}
                  onNext={() => setLightbox((current) => {
                    const images = getCollectionImages(collection)
                    return { ...current, index: (current.index + 1) % images.length }
                  })}
                />
              )}
            </section>
          ))}
        </section>
      )}

      {(relatedPlaces.length > 0 || relatedRoutes.length > 0) && (
        <div className="story-detail-related">
          {relatedPlaces.length > 0 && (
            <section className="story-detail-related-group" aria-label="Related places">
              <p className="eyebrow">{relatedPlaces.length > 1 ? 'Related Places' : 'Related Place'}</p>
              <ul>
                {relatedPlaces.map((place) => (
                  <li key={place.id}>
                    <Link to={`/places/${place.slug}`}>
                      <span className="story-detail-related-title">{place.name}</span>
                      {place.country && <span className="story-detail-related-meta">{countryNames.get(place.country) || place.country}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {relatedRoutes.length > 0 && (
            <section className="story-detail-related-group" aria-label="Related routes">
              <p className="eyebrow">{relatedRoutes.length > 1 ? 'Related Routes' : 'Related Route'}</p>
              <ul>
                {relatedRoutes.map((route) => (
                  <li key={route.id}>
                    <Link to={`/routes/${route.slug}`}>
                      <span className="story-detail-related-title">{route.title}</span>
                      {(route.country || route.activity_type) && (
                        <span className="story-detail-related-meta">
                          {[countryNames.get(route.country) || route.country, formatActivity(route.activity_type)].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </section>
  )
}

export default StoryPage