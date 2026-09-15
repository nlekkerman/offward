import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLatestPublicStory } from '../../services/storiesApi.js'

function formatCountryLabel(country) {
  if (!country) {
    return null
  }

  if (typeof country === 'string') {
    return country.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  }

  if (typeof country === 'object' && typeof country.name === 'string') {
    return country.name
  }

  return null
}

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

function getRelatedPlace(story) {
  const place = Array.isArray(story?.places) ? story.places[0] : null
  if (place && typeof place === 'object' && typeof place.name === 'string') {
    return place
  }
  return null
}

function LatestStoryFeature() {
  const [status, setStatus] = useState('loading')
  const [story, setStory] = useState(null)

  useEffect(() => {
    let isCurrent = true

    async function loadLatestStory() {
      try {
        const data = await getLatestPublicStory()
        if (isCurrent) {
          setStory(data)
          setStatus(data ? 'success' : 'empty')
        }
      } catch {
        if (isCurrent) {
          setStatus('error')
        }
      }
    }

    loadLatestStory()
    return () => {
      isCurrent = false
    }
  }, [])

  if (status === 'empty' || status === 'error') {
    return null
  }

  if (status === 'loading') {
    return (
      <aside className="latest-story-card latest-story-card-loading" aria-hidden="true">
        <div className="latest-story-skeleton-line latest-story-skeleton-eyebrow" />
        <div className="latest-story-skeleton-line latest-story-skeleton-title" />
        <div className="latest-story-skeleton-line latest-story-skeleton-excerpt" />
        <div className="latest-story-skeleton-line latest-story-skeleton-excerpt-short" />
      </aside>
    )
  }

  const countryLabel = formatCountryLabel(story.country)
  const publishedLabel = formatPublishedDate(story.published_at)
  const relatedPlace = getRelatedPlace(story)

  return (
    <aside className="latest-story-card" aria-label="Latest story">
      <p className="eyebrow">Latest Story</p>
      <h2 className="latest-story-title">{story.title}</h2>
      {story.excerpt && <p className="latest-story-excerpt">{story.excerpt}</p>}
      <div className="latest-story-meta">
        {publishedLabel && <span>{publishedLabel}</span>}
        {countryLabel && <span>{countryLabel}</span>}
        {relatedPlace && <span>{relatedPlace.name}</span>}
      </div>
      <Link className="latest-story-cta" to={`/stories/${story.slug}`}>Read story →</Link>
    </aside>
  )
}

export default LatestStoryFeature
