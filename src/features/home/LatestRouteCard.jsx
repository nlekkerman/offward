import { Link } from 'react-router-dom'
import { formatActivityLabel, formatCountryLabel } from './latestContentFormatting.js'

function LatestRouteCard({ route }) {
  const activityLabel = formatActivityLabel(route.activity_type)
  const countryLabel = formatCountryLabel(route.country)

  return (
    <article className="latest-rail-card latest-rail-card-route" aria-label="Latest route">
      <p className="latest-rail-type">Route</p>
      <h3 className="latest-rail-title">{route.title}</h3>
      {route.summary && <p className="latest-rail-excerpt">{route.summary}</p>}
      <div className="latest-rail-meta-row">
        {activityLabel && <span>{activityLabel}</span>}
        {countryLabel && <span>{countryLabel}</span>}
      </div>
      {route.slug && <Link className="latest-rail-cta" to={`/routes/${route.slug}`}>View route →</Link>}
    </article>
  )
}

export default LatestRouteCard
