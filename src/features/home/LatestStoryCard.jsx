import { Link } from 'react-router-dom'
import CountryFlag from '../../shared/components/CountryFlag.jsx'
import { findCountry } from '../../shared/utils/country.js'
import { getDetailHeroImage } from '../../shared/utils/detailHeroImage.js'
import { formatCountryLabel, formatPublishedDate } from './latestContentFormatting.js'

function LatestStoryCard({ story, countryRecords = [] }) {
  const countryLabel = formatCountryLabel(story.country)
  const country = findCountry(countryRecords, story.country)
  const publishedLabel = formatPublishedDate(story.published_at)
  const heroUrl = getDetailHeroImage(story, 'story')

  const cardContent = (
    <>
      {heroUrl && <img className="latest-rail-story-image" src={heroUrl} alt="" fetchPriority="high" />}
      <p className="latest-rail-type">Story</p>
      <h3 className="latest-rail-title">{story.title}</h3>
      {story.excerpt && <p className="latest-rail-excerpt">{story.excerpt}</p>}
      <div className="latest-rail-meta-row">
        {countryLabel && <span className="country-identity-inline"><CountryFlag code={country?.code} decorative />{country?.name || countryLabel}</span>}
        {publishedLabel && <span>{publishedLabel}</span>}
      </div>
    </>
  )

  if (!story.slug) {
    return (
      <article className={`latest-rail-card latest-rail-card-story${heroUrl ? ' has-image' : ''}`} aria-label="Latest story">
        {cardContent}
      </article>
    )
  }

  return (
    <Link
      className={`latest-rail-card latest-rail-card-story${heroUrl ? ' has-image' : ''} latest-rail-card-link`}
      to={`/stories/${story.slug}`}
      aria-label={`Read story: ${story.title}`}
    >
      {cardContent}
    </Link>
  )
}

export default LatestStoryCard
