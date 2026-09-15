import { Link } from 'react-router-dom'
import { formatCountryLabel, formatPublishedDate } from './latestContentFormatting.js'

function LatestStoryCard({ story }) {
  const countryLabel = formatCountryLabel(story.country)
  const publishedLabel = formatPublishedDate(story.published_at)

  return (
    <article className="latest-rail-card latest-rail-card-story" aria-label="Latest story">
      <p className="latest-rail-type">Story</p>
      <h3 className="latest-rail-title">{story.title}</h3>
      {story.excerpt && <p className="latest-rail-excerpt">{story.excerpt}</p>}
      <div className="latest-rail-meta-row">
        {countryLabel && <span>{countryLabel}</span>}
        {publishedLabel && <span>{publishedLabel}</span>}
      </div>
      <Link className="latest-rail-cta" to={`/stories/${story.slug}`}>Read story →</Link>
    </article>
  )
}

export default LatestStoryCard
