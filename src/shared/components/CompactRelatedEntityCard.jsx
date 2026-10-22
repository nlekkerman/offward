import { useState } from 'react'
import { Link } from 'react-router-dom'
import { collectionPreview, firstCollectionPreview, imagePreviewUrl, imageUrl } from '../../features/management/imageCollectionUtils.js'
import CountryFlag from './CountryFlag.jsx'
import LocationPinFallback from './LocationPinFallback.jsx'
import { trackInteraction } from '../../services/analytics.js'

function getPreview(entity, entityType) {
  if (entityType === 'Place') return firstCollectionPreview(entity?.image_collections)
  const firstCollection = Array.isArray(entity?.image_collections) ? entity.image_collections[0] : null
  return imageUrl(entity?.hero_image)
    || collectionPreview(firstCollection)
    || imagePreviewUrl(entity?.preview_image)
    || entity?.preview_image_url
    || imageUrl(entity?.image)
    || imageUrl(entity?.thumbnail)
}

function CompactRelatedEntityCard({
  entity,
  entityType,
  href,
  country,
  countryLabel,
  activityLabel,
}) {
  const [failedPreview, setFailedPreview] = useState(null)
  const preview = getPreview(entity, entityType)
  const hasPreview = Boolean(preview) && preview !== failedPreview
  const title = entity?.title || entity?.name || entityType
  const metaLabel = [countryLabel, activityLabel].filter(Boolean).join(' · ')

  return (
    <Link
      to={href}
      className="compact-related-card"
      onClick={() => {
        const contentType = entityType?.toLowerCase()
        if (contentType === 'place' || contentType === 'route') {
          trackInteraction('related_content', contentType, entity?.id)
        }
      }}
    >
      <span className="compact-related-card-media">
        {hasPreview
          ? <img src={preview} alt="" loading="lazy" onError={() => setFailedPreview(preview)} />
          : entityType === 'Place'
            ? <LocationPinFallback />
            : <span className="compact-related-card-fallback" aria-hidden="true">{entityType === 'Route' ? '⤳' : '◈'}</span>}
      </span>
      <span className="compact-related-card-body">
        <span className="compact-related-card-eyebrow">{entityType}</span>
        <span className="compact-related-card-title">{title}</span>
        {metaLabel && (
          <span className="compact-related-card-meta country-identity-inline">
            {countryLabel && <CountryFlag code={country?.code} decorative />}
            {metaLabel}
          </span>
        )}
      </span>
    </Link>
  )
}

export default CompactRelatedEntityCard
