import { Link } from 'react-router-dom'
import RouteMiniMap from '../map/components/RouteMiniMap.jsx'
import CountryFlag from '../../shared/components/CountryFlag.jsx'
import { findCountry } from '../../shared/utils/country.js'
import { getExplorePreview } from '../explore/exploreUtils.js'
import { formatActivityLabel, formatCountryLabel, formatPublishedDate } from './latestContentFormatting.js'

function LatestRouteCard({ route, countryRecords = [] }) {
  const activityLabel = formatActivityLabel(route.activity_type)
  const countryLabel = formatCountryLabel(route.country)
  const publishedLabel = formatPublishedDate(route.published_at)
  const country = findCountry(countryRecords, route.country)
  const image = getExplorePreview(route)

  const cardContent = (
    <>
      {image
        ? <img className="latest-rail-content-image" src={image} alt="" loading="lazy" />
        : <RouteMiniMap route={route} className="latest-rail-mini-map" />}
      <p className="latest-rail-type">Route</p>
      <h3 className="latest-rail-title">{route.title}</h3>
      {route.summary && <p className="latest-rail-excerpt">{route.summary}</p>}
      <div className="latest-rail-meta-row">
        {activityLabel && <span>{activityLabel}</span>}
        {countryLabel && <span className="country-identity-inline"><CountryFlag code={country?.code} decorative />{country?.name || countryLabel}</span>}
        {publishedLabel && <span>{publishedLabel}</span>}
      </div>
    </>
  )

  if (!route.slug) {
    return (
      <article className="latest-rail-card latest-rail-card-route" aria-label="Latest route">
        {cardContent}
      </article>
    )
  }

  return (
    <Link
      className="latest-rail-card latest-rail-card-route latest-rail-card-link"
      to={`/routes/${route.slug}`}
      aria-label={`View route: ${route.title}`}
    >
      {cardContent}
    </Link>
  )
}

export default LatestRouteCard
