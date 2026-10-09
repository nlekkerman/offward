import { Link } from 'react-router-dom'
import { collectionPreview, imagePreviewUrl, imageUrl } from '../management/imageCollectionUtils.js'
import { formatActivityLabel, formatCountryLabel, formatPublishedDate } from '../home/latestContentFormatting.js'
import CountryFlag from '../../shared/components/CountryFlag.jsx'
import { findCountry } from '../../shared/utils/country.js'
import './food.css'

function FoodCard({ food, countries = [], compact = false, showCountry = true }) {
  const preview = imagePreviewUrl(food.preview_image)
    || food.preview_image_url || collectionPreview(food.image_collections?.[0])
    || imageUrl(food.image) || imageUrl(food.thumbnail)
  const country = showCountry ? findCountry(countries, food.country) : null
  const countryLabel = showCountry && (country?.name || formatCountryLabel(food.country))
  const date = formatPublishedDate(food.published_at)
  if (!food.slug) return null
  return (
    <Link className={`food-card${compact ? ' food-card-compact' : ''}`} to={`/food/${encodeURIComponent(food.slug)}`}>
      {preview && <div className="food-card-media"><img src={preview} alt="" loading="lazy" /></div>}
      <div className="food-card-copy">
        <p className="eyebrow">{formatActivityLabel(food.food_type) || 'Food'}</p>
        <h3>{food.title}</h3>
        {food.summary && <p className="food-card-summary">{food.summary}</p>}
        <div className="food-card-meta">
          {countryLabel && <span className="country-identity-inline"><CountryFlag code={country?.code} decorative />{countryLabel}</span>}
          {date && <span>{date}</span>}
        </div>
      </div>
    </Link>
  )
}

export default FoodCard
