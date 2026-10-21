import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EntityMediaSection from '../features/routes/components/EntityMediaSection.jsx'
import RelatedStories from '../features/routes/components/RelatedStories.jsx'
import RelatedFood from '../features/food/RelatedFood.jsx'
import { normalizeMediaIds, resolveAttachedVideos, resolveImageCollections } from '../features/routes/components/routeMediaUtils.js'
import MapView from '../features/map/components/MapView.jsx'
import PlaceDirectionsLayer from '../features/map/components/PlaceDirectionsLayer.jsx'
import RouteDirectionsLayer from '../features/map/components/RouteDirectionsLayer.jsx'
import RouteUserLocationLayer from '../features/map/components/RouteUserLocationLayer.jsx'
import { isRenderablePlace, isRenderableRoute, isValidLatitude, isValidLongitude } from '../features/map/mapGeometry.js'
import { getCountries } from '../services/countriesApi.js'
import { getPublicImageCollection } from '../services/imageCollectionsApi.js'
import { getPublicPlaceBySlug } from '../services/placesApi.js'
import { getPublicStories } from '../services/storiesApi.js'
import { getPublicVideos } from '../services/videosApi.js'
import { getPlaceDirections, getStraightLineDistanceKm, MAX_LOCAL_DIRECTIONS_KM } from '../services/routeDirectionsApi.js'
import ImageLightbox from '../shared/components/ImageLightbox.jsx'
import CountryFlag from '../shared/components/CountryFlag.jsx'
import DetailHero from '../shared/components/DetailHero.jsx'
import PageMetadata from '../shared/components/PageMetadata.jsx'
import ShareControl from '../shared/components/ShareControl.jsx'
import useUserLocation from '../shared/hooks/useUserLocation.js'
import { countryName, findCountry } from '../shared/utils/country.js'
import { getContentDescription, getContentSocialImage, getPublicUrl } from '../shared/utils/publicUrls.js'

