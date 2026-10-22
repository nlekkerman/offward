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
import NotFoundPage from './NotFoundPage.jsx'

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
  return `${distanceMeters} m`
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
  const [directionsRoute, setDirectionsRoute] = useState(null)
  const [placeJourneyPhase, setPlaceJourneyPhase] = useState(null)
  const [directionsOrigin, setDirectionsOrigin] = useState(null)
  const [initialMarkerDistanceKm, setInitialMarkerDistanceKm] = useState(null)
  const [independentTracking, setIndependentTracking] = useState(false)
  const [accessPathVisible, setAccessPathVisible] = useState(false)
  const [locationFollowing, setLocationFollowing] = useState(false)
  const [recenterRequest, setRecenterRequest] = useState(0)
  const [locationCenterRequest, setLocationCenterRequest] = useState(0)
  const galleryCacheRef = useRef(new Map())
  const {
    position: userPosition,
    active: locationActive,
    error: locationError,
    loading: locationLoading,
    start: startLocation,
    stop: stopLocation,
    locate: locateLocation,
  } = useUserLocation()
  const handleDirectionsStatusChange = useCallback((status) => {
    setDirectionsStatus(status)
    if (status.status === 'ready' && status.profile) {
      setDirectionsRoute({ profile: status.profile, distanceKm: status.distanceKm })
    }
  }, [])
  const requestPlaceDirections = useCallback((slug, origin, profile, signal) => (
    getPlaceDirections(slug, origin, profile, signal)
  ), [])
  const handleManualMapMovement = useCallback(() => {
    setLocationFollowing(false)
  }, [])

  useEffect(() => {
    if (!independentTracking && !directionsActive && locationActive) {
      stopLocation()
    }
  }, [directionsActive, independentTracking, locationActive, stopLocation])

  useEffect(() => () => stopLocation(), [stopLocation])

  useEffect(() => {
    setDirectionsActive(false)
    setDirectionsMode('walking')
    setDirectionsStatus(null)
    setDirectionsRoute(null)
    setPlaceJourneyPhase(null)
    setDirectionsOrigin(null)
    setInitialMarkerDistanceKm(null)
    setIndependentTracking(false)
    setAccessPathVisible(false)
    setLocationFollowing(false)
    setRecenterRequest(0)
    setLocationCenterRequest(0)
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

  useEffect(() => {
    if (!directionsActive || !place || !userPosition || directionsOrigin) return
    const accessGeometry = isRenderableRoute({ geometry: place.access_geometry })
      ? place.access_geometry
      : null
    const hasMarker = isValidLatitude(place.access_start_latitude) &&
      isValidLongitude(place.access_start_longitude)
    if (!accessGeometry || !hasMarker) return

    const origin = {
      latitude: userPosition.latitude,
      longitude: userPosition.longitude,
      accuracy: userPosition.accuracy,
    }
    const distanceKm = getStraightLineDistanceKm(origin, {
      lat: Number(place.access_start_latitude),
      lng: Number(place.access_start_longitude),
    })
    setDirectionsOrigin(origin)
    setInitialMarkerDistanceKm(distanceKm)
    if (distanceKm <= 1) {
      setDirectionsMode('walking')
      setPlaceJourneyPhase('walking')
    } else {
      setDirectionsMode('driving')
      setPlaceJourneyPhase('driving')
    }
  }, [directionsActive, directionsOrigin, place, userPosition])

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
    return <NotFoundPage />
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
  const accessMarkerName = typeof place?.access_start_name === 'string' ? place.access_start_name.trim() : ''
  const accessMarkerDescription = typeof place?.access_start_description === 'string' ? place.access_start_description.trim() : ''
  const accessMarkerSummaryName = accessMarkerName || 'the directions marker'
  const walkingDistanceMeters = accessGeometry ? getGeometryLengthMeters(accessGeometry) : 0
  const locateCurrentPosition = () => {
    locateLocation(() => setLocationCenterRequest((current) => current + 1))
  }
  const startFollowing = () => {
    setIndependentTracking(true)
    if (hasManualAccessPath) setAccessPathVisible(true)
    setLocationFollowing(true)
    if (!locationActive) startLocation()
  }
  const stopFollowing = () => {
    setIndependentTracking(false)
    setLocationFollowing(false)
  }
  const recenterOnLocation = () => {
    if (!userPosition) return
    setLocationFollowing(true)
    setRecenterRequest((current) => current + 1)
  }
  const retryLocation = () => {
    if (directionsActive) {
      startDirections()
    } else if (independentTracking) {
      startFollowing()
    } else {
      locateCurrentPosition()
    }
  }
  const startDirections = () => {
    if (!directionsAvailable) return
    setDirectionsStatus({ status: 'locating' })
    setDirectionsRoute(null)
    setPlaceJourneyPhase(null)
    setDirectionsOrigin(null)
    setInitialMarkerDistanceKm(null)
    setLocationFollowing(false)
    setDirectionsActive(true)
    if (!locationActive) startLocation()
  }
  const stopDirections = () => {
    setDirectionsActive(false)
    setDirectionsMode('walking')
    setDirectionsStatus(null)
    setDirectionsRoute(null)
    setPlaceJourneyPhase(null)
    setDirectionsOrigin(null)
    setInitialMarkerDistanceKm(null)
    setLocationFollowing(independentTracking)
  }
  const handleTravelModeChange = (mode) => {
    if (mode === directionsMode) return
    setDirectionsMode(mode)
    setDirectionsStatus(null)
    setPlaceJourneyPhase(mode === 'walking' ? 'walking-to-marker' : 'driving')
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
            <div className="public-map-controls">
              <div className="public-map-action-bar" role="group" aria-label="Map actions">
                <button
                  type="button"
                  className={`public-map-action public-map-action-directions${directionsActive ? ' is-active' : ''}`}
                  onClick={directionsActive ? stopDirections : startDirections}
                  disabled={!directionsActive && !directionsAvailable}
                  aria-describedby={directionsStatus || !directionsAvailable || locationError ? 'place-directions-feedback' : undefined}
                  aria-label={directionsActive ? 'Directions are active. Stop directions to the Place' : 'Start directions to the Place'}
                  aria-pressed={directionsActive}
                >
                  Directions
                  {directionsActive && <span className="public-map-action-state" aria-hidden="true">On</span>}
                </button>
                <button
                  type="button"
                  className={`public-map-action public-map-action-you${locationLoading ? ' is-loading' : ''}`}
                  onClick={locateCurrentPosition}
                  disabled={locationLoading || locationActive}
                  aria-label={locationLoading ? 'Locating your position' : 'Show your location'}
                  aria-busy={locationLoading}
                >
                  {locationLoading && <span className="public-map-location-spinner" aria-hidden="true" />}
                  You
                </button>
                <button
                  type="button"
                  className={`public-map-action public-map-action-track${independentTracking ? ' is-active' : ''}`}
                  onClick={independentTracking ? stopFollowing : startFollowing}
                  aria-label={independentTracking ? 'Stop continuous location tracking' : 'Start continuous location tracking'}
                  aria-pressed={independentTracking}
                >
                  {independentTracking && <span className="public-map-track-dot" aria-hidden="true" />}
                  {independentTracking ? 'Stop Track' : 'Track'}
                </button>
              </div>
              {userPosition && (
                <button type="button" className="public-map-recenter" onClick={recenterOnLocation}>
                  Recenter
                </button>
              )}
              <div className="public-map-secondary-controls">
                {directionsActive && (!hasManualAccessPath ||
                  (initialMarkerDistanceKm > 1 && initialMarkerDistanceKm <= 5 &&
                    placeJourneyPhase !== 'walking-after-driving')) && (
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
                {!directionsAvailable && (
                  <p className="route-directions-feedback" id="place-directions-feedback">
                    Directions are unavailable because this Place does not have valid coordinates.
                  </p>
                )}
                {directionsActive && !locationError && directionsStatus?.status === 'locating' && (
                  <p className="route-directions-feedback" id="place-directions-feedback" role="status">Waiting for your location...</p>
                )}
                {directionsActive && directionsStatus?.status === 'routing' && (
                  <p className="route-directions-feedback" id="place-directions-feedback" role="status">
                    Calculating {directionsMode} directions...
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
                {locationError && (
                  <p className="route-directions-feedback is-error" id="place-directions-feedback" role="alert">
                    {locationError}{' '}
                    <button type="button" className="route-directions-mode" onClick={retryLocation}>
                      Retry location
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
          {directionsActive && hasManualAccessPath && placeJourneyPhase && (
            <section className="place-directions-summary" aria-label="Journey instructions">
              {(placeJourneyPhase === 'driving' || placeJourneyPhase === 'walking-to-marker') && (
                <>
                  <p className="place-directions-leg">
                    <span className="place-directions-icon" aria-hidden="true">
                      {(directionsRoute?.profile || directionsMode) === 'walking' ? '🚶' : '🚗'}
                    </span>
                    {directionsRoute
                      ? `${directionsRoute.profile === 'walking' ? 'Walk' : 'Drive'} ${directionsRoute.distanceKm.toFixed(1)} km to ${accessMarkerSummaryName}.`
                      : directionsStatus?.status === 'error'
                        ? `${directionsMode === 'walking' ? 'Walking' : 'Driving'} route to ${accessMarkerSummaryName} could not be calculated.`
                        : `Calculating ${directionsMode === 'walking' ? 'walking' : 'driving'} route to ${accessMarkerSummaryName}...`}
                  </p>
                  <p className="place-directions-leg">
                    <span className="place-directions-icon" aria-hidden="true">🚶</span>
                    Then walk {formatWalkingDistance(walkingDistanceMeters)} to {placeTitle}.
                  </p>
                  <p className="place-directions-note">The solid line reaches the marker; the orange dashed line is the saved walking path from the marker.</p>
                  {directionsRoute && directionsRoute.profile !== directionsMode &&
                    (directionsStatus?.status === 'error' || directionsStatus?.status === 'routing') && (
                    <p className="place-directions-note">
                      {directionsStatus.status === 'error'
                        ? `Showing the previous ${directionsRoute.profile} route because the requested route failed.`
                        : `Showing the previous ${directionsRoute.profile} route while the ${directionsMode} route is calculated.`}
                    </p>
                  )}
                  {placeJourneyPhase === 'driving' && (
                    <button type="button" className="route-directions-mode" onClick={startWalking}>Start Walking</button>
                  )}
                </>
              )}
              {(placeJourneyPhase === 'walking' || placeJourneyPhase === 'walking-after-driving') && (
                <>
                  <p className="place-directions-leg">
                    <span className="place-directions-icon" aria-hidden="true">🚶</span>
                    {placeJourneyPhase === 'walking-after-driving' || isAtAccessMarker
                      ? `Walk ${formatWalkingDistance(walkingDistanceMeters)} to ${placeTitle}.`
                      : `Walk ${formatWalkingDistance(walkingDistanceMeters)} from ${accessMarkerSummaryName} to ${placeTitle}.`}
                  </p>
                  {placeJourneyPhase === 'walking' && !isAtAccessMarker && (
                    <p className="place-directions-note">The orange dashed line is the saved path from the directions marker; the visitor-to-marker route is not shown.</p>
                  )}
                  {(placeJourneyPhase === 'walking-after-driving' || isAtAccessMarker) && (
                    <p className="place-directions-note">The orange dashed saved walking path starts at {accessMarkerSummaryName}.</p>
                  )}
                </>
              )}
              {accessMarkerDescription && (
                <p className="place-directions-summary-description">{accessMarkerDescription}</p>
              )}
            </section>
          )}
          {hasCoordinates ? (
            <MapView
              className="place-detail-map"
              showBasemapSwitcher
              places={[place]}
              selectedPlaceId={place.id}
              directionsPlaceId={directionsActive ? place.id : null}
              showPlaceLabel
              initialCenter={[place.latitude, place.longitude]}
              initialZoom={10}
              followEnabled={locationFollowing && Boolean(userPosition)}
              mapChildren={(
                <>
                  {accessMarkerCoordinates && (
                    <PlaceDirectionsLayer
                      active={directionsActive && directionsAvailable && hasManualAccessPath}
                      showSavedPath={accessPathVisible && hasManualAccessPath}
                      phase={placeJourneyPhase}
                      onPhaseChange={setPlaceJourneyPhase}
                      mode={directionsMode}
                      position={userPosition}
                      origin={directionsOrigin}
                      placeSlug={placeSlug}
                      placeCoordinates={placeCoordinates}
                      accessGeometry={accessGeometry}
                      markerCoordinates={accessMarkerCoordinates}
                      markerName={accessMarkerName}
                      markerDescription={accessMarkerDescription}
                      onStatusChange={handleDirectionsStatusChange}
                    />
                  )}
                  {!hasManualAccessPath && (
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
                    followEnabled={locationFollowing && Boolean(userPosition)}
                    recenterRequest={recenterRequest}
                    centerRequest={locationCenterRequest}
                    onManualMovement={handleManualMapMovement}
                  />
                </>
              )}
            >
            </MapView>
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