import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCountryLabel, formatPublishedDate } from '../features/home/latestContentFormatting.js'
import { getCountries } from '../services/countriesApi.js'
import { getPublicStoriesPage } from '../services/storiesApi.js'
import CountryFlag from '../shared/components/CountryFlag.jsx'
import { findCountry } from '../shared/utils/country.js'
import { collectionPreview, imagePreviewUrl } from '../features/management/imageCollectionUtils.js'

function getImageUrl(image) {
  return image?.url || image?.image_url || image?.thumbnail_url || image?.image?.url || image?.image?.image_url || ''
}

function getStoryPreviewUrl(story) {
  const heroUrl = getImageUrl(story.hero_image)
  if (heroUrl) {
    return heroUrl
  }

  const firstCollection = Array.isArray(story.image_collections) ? story.image_collections[0] : null
  const collectionUrl = collectionPreview(firstCollection) || getImageUrl(firstCollection?.images?.[0])
  if (collectionUrl) {
    return collectionUrl
  }

  return imagePreviewUrl(story.preview_image) || getImageUrl(story.image) || getImageUrl(story.thumbnail)
}

function StoriesListPage() {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ status: 'loading', stories: [], count: 0, next: null, page: 0, moreError: false })
  const morePending = useRef(false)
  const [countries, setCountries] = useState([])

  useEffect(() => {
    let isCurrent = true

    async function loadStories() {
      setResult({ status: 'loading', stories: [], count: 0, next: null, page: 0, moreError: false })
      morePending.current = false
      try {
        const data = await getPublicStoriesPage({ page: 1 })
        if (isCurrent) {
          setResult({ status: 'success', stories: data.results, count: data.count, next: data.next, page: 1, moreError: false })
        }
      } catch {
        if (isCurrent) {
          setResult((value) => ({ ...value, status: 'error' }))
        }
      }
    }

    loadStories()

    return () => {
      isCurrent = false
    }
  }, [attempt])

  const loadMore = async () => {
    if (!result.next || morePending.current) return
    morePending.current = true
    setResult((value) => ({ ...value, status: 'loading-more', moreError: false }))
    try {
      const page = result.page + 1
      const data = await getPublicStoriesPage({ page })
      setResult((value) => {
        const records = new Map(value.stories.map((story) => [String(story.id || story.slug), story]))
        data.results.forEach((story) => records.set(String(story.id || story.slug), story))
        return { status: 'success', stories: [...records.values()], count: data.count, next: data.next, page, moreError: false }
      })
    } catch {
      setResult((value) => ({ ...value, status: 'success', moreError: true }))
    } finally {
      morePending.current = false
    }
  }

  useEffect(() => {
    let isCurrent = true
    getCountries()
      .then((data) => { if (isCurrent) setCountries(data) })
      .catch(() => { if (isCurrent) setCountries([]) })
    return () => { isCurrent = false }
  }, [])

  return (
    <section className="explore-page">
      <div className="explore-heading">
        <div>
          <p className="eyebrow">PUBLIC STORIES</p>
          <h1>Stories</h1>
        </div>
        {result.status !== 'loading' && result.status !== 'error' && (
          <p className="explore-count" aria-live="polite">
            Showing {result.stories.length} of {result.count} stories
          </p>
        )}
      </div>

      {result.status === 'loading' && <p className="explore-status" role="status">Loading stories...</p>}
      {result.status === 'error' && <div className="explore-status" role="alert"><p>Unable to load stories.</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></div>}
      {result.status === 'success' && result.stories.length === 0 && (
        <p className="explore-status" role="status">No stories are published yet.</p>
      )}

      {result.stories.length > 0 && (
        <div className="story-list-grid" aria-label="Stories">
          {result.stories.map((story) => {
            const previewUrl = getStoryPreviewUrl(story)
            const countryLabel = formatCountryLabel(story.country)
            const country = findCountry(countries, story.country)
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
                      {countryLabel && <span className="country-identity-inline"><CountryFlag code={country?.code} decorative />{country?.name || countryLabel}</span>}
                      {publishedLabel && <span>{publishedLabel}</span>}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
      {result.moreError && <p className="explore-status" role="alert">Unable to load more stories. Your loaded stories are preserved.</p>}
      {result.next && <button type="button" className="food-button" disabled={result.status === 'loading-more'} onClick={loadMore}>{result.status === 'loading-more' ? 'Loading more stories…' : result.moreError ? 'Retry loading more stories' : 'Load more stories'}</button>}
    </section>
  )
}

export default StoriesListPage
