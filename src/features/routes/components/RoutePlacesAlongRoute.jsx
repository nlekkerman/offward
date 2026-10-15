import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { publicPlaceCatalog } from '../../food/publicRelationshipCatalog.js'
import { findCountry } from '../../../shared/utils/country.js'
import { formatCountryLabel } from '../../home/latestContentFormatting.js'
import CompactRelatedEntityCard from '../../../shared/components/CompactRelatedEntityCard.jsx'
import { getRoutePlaceIds } from '../routePlaceUtils.js'

function RoutePlacesAlongRoute({ waypoints = [], countries = [] }) {
  const placeIds = useMemo(() => getRoutePlaceIds(waypoints), [waypoints])
  const catalog = useSyncExternalStore(
    publicPlaceCatalog.subscribe,
    publicPlaceCatalog.getSnapshot,
    publicPlaceCatalog.getSnapshot,
  )

  useEffect(() => {
    if (placeIds.length > 0 && catalog.status === 'idle') {
      publicPlaceCatalog.loadNext().catch(() => {})
    }
  }, [catalog.status, placeIds.length])

  const relatedPlaces = useMemo(() => {
    const placesById = new Map(catalog.records
      .filter((place) => place?.id && place.slug)
      .map((place) => [String(place.id), place]))
    return placeIds.map((id) => placesById.get(id)).filter(Boolean)
  }, [catalog.records, placeIds])
  const unresolvedCount = placeIds.length - relatedPlaces.length

  if (placeIds.length === 0) {
    return null
  }

  const loadNextPage = () => publicPlaceCatalog.loadNext().catch(() => {})

  if (relatedPlaces.length === 0) {
    if (catalog.status === 'loading') {
      return <p className="route-detail-muted" role="status">Checking linked Places in the public catalog…</p>
    }
    if (catalog.status === 'error') {
      return (
        <p className="place-detail-secondary-error" role="alert">
          Unable to resolve Places along this Route.{' '}
          <button type="button" className="food-button" onClick={loadNextPage}>Retry lookup</button>
        </p>
      )
    }
    if (catalog.next) {
      return (
        <p className="route-detail-muted">
          <button type="button" className="food-button" onClick={loadNextPage}>
            Check the next public Places page for linked Places
          </button>
        </p>
      )
    }
    return null
  }

  return (
    <section className="route-detail-related-places" aria-labelledby="route-places-title">
      <h2 id="route-places-title">Places along the Route</h2>
      <div className="compact-related-grid">
        {relatedPlaces.map((place) => {
          const country = findCountry(countries, place.country)
          const countryLabel = formatCountryLabel(country) || formatCountryLabel(place.country)
          return (
            <CompactRelatedEntityCard
              key={place.id}
              entity={place}
              entityType="Place"
              href={`/places/${encodeURIComponent(place.slug)}`}
              country={country}
              countryLabel={countryLabel}
            />
          )
        })}
      </div>
      {unresolvedCount > 0 && (
        <div className="route-places-lookup" aria-live="polite">
          {catalog.status === 'loading' && <p role="status">Checking the loaded public Places…</p>}
          {catalog.status === 'error' && <p role="alert">Unable to check additional linked Places.</p>}
          {catalog.next && (
            <button type="button" className="food-button" disabled={catalog.status === 'loading'} onClick={loadNextPage}>
              {catalog.status === 'error' ? 'Retry Places lookup' : 'Check next Places page'}
            </button>
          )}
        </div>
      )}
    </section>
  )
}

export default RoutePlacesAlongRoute
