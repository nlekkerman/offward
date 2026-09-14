import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MapView from '../features/map/components/MapView.jsx'
import { isRenderablePlace } from '../features/map/mapGeometry.js'
import { getPublicPlaceBySlug } from '../services/placesApi.js'
import NotFoundPage from './NotFoundPage.jsx'

function formatCountrySlug(value) {
  if (!value || typeof value !== 'string') {
    return 'Country pending'
  }

  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function PlacePage() {
  const { placeSlug } = useParams()
  const [placeResult, setPlaceResult] = useState({ slug: null, status: 'loading', place: null })

  useEffect(() => {
    let isCurrent = true

    async function loadPlace() {
      try {
        const data = await getPublicPlaceBySlug(placeSlug)
        if (isCurrent) {
          setPlaceResult({ slug: placeSlug, status: data ? 'success' : 'not-found', place: data })
        }
      } catch {
        if (isCurrent) {
          setPlaceResult({ slug: placeSlug, status: 'error', place: null })
        }
      }
    }

    loadPlace()
    return () => {
      isCurrent = false
    }
  }, [placeSlug])

  const placeStatus = placeResult.slug === placeSlug ? placeResult.status : 'loading'
  const place = placeResult.slug === placeSlug ? placeResult.place : null

  if (placeStatus === 'loading') {
    return <section className="place-detail-page"><p className="place-detail-status" role="status">Loading place...</p></section>
  }

  if (placeStatus === 'not-found') {
    return <NotFoundPage />
  }

  if (placeStatus === 'error') {
    return <section className="place-detail-page"><Link className="route-detail-back" to="/explore">Back to Explore</Link><div className="place-detail-error" role="alert"><p className="eyebrow">PLACE UNAVAILABLE</p><h1>Unable to load this Place</h1><p>There was a network or server problem loading the Place detail. Try again from Explore.</p></div></section>
  }

  const hasCoordinates = isRenderablePlace(place)

  return (
    <section className="place-detail-page">
      <Link className="route-detail-back" to="/explore">Back to Explore</Link>
      <header className="place-detail-header">
        <p className="eyebrow">PUBLIC PLACE</p>
        <h1>{place.name}</h1>
        <div className="route-detail-meta" aria-label="Place metadata"><span>{formatCountrySlug(place.country)}</span>{place.visited_at && <span>Visited {place.visited_at}</span>}</div>
        {place.summary && <p className="route-detail-summary">{place.summary}</p>}
      </header>
      <div className="place-detail-layout">
        <article className="place-detail-copy">
          {place.body && <div className="place-detail-body">{place.body}</div>}
        </article>
        <section className="place-detail-map-section" aria-labelledby="place-map-title">
          <div className="route-map-heading"><p className="eyebrow">MAP</p><h2 id="place-map-title">Place location</h2></div>
          {!hasCoordinates && <p className="route-map-message" role="status">Map location is currently unavailable for this Place.</p>}
          <MapView className="place-detail-map" places={hasCoordinates ? [place] : []} selectedPlaceId={hasCoordinates ? place.id : null} initialCenter={hasCoordinates ? [place.latitude, place.longitude] : [50, 10]} initialZoom={hasCoordinates ? 10 : 4} />
        </section>
      </div>
    </section>
  )
}

export default PlacePage