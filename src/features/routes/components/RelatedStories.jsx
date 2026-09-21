import { Link } from 'react-router-dom'

function RelatedStories({ stories = [] }) {
  if (!Array.isArray(stories) || stories.length === 0) {
    return null
  }

  return (
    <section className="route-detail-related-stories" aria-label="Related stories">
      <p className="eyebrow">Stories</p>
      <ul>
        {stories.map((story) => (
          <li key={story.id}>
            <Link to={`/stories/${encodeURIComponent(story.slug)}`}>
              {story.title || 'Story'}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default RelatedStories
