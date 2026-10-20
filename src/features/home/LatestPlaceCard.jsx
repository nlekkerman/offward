import { Link } from 'react-router-dom'
import CountryFlag from '../../shared/components/CountryFlag.jsx'
import { findCountry } from '../../shared/utils/country.js'
import { getExplorePreview } from '../explore/exploreUtils.js'
import { formatCountryLabel } from './latestContentFormatting.js'

function LatestPlaceCard({ place, countryRecords = [] }) {
  const country = findCountry(countryRecords, place.country)
  const countryLabel = country?.name || formatCountryLabel(place.country)
  const image = getExplorePreview(place)
  const content = (
    <>
      {image && <img className="latest-rail-content-image" src={image} alt="" loading="lazy" />}
      <p className="latest-rail-type">Place</p>
      <h3 className="latest-rail-title">{place.title}</h3>
      {place.summary && <p className="latest-rail-excerpt">{place.summary}</p>}
      {countryLabel && (
        <div className="latest-rail-meta-row">
          <span className="country-identity-inline"><CountryFlag code={country?.code} decorative />{countryLabel}</span>
        </div>
      )}
    </>
  )

  if (!place.slug) {
    return <article className="latest-rail-card latest-rail-card-place" aria-label="Latest place">{content}</article>
  }

  return (
    <Link className="latest-rail-card latest-rail-card-place latest-rail-card-link" to={`/places/${place.slug}`}>
      {content}
    </Link>
  )
}

export default LatestPlaceCard
