import { Link } from 'react-router-dom'

function RelatedStories({ stories = [] }) {
  if (!Array.isArray(stories) || stories.length === 0) {
    return null
  }

  return (
    <section aria-label="Related stories" style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid #30362f' }}>
      <p className="eyebrow">Stories</p>
      <ul style={{ listStyle: 'none', display: 'grid', gap: '0.75rem', padding: 0, margin: '1rem 0 0' }}>
        {stories.map((story) => (
          <li key={story.id}>
            <Link to={`/stories/${encodeURIComponent(story.slug)}`} style={{ color: '#f3efe6', textDecoration: 'none' }}>
              {story.title || 'Story'}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default RelatedStories
