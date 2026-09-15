import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import VideoPlayer from '../features/video/VideoPlayer.jsx'
import { getCountries } from '../services/countriesApi.js'
import { getPublicPlaceBySlug } from '../services/placesApi.js'
import { getPublicRouteBySlug } from '../services/routesApi.js'
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

// Story relations may arrive as nested objects or as bare slugs; resolve bare
// slugs through the existing public detail endpoints so we never render raw IDs.
function useResolvedRelations(items, fetchBySlug) {
  const [resolved, setResolved] = useState([])
  const list = Array.isArray(items) ? items : []
  const key = list.map((item) => (item && typeof item === 'object' ? item.slug || item.id : item)).join(',')

  useEffect(() => {
    if (list.length === 0) {
      return undefined
    }

    let isCurrent = true

    async function resolve() {
      const results = await Promise.all(
        list.map(async (item) => {
          if (item && typeof item === 'object') {
            return item
          }

          if (typeof item === 'string') {
            try {
              return await fetchBySlug(item)
            } catch {
              return null
            }
          }

          return null
        }),
      )

      if (isCurrent) {
        setResolved(results.filter(Boolean))
      }
    }

    resolve()

    return () => {
      isCurrent = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fetchBySlug])

  return list.length === 0 ? [] : resolved
}

function StoryPage() {
  const { storySlug } = useParams()
  const [storyResult, setStoryResult] = useState({ slug: null, status: 'loading', story: null })
  const [countries, setCountries] = useState([])
  const [videoCatalog, setVideoCatalog] = useState({ status: 'idle', videos: [] })

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

  const countryNames = useMemo(() => new Map(countries.map((country) => [country.slug, country.name])), [countries])
  const relatedPlaces = useResolvedRelations(story?.places, getPublicPlaceBySlug)
  const relatedRoutes = useResolvedRelations(story?.routes, getPublicRouteBySlug)

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

      {story.body && <div className="story-detail-body">{story.body}</div>}

      {(relatedRoutes.length > 0 || relatedPlaces.length > 0) && (
        <div className="story-detail-related">
          {relatedRoutes.length > 0 && (
            <section className="story-detail-related-group" aria-label="Related routes">
              <p className="eyebrow">{relatedRoutes.length > 1 ? 'Related Routes' : 'Related Route'}</p>
              <ul>
                {relatedRoutes.map((route) => (
                  <li key={route.slug || route.id}>
                    {route.slug ? <Link to={`/routes/${route.slug}`}>{route.title || route.slug}</Link> : (route.title || 'Untitled route')}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {relatedPlaces.length > 0 && (
            <section className="story-detail-related-group" aria-label="Related places">
              <p className="eyebrow">Places</p>
              <ul>
                {relatedPlaces.map((place) => (
                  <li key={place.slug || place.id}>
                    {place.slug ? <Link to={`/places/${place.slug}`}>{place.name || place.slug}</Link> : (place.name || 'Untitled place')}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

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
                  <VideoPlayer playbackUrl={video.playback_url} thumbnailUrl={video.thumbnail_url} title={video.title} />
                  {video.title && <p className="story-detail-video-caption">{video.title}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  )
}

export default StoryPage