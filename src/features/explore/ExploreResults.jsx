import { useState } from 'react'
import { Link } from 'react-router-dom'
import CountryFlag from '../../shared/components/CountryFlag.jsx'
import { findCountry } from '../../shared/utils/country.js'
import { formatActivityLabel, formatCountryLabel } from '../home/latestContentFormatting.js'
import { isRenderablePlace } from '../map/mapGeometry.js'
import { getExplorePreview } from './exploreUtils.js'

function ExploreCard({ item, mode, countries, selectedId, onSelect }) {
  const [failedPreview, setFailedPreview] = useState(null)
  const route = mode === 'routes'
  const title = route ? item.title : item.name
  const country = findCountry(countries, item.country_id || item.country)
  const countryLabel = country?.name || formatCountryLabel(item.country)
  const preview = getExplorePreview(item)
  const mapped = route ? item.is_map_renderable === true : isRenderablePlace(item)

  return (
    <article className={`explore-discovery-card${selectedId === item.id ? ' is-selected' : ''}${preview && preview !== failedPreview ? ' has-preview' : ''}`}>
      <Link className="explore-discovery-card-link" to={`/${mode}/${encodeURIComponent(item.slug)}`}>
        {preview && preview !== failedPreview && (
          <div className="explore-discovery-media">
            <img src={preview} alt="" loading="lazy" decoding="async" onError={() => setFailedPreview(preview)} />
          </div>
        )}
        <div className="explore-discovery-card-body">
          <p className="explore-discovery-card-kind">{route ? 'Route' : 'Place'}</p>
          <h3>{title}</h3>
          <div className="explore-discovery-card-meta">
            {countryLabel && <span className="country-identity-inline"><CountryFlag code={country?.code} decorative /><span>{countryLabel}</span></span>}
            {route && item.activity_type && <span>{formatActivityLabel(item.activity_type)}</span>}
          </div>
          {item.summary && <p className="explore-discovery-summary">{item.summary}</p>}
          <span className="explore-discovery-card-detail">Explore {route ? 'route' : 'place'} <span aria-hidden="true">&rarr;</span></span>
        </div>
      </Link>
      {onSelect && mapped && (
        <button type="button" className="explore-card-map-action" aria-pressed={selectedId === item.id} aria-label={`Show ${title} on map`} onClick={() => onSelect(item.id)}>
          {selectedId === item.id ? 'Selected on map' : 'Show on map'}
        </button>
      )}
    </article>
  )
}

export default function ExploreResults({ items, total, mode, countries, status, onRetry, onMore, selectedId, onSelect }) {
  return (
    <div className="explore-discovery-results" aria-busy={status === 'loading'}>
      {status === 'loading' && <p className="explore-discovery-status" role="status">Loading {mode}...</p>}
      {status === 'error' && <p className="explore-discovery-status" role="status">Unable to load {mode}. <button type="button" className="explore-text-action" onClick={onRetry}>Try again</button></p>}
      {status === 'success' && items.length === 0 && <p className="explore-discovery-status" role="status">No {mode} match these filters.</p>}
      <div className="explore-discovery-grid">
        {items.map((item) => <ExploreCard key={item.id} item={item} mode={mode} countries={countries} selectedId={selectedId} onSelect={onSelect} />)}
      </div>
      {status === 'success' && items.length > 0 && <p className="explore-discovery-result-count" role="status">Showing {items.length} of {total} {mode}</p>}
      {items.length < total && <button type="button" className="explore-discovery-button explore-load-more" onClick={onMore}>Show more {mode}</button>}
    </div>
  )
}