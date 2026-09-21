import { Link } from 'react-router-dom'
import { formatCountryLabel, formatPublishedDate } from './latestContentFormatting.js'

function getHeroUrl(heroImage) {
  return heroImage?.url || heroImage?.image_url || heroImage?.image?.url || heroImage?.image?.image_url || ''
}

function LatestStoryCard({ story }) {
  const countryLabel = formatCountryLabel(story.country)
  const publishedLabel = formatPublishedDate(story.published_at)
  const heroUrl = getHeroUrl(story.hero_image)

  const cardContent = (
    <>
      {heroUrl && <img className="latest-rail-story-image" src={heroUrl} alt="" />}
      <p className="latest-rail-type">Story</p>
      <h3 className="latest-rail-title">{story.title}</h3>
      {story.excerpt && <p className="latest-rail-excerpt">{story.excerpt}</p>}
      <div className="latest-rail-meta-row">
        {countryLabel && <span>{countryLabel}</span>}
        {publishedLabel && <span>{publishedLabel}</span>}
      </div>
    </>
  )

  if (!story.slug) {
    return (
      <article className="latest-rail-card latest-rail-card-story" aria-label="Latest story">
        {cardContent}
      </article>
    )
  }

  return (
    <Link
      className="latest-rail-card latest-rail-card-story latest-rail-card-link"
      to={`/stories/${story.slug}`}
      aria-label={`Read story: ${story.title}`}
    >
      {cardContent}
    </Link>
  )
}

export default LatestStoryCard
