import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPublicStories } from '../services/storiesApi.js'

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
        <div className="explore-route-list" aria-label="Stories">
          {stories.map((story) => (
            <Link key={story.id || story.slug} to={`/stories/${story.slug}`} className="explore-route-item">
              <strong>{story.title}</strong>
              {story.excerpt && <span>{story.excerpt}</span>}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

export default StoriesListPage
