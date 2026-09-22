import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCountryLabel, formatPublishedDate } from '../features/home/latestContentFormatting.js'
import { getPublicStories } from '../services/storiesApi.js'

function getImageUrl(image) {
  return image?.url || image?.image_url || image?.thumbnail_url || image?.image?.url || image?.image?.image_url || ''
}

function getStoryPreviewUrl(story) {
  const heroUrl = getImageUrl(story.hero_image)
  if (heroUrl) {
    return heroUrl
  }

  const firstCollection = Array.isArray(story.image_collections) ? story.image_collections[0] : null
  const collectionUrl = getImageUrl(firstCollection?.preview_image) || getImageUrl(firstCollection?.images?.[0]) || firstCollection?.preview_image_url || ''
  if (collectionUrl) {
    return collectionUrl
  }

  return getImageUrl(story.preview_image) || getImageUrl(story.image) || getImageUrl(story.thumbnail)
}

function StoriesListPage() {
  const [status, setStatus] = useState('loading')
  const [stories, setStories] = useState([])

  useEffect(() => {
    let isCurrent = true

    async function loadStories() {
      try {
        const data = await getPublicStories()
        if (isCurrent) {
          setStories(data)
          setStatus('success')
        }
      } catch {
        if (isCurrent) {
          setStatus('error')
        }
      }
    }

    loadStories()

    return () => {
      isCurrent = false
    }
  }, [])

  return (
    <section className="explore-page">
      <div className="explore-heading">
        <div>
          <p className="eyebrow">PUBLIC STORIES</p>
          <h1>Stories</h1>
        </div>
        {status === 'success' && (
          <p className="explore-count" aria-live="polite">
            {stories.length} {stories.length === 1 ? 'story' : 'stories'}
          </p>
        )}
      </div>

      {status === 'loading' && <p className="explore-status" role="status">Loading stories...</p>}
      {status === 'error' && <p className="explore-status" role="status">Unable to load stories.</p>}
      {status === 'success' && stories.length === 0 && (
        <p className="explore-status" role="status">No stories are published yet.</p>
      )}

      {stories.length > 0 && (
        <div className="story-list-grid" aria-label="Stories">
          {stories.map((story) => {
            const previewUrl = getStoryPreviewUrl(story)
            const countryLabel = formatCountryLabel(story.country)
            const publishedLabel = formatPublishedDate(story.published_at)

            return (
              <Link key={story.id || story.slug} to={`/stories/${story.slug}`} className="story-list-card" aria-label={`Read story: ${story.title}`}>
                {previewUrl && (
                  <div className="story-list-card-media">
                    <img src={previewUrl} alt="" loading="lazy" />
                  </div>
                )}
                <div className="story-list-card-content">
                  <p className="story-list-card-eyebrow">Story</p>
                  <h2>{story.title}</h2>
                  {story.excerpt && <p className="story-list-card-excerpt">{story.excerpt}</p>}
                  {(countryLabel || publishedLabel) && (
                    <div className="story-list-card-meta" aria-label="Story metadata">
                      {countryLabel && <span>{countryLabel}</span>}
                      {publishedLabel && <span>{publishedLabel}</span>}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default StoriesListPage