function formatCountrySlug(value) {
  if (!value || typeof value !== 'string') {
    return 'Country pending'
  }

  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getGeometryLengthMeters(geometry) {
  if (!isRenderableRoute({ geometry })) return 0
  let lengthKm = 0
  for (let index = 1; index < geometry.coordinates.length; index += 1) {
    const [previousLongitude, previousLatitude] = geometry.coordinates[index - 1]
    const [longitude, latitude] = geometry.coordinates[index]
    lengthKm += getStraightLineDistanceKm(
      { latitude: previousLatitude, longitude: previousLongitude },
      { lat: latitude, lng: longitude },
    )
  }
  return Math.round(lengthKm * 1000)
}

function formatWalkingDistance(distanceMeters) {
  return distanceMeters >= 1000
    ? `${(distanceMeters / 1000).toFixed(1)} km`
    : `${distanceMeters} m`
}

function PlacePage() {
  const { placeSlug } = useParams()
  const [placeResult, setPlaceResult] = useState({ slug: null, status: 'loading', place: null })
  const [countries, setCountries] = useState([])
  const [videoCatalog, setVideoCatalog] = useState({ status: 'idle', videos: [] })
  const [storyCatalog, setStoryCatalog] = useState({ status: 'idle', stories: [] })
  const [lightbox, setLightbox] = useState({ gallery: null, index: -1 })
  const [galleryLoadingId, setGalleryLoadingId] = useState(null)
  const [galleryErrorByCollectionId, setGalleryErrorByCollectionId] = useState({})
  const [directionsActive, setDirectionsActive] = useState(false)
  const [directionsMode, setDirectionsMode] = useState('walking')
  const [directionsStatus, setDirectionsStatus] = useState(null)
  const [placeJourneyPhase, setPlaceJourneyPhase] = useState(null)
  const galleryCacheRef = useRef(new Map())
  const {
    position: userPosition,
    active: locationActive,
    error: locationError,
    start: startLocation,
    stop: stopLocation,
  } = useUserLocation()
  const handleDirectionsStatusChange = useCallback((status) => {
    setDirectionsStatus(status)
  }, [])
  const requestPlaceDirections = useCallback((slug, origin, profile, signal) => (
    getPlaceDirections(slug, origin, profile, signal)
  ), [])
  const handleManualMapMovement = useCallback(() => {}, [])

  useEffect(() => () => stopLocation(), [stopLocation])

  useEffect(() => {
    setDirectionsActive(false)
    setDirectionsMode('walking')
    setDirectionsStatus(null)
    setPlaceJourneyPhase(null)
    stopLocation()
  }, [placeSlug, stopLocation])

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

  useEffect(() => {
    let isCurrent = true
    getCountries()
      .then((data) => { if (isCurrent) setCountries(data) })
      .catch(() => { if (isCurrent) setCountries([]) })
    return () => { isCurrent = false }
  }, [])

  const place = placeResult.slug === placeSlug ? placeResult.place : null
  const placeCoordinates = useMemo(() => ({
    lat: place?.latitude,
    lng: place?.longitude,
  }), [place?.latitude, place?.longitude])
  const mediaIds = useMemo(() => normalizeMediaIds(place?.media_ids), [place])

  useEffect(() => {
    if (mediaIds.length === 0) {
      setVideoCatalog({ status: 'idle', videos: [] })
      return undefined
    }
    let isCurrent = true
    setVideoCatalog({ status: 'loading', videos: [] })
    getPublicVideos().then((videos) => {
      if (isCurrent) setVideoCatalog({ status: 'success', videos })
    }).catch(() => {
      if (isCurrent) setVideoCatalog({ status: 'error', videos: [] })
    })
    return () => { isCurrent = false }
  }, [mediaIds])

  useEffect(() => {
    const storyIds = Array.isArray(place?.story_ids) ? place.story_ids : []
    if (storyIds.length === 0) {
      setStoryCatalog({ status: 'idle', stories: [] })
      return undefined
    }
    let isCurrent = true
    setStoryCatalog({ status: 'loading', stories: [] })
    getPublicStories().then((stories) => {
      if (isCurrent) setStoryCatalog({ status: 'success', stories })
    }).catch(() => {
      if (isCurrent) setStoryCatalog({ status: 'error', stories: [] })
    })
    return () => { isCurrent = false }
  }, [place])

  const videoById = useMemo(() => new Map(videoCatalog.videos.map((video) => [String(video.id), video])), [videoCatalog.videos])
  const videos = useMemo(() => resolveAttachedVideos(place, videoById), [place, videoById])
  const galleries = useMemo(() => resolveImageCollections(place), [place])
  const relatedStories = useMemo(() => {
    const ids = new Set((place?.story_ids || []).map((storyId) => String(storyId)))
    return storyCatalog.stories.filter((story) => ids.has(String(story.id)))
  }, [place, storyCatalog.stories])

  const openGallery = async (galleryPreview, startIndex = 0) => {
    const collectionId = galleryPreview?.id ? String(galleryPreview.id) : ''
    if (!collectionId || galleryLoadingId === collectionId) return
    setGalleryErrorByCollectionId((current) => ({ ...current, [collectionId]: null }))
    const cached = galleryCacheRef.current.get(collectionId)
    if (cached) {
      setLightbox({ gallery: cached, index: Math.min(startIndex, Math.max(0, (cached.images || []).length - 1)) })
      return
    }
    setGalleryLoadingId(collectionId)
    try {
      const fullCollection = await getPublicImageCollection(collectionId)
      galleryCacheRef.current.set(collectionId, fullCollection)
      setLightbox({ gallery: fullCollection, index: Math.min(startIndex, Math.max(0, (fullCollection.images || []).length - 1)) })
    } catch {
      setGalleryErrorByCollectionId((current) => ({ ...current, [collectionId]: 'Unable to load gallery. Try again.' }))
    } finally {
      setGalleryLoadingId((current) => (current === collectionId ? null : current))
    }
  }

  const placeStatus = placeResult.slug === placeSlug ? placeResult.status : 'loading'

  if (placeStatus === 'loading') {
    return <section className="place-detail-page"><p className="place-detail-status" role="status">Loading place...</p></section>
  }

  if (placeStatus === 'not-found') {
    return (
      <section className="place-detail-page">
        <Link className="route-detail-back" to="/explore?view=places">Back to Explore</Link>
        <div className="place-detail-error" role="alert">
          <p className="eyebrow">PLACE NOT FOUND</p>
          <h1>This Place could not be found</h1>
          <p>The Place you are looking for may have been removed or is no longer published.</p>
        </div>
      </section>
    )
  }

  if (placeStatus === 'error') {
    return <section className="place-detail-page"><Link className="route-detail-back" to="/explore?view=places">Back to Explore</Link><div className="place-detail-error" role="alert"><p className="eyebrow">PLACE UNAVAILABLE</p><h1>Unable to load this Place</h1><p>There was a network or server problem loading the Place detail. Try again from Explore.</p></div></section>
  }

  const hasCoordinates = isRenderablePlace(place)
  const directionsAvailable = hasCoordinates &&
    typeof placeSlug === 'string' &&
    placeSlug.trim().length > 0
  const accessGeometry = isRenderableRoute({ geometry: place?.access_geometry })
    ? place.access_geometry
    : null
  const accessMarkerCoordinates = isValidLatitude(place?.access_start_latitude) &&
    isValidLongitude(place?.access_start_longitude)
    ? {
        latitude: Number(place.access_start_latitude),
        longitude: Number(place.access_start_longitude),
      }
    : null
  const hasManualAccessPath = Boolean(accessGeometry && accessMarkerCoordinates)
  const accessMarkerName = [
    place?.access_start_name,
    place?.directions_marker_name,
    place?.access_marker_name,
  ].find((value) => typeof value === 'string' && value.trim())?.trim() || 'Walking path starts here'
  const accessMarkerDescription = [
    place?.access_start_description,
    place?.directions_marker_description,
    place?.access_marker_description,
  ].find((value) => typeof value === 'string' && value.trim())?.trim() || ''
  const walkingDistanceMeters = accessGeometry ? getGeometryLengthMeters(accessGeometry) : 0
  const startDirections = () => {
    if (!directionsAvailable) return
    setDirectionsStatus({ status: 'locating' })
    setPlaceJourneyPhase(null)
    setDirectionsActive(true)
    if (!locationActive) startLocation()
  }
  const stopDirections = () => {
    setDirectionsActive(false)
    setDirectionsMode('walking')
    setDirectionsStatus(null)
    setPlaceJourneyPhase(null)
    stopLocation()
  }
  const handleTravelModeChange = (mode) => {
    setDirectionsMode(mode)
    setDirectionsStatus(null)
  }
  const country = findCountry(countries, place.country)
  const countryLabel = countryName(country, formatCountrySlug(place.country))
  const lightboxImages = lightbox.gallery?.images || []
  const placeTitle = place.name || 'Place'
  const placeDescription = getContentDescription(place.summary, placeTitle, place.country ? countryLabel : '')
  const placePath = `/places/${encodeURIComponent(placeSlug)}`
  const placeUrl = getPublicUrl(placePath)
  const markerDistanceKm = userPosition && accessMarkerCoordinates
    ? getStraightLineDistanceKm(userPosition, {
        lat: accessMarkerCoordinates.latitude,
        lng: accessMarkerCoordinates.longitude,
      })
    : null
  const isAtAccessMarker = markerDistanceKm !== null &&
    markerDistanceKm * 1000 <= 25 &&
    typeof userPosition.accuracy === 'number' &&
    userPosition.accuracy <= 35
  const startWalking = () => setPlaceJourneyPhase('walking-after-driving')

  return (
    <section className="place-detail-page place-detail-content-page">
      <PageMetadata
        title={placeTitle}
        description={placeDescription}
        path={placePath}
        image={getContentSocialImage(place)}
      />
      <DetailHero>
        <header className="place-detail-header">
          <p className="eyebrow">PUBLIC PLACE</p>
          <h1>{placeTitle}</h1>
          <ShareControl type="place" title={placeTitle} url={placeUrl} description={typeof place.summary === 'string' && place.summary.trim() ? place.summary.trim() : undefined} />
          <div className="route-detail-meta" aria-label="Place metadata">
            <span className="country-identity-inline"><CountryFlag code={country?.code} decorative />{countryLabel}</span>
            {place.visited_at && <span>Visited {place.visited_at}</span>}
          </div>
          {place.summary && <p className="route-detail-summary">{place.summary}</p>}
        </header>
      </DetailHero>
      <Link className="route-detail-back" to="/explore?view=places">Back to Explore</Link>
      <div className="place-detail-layout">
        {place.body && (
          <article className="place-detail-copy">
            <div className="place-detail-body">{place.body}</div>
          </article>
        )}
        <section className="place-detail-map-section" aria-labelledby="place-map-title">
          <div className="route-map-heading">
            <div><p className="eyebrow">MAP</p><h2 id="place-map-title">Place location</h2></div>
            <div className="route-directions-controls">
              <button
                type="button"
                className={`route-directions-button ${directionsActive ? 'danger-button' : 'primary-button'}`}
                onClick={directionsActive ? stopDirections : startDirections}
                disabled={!directionsActive && !directionsAvailable}
                aria-describedby={directionsStatus || !directionsAvailable || locationError ? 'place-directions-feedback' : undefined}
              >
                {directionsActive ? 'Stop directions' : 'Directions to place'}
              </button>
              {!directionsAvailable && (
                <p className="route-directions-feedback" id="place-directions-feedback">
                  Directions are unavailable because this Place does not have valid coordinates.
                </p>
              )}
              {directionsActive && !hasManualAccessPath && (
                <div className="route-directions-modes" role="group" aria-label="Directions travel mode">
                  <button
                    type="button"
                    className="route-directions-mode"
                    aria-pressed={directionsMode === 'walking'}
                    onClick={() => handleTravelModeChange('walking')}
                  >
                    Walking
                  </button>
                  <button
                    type="button"
                    className="route-directions-mode"
                    aria-pressed={directionsMode === 'driving'}
                    onClick={() => handleTravelModeChange('driving')}
                  >
                    Driving
                  </button>
                </div>
              )}
              {directionsActive && hasManualAccessPath && (
                <section className="place-directions-summary" aria-label="Journey instructions">
                  {placeJourneyPhase === 'driving' && (
                    <>
                      <p className="place-directions-leg">
                        <span className="place-directions-icon" aria-hidden="true">🚗</span>
                        {directionsStatus?.status === 'ready'
                          ? `Drive ${directionsStatus.distanceKm.toFixed(1)} km to ${accessMarkerName}.`
                          : `Drive to ${accessMarkerName}.`}
                      </p>
                      <p className="place-directions-leg">
                        <span className="place-directions-icon" aria-hidden="true">🚶</span>
                        Then walk {formatWalkingDistance(walkingDistanceMeters)} to {placeTitle}.
                      </p>
                      <p className="place-directions-note">The saved walking path begins at the directions marker.</p>
                      <button type="button" className="route-directions-mode" onClick={startWalking}>Start Walking</button>
                    </>
                  )}
                  {(placeJourneyPhase === 'walking' || placeJourneyPhase === 'walking-after-driving') && (
                    <>
                      <p className="place-directions-leg">
                        <span className="place-directions-icon" aria-hidden="true">🚶</span>
                        {placeJourneyPhase === 'walking-after-driving' || isAtAccessMarker
                          ? `Walk ${formatWalkingDistance(walkingDistanceMeters)} to ${placeTitle}.`
                          : `Walk to ${placeTitle} via the saved walking path.`}
                      </p>
                      {placeJourneyPhase === 'walking' && !isAtAccessMarker && (
                        <p className="place-directions-note">
                          The path starts at {accessMarkerName}; get to the directions marker to begin.
                        </p>
                      )}
                      {(placeJourneyPhase === 'walking-after-driving' || isAtAccessMarker) && (
                        <p className="place-directions-note">Walking path starts at {accessMarkerName}.</p>
                      )}
                    </>
                  )}
                </section>
              )}
              {directionsActive && !locationError && directionsStatus?.status === 'locating' && (
                <p className="route-directions-feedback" id="place-directions-feedback" role="status">Waiting for your location...</p>
              )}
              {directionsActive && directionsStatus?.status === 'routing' && (
                <p className="route-directions-feedback" id="place-directions-feedback" role="status">
                  Calculating {hasManualAccessPath ? 'driving' : directionsMode} directions...
                </p>
              )}
              {directionsActive && !hasManualAccessPath && directionsStatus?.status === 'too-far' && (
                <p className="route-directions-feedback" id="place-directions-feedback" role="status">
                  You're more than {MAX_LOCAL_DIRECTIONS_KM} km from this Place. Directions are available when you're closer.
                </p>
              )}
              {directionsActive && !hasManualAccessPath && directionsStatus?.status === 'ready' && (
                <p className="route-directions-feedback" id="place-directions-feedback" role="status">
                  {directionsMode === 'walking' ? 'Walking' : 'Driving'} route: {directionsStatus.distanceKm.toFixed(1)} km
                </p>
              )}
              {directionsStatus?.status === 'error' && (
                <p className="route-directions-feedback is-error" id="place-directions-feedback" role="alert">
                  {directionsStatus.message}
                </p>
              )}
              {locationError && directionsActive && (
                <p className="route-directions-feedback is-error" id="place-directions-feedback" role="alert">
                  {locationError}{' '}
                  <button type="button" className="route-directions-mode" onClick={startDirections}>
                    Retry location
                  </button>
                </p>
              )}
            </div>
          </div>
          {hasCoordinates ? (
            <MapView
              className="place-detail-map"
              places={[place]}
              selectedPlaceId={place.id}
              directionsPlaceId={directionsActive ? place.id : null}
              showPlaceLabel
              initialCenter={[place.latitude, place.longitude]}
              initialZoom={10}
              mapChildren={(
                <>
                  {hasManualAccessPath ? (
                    <PlaceDirectionsLayer
                      active={directionsActive && directionsAvailable}
                      phase={placeJourneyPhase}
                      onPhaseChange={setPlaceJourneyPhase}
                      position={userPosition}
                      placeSlug={placeSlug}
                      placeCoordinates={placeCoordinates}
                      accessGeometry={accessGeometry}
                      markerCoordinates={accessMarkerCoordinates}
                      markerName={accessMarkerName}
                      markerDescription={accessMarkerDescription}
                      onStatusChange={handleDirectionsStatusChange}
                    />
                  ) : (
                    <RouteDirectionsLayer
                      active={directionsActive && directionsAvailable}
                      position={userPosition}
                      routeSlug={placeSlug}
                      startCoordinates={placeCoordinates}
                      mode={directionsMode}
                      onStatusChange={handleDirectionsStatusChange}
                      requestDirections={requestPlaceDirections}
                    />
                  )}
                  <RouteUserLocationLayer
                    position={userPosition}
                    followEnabled={false}
                    recenterRequest={0}
                    onManualMovement={handleManualMapMovement}
                  />
                </>
              )}
            />
          ) : (
            <p className="route-map-message" role="status">Map location is unavailable for this Place.</p>
          )}
        </section>
      </div>
      {videoCatalog.status === 'error' && <p className="place-detail-secondary-error" role="alert">Unable to load Place videos.</p>}
      <EntityMediaSection videos={videos} galleries={galleries} onOpenGallery={openGallery} loadingGalleryId={galleryLoadingId} galleryErrorByCollectionId={galleryErrorByCollectionId} />
      {storyCatalog.status === 'error' && <p className="place-detail-secondary-error" role="alert">Unable to load related Stories.</p>}
      <RelatedStories stories={relatedStories} />
      <RelatedFood foodIds={place.food_ids} />
      <ImageLightbox
        images={lightboxImages}
        activeIndex={lightbox.index}
        isOpen={lightbox.index >= 0}
        onClose={() => setLightbox({ gallery: null, index: -1 })}
        onPrevious={() => setLightbox((current) => ({ ...current, index: (current.index - 1 + lightboxImages.length) % lightboxImages.length }))}
        onNext={() => setLightbox((current) => ({ ...current, index: (current.index + 1) % lightboxImages.length }))}
      />
    </section>
  )
}
export default PlacePage