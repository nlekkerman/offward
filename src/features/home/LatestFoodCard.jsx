import { Link } from 'react-router-dom'
import CountryFlag from '../../shared/components/CountryFlag.jsx'
import { collectionPreview, imagePreviewUrl, imageUrl } from '../management/imageCollectionUtils.js'
import { findCountry } from '../../shared/utils/country.js'
import { formatActivityLabel, formatCountryLabel, formatPublishedDate } from './latestContentFormatting.js'

function LatestFoodCard({ food, countryRecords = [] }) {
  const preview = imagePreviewUrl(food.preview_image)
    || food.preview_image_url
    || collectionPreview(food.image_collections?.[0])
    || imageUrl(food.image)
    || imageUrl(food.thumbnail)
  const country = findCountry(countryRecords, food.country)
  const countryLabel = country?.name || formatCountryLabel(food.country)
  const typeLabel = formatActivityLabel(food.food_type)
  const publishedLabel = formatPublishedDate(food.published_at)
  const content = (
    <>
      {preview && <img className="latest-rail-content-image" src={preview} alt="" loading="lazy" />}
      <p className="latest-rail-type">{typeLabel || 'Food'}</p>
      <h3 className="latest-rail-title">{food.title}</h3>
      {food.summary && <p className="latest-rail-excerpt">{food.summary}</p>}
      {(countryLabel || publishedLabel) && (
        <div className="latest-rail-meta-row">
          {countryLabel && <span className="country-identity-inline"><CountryFlag code={country?.code} decorative />{countryLabel}</span>}
          {publishedLabel && <span>{publishedLabel}</span>}
        </div>
      )}
    </>
  )

  if (!food.slug) {
    return <article className="latest-rail-card latest-rail-card-food" aria-label="Latest food">{content}</article>
  }

  return (
    <Link className="latest-rail-card latest-rail-card-food latest-rail-card-link" to={`/food/${encodeURIComponent(food.slug)}`}>
      {content}
    </Link>
  )
}

export default LatestFoodCard
