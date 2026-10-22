import { apiClient } from './apiClient.js'

export const MAX_LOCAL_DIRECTIONS_KM = 30

const EARTH_RADIUS_KM = 6371.0088
const VALID_PROFILES = new Set(['walking', 'driving'])

export function getStraightLineDistanceKm(origin, destination) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180
  const latitudeDifference = toRadians(destination.lat - origin.latitude)
  const longitudeDifference = toRadians(destination.lng - origin.longitude)
  const originLatitude = toRadians(origin.latitude)
  const destinationLatitude = toRadians(destination.lat)
  const haversine = Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(originLatitude) *
    Math.cos(destinationLatitude) *
    Math.sin(longitudeDifference / 2) ** 2

  const boundedHaversine = Math.min(1, Math.max(0, haversine))
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(boundedHaversine), Math.sqrt(1 - boundedHaversine))
}

function getResponseErrorText(value) {
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    return value.map(getResponseErrorText).join(' ')
  }
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, nestedValue]) => `${key} ${getResponseErrorText(nestedValue)}`)
      .join(' ')
  }
  return ''
}

function getDirectionsError(error) {
  const response = error?.response
  if (!response) {
    return new Error('Unable to connect to Offward directions. Check your connection and try again.')
  }

  const responseText = getResponseErrorText(response.data).replaceAll('_', ' ').toLowerCase()

  if (response.status === 429) {
    return new Error('Directions are temporarily rate-limited. Please try again later.')
  }
  if (response.status >= 500) {
    return new Error('The routing service is unavailable or its quota has been exhausted. Please try again later.')
  }
  if (/30\s*(?:km|kilomet(?:er|re)s?)/i.test(responseText)) {
    return new Error(`You must be within ${MAX_LOCAL_DIRECTIONS_KM} km of this Route's starting point for directions.`)
  }
  if (
    response.status === 404 ||
    response.status === 409 ||
    /start(?:ing)? waypoint|waypoint.{0,30}(?:missing|ambiguous|unique|found)/i.test(responseText)
  ) {
    return new Error('This Route does not have a uniquely identified starting waypoint.')
  }
  if (response.status === 400 || response.status === 422) {
    const invalidOriginOrProfile = /\b(?:origin|profile)\b/.test(responseText)
    return new Error(invalidOriginOrProfile
      ? 'Your location or travel mode is invalid. Check them and try again.'
      : 'The directions request was invalid, or this Route does not have a unique starting waypoint.')
  }

  return new Error('Offward could not calculate directions. Please try again.')
}

function getRouteAccessDirectionsError(error) {
  const response = error?.response
  if (!response) {
    return new Error('Unable to connect to Offward directions. Check your connection and try again.')
  }

  const responseText = getResponseErrorText(response.data).replaceAll('_', ' ').toLowerCase()
  if (response.status === 400) {
    if (
      /distance|radius|too far/i.test(responseText) ||
      hasResponseErrorCode(response.data, 'origin_too_far')
    ) {
      return new Error("You're too far from this Route for directions.")
    }
    return new Error('Your location or travel mode is invalid. Check them and try again.')
  }
  if (response.status === 404) {
    return new Error('This Route could not be found. It may have been removed or is no longer published.')
  }
  if (response.status === 409) {
    return new Error('Walking access directions are unavailable for this Route.')
  }
  if (response.status === 429) {
    return new Error('Directions are temporarily rate-limited. Please try again later.')
  }
  if (response.status === 502) {
    return new Error('The routing service returned invalid directions. Please try again later.')
  }
  if (response.status === 503) {
    return new Error('Directions are temporarily unavailable. Please try again later.')
  }
  if (response.status === 504) {
    return new Error('The routing request timed out. Please try again.')
  }
  if (response.status >= 500) {
    return new Error('The routing service is unavailable. Please try again later.')
  }

  return new Error('Offward could not calculate walking access directions. Please try again.')
}

function hasResponseErrorCode(data, code) {
  if (data?.code === code) {
    return true
  }
  return Array.isArray(data?.errors) && data.errors.some((item) => item?.code === code)
}

function getPlaceDirectionsError(error) {
  const response = error?.response
  if (!response) {
    return new Error('Unable to connect to Offward directions. Check your connection and try again.')
  }

  if (response.status === 404) {
    return new Error('This Place could not be found. It may have been removed or is no longer published.')
  }
  if (response.status === 409) {
    return new Error('Directions are unavailable because this Place does not have valid coordinates.')
  }
  if (response.status === 400) {
    if (hasResponseErrorCode(response.data, 'origin_too_far')) {
      return new Error(`You must be within ${MAX_LOCAL_DIRECTIONS_KM} km of this Place for directions.`)
    }
    return new Error('Your location or travel mode is invalid. Check them and try again.')
  }
  if (response.status === 429) {
    return new Error('Directions are temporarily rate-limited. Please try again later.')
  }
  if (response.status === 503) {
    return new Error('Directions are temporarily unavailable. Please try again later.')
  }
  if (response.status === 504) {
    return new Error('The routing request timed out. Please try again.')
  }
  if (response.status === 422) {
    return new Error('Your location or travel mode is invalid. Check them and try again.')
  }
  if (response.status >= 500) {
    return new Error('The routing service is unavailable. Please try again later.')
  }

  return new Error('Offward could not calculate directions. Please try again.')
}

function isValidCoordinate(value, minimum, maximum) {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
}

function isValidLineString(geometry) {
  const coordinates = geometry?.coordinates
  const validCoordinates = Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    coordinates.every((coordinate) =>
      Array.isArray(coordinate) &&
      isValidCoordinate(coordinate[0], -180, 180) &&
      isValidCoordinate(coordinate[1], -90, 90)
    )

  return geometry?.type === 'LineString' && validCoordinates
}

function isValidDirectionsDistance(distance) {
  return typeof distance === 'number' && Number.isFinite(distance) && distance >= 0
}

function validateDirectionsResponse(data, profile) {
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    data.profile !== profile ||
    !isValidLineString(data.geometry) ||
    !isValidDirectionsDistance(data.distance_km)
  ) {
    throw new Error('Offward returned an invalid directions response.')
  }
}

function isValidLatLng(coordinates) {
  return coordinates &&
    typeof coordinates === 'object' &&
    isValidCoordinate(coordinates.lat, -90, 90) &&
    isValidCoordinate(coordinates.lng, -180, 180)
}

function validateRouteAccessDirectionsResponse(data, routeId) {
  const validFallbackReasons = new Set([
    'geometry_missing',
    'geometry_invalid',
    'geometry_stale',
    'no_candidate_within_radius',
    'no_routable_candidate',
  ])
  const isFallback = data?.fallback?.used === true
  const validFallback = data?.fallback &&
    typeof data.fallback === 'object' &&
    typeof data.fallback.used === 'boolean' &&
    (isFallback
      ? validFallbackReasons.has(data.fallback.reason)
      : data.fallback.reason === null)
  const validAccess = data?.access &&
    typeof data.access === 'object' &&
    (data.access.type === 'route_geometry' || data.access.type === 'official_start') &&
    isValidLatLng(data.access.coordinates) &&
    typeof data.access.selection === 'string' &&
    data.access.selection.length > 0 &&
    isValidLatLng(data.access.snapped_coordinates) &&
    isValidDirectionsDistance(data.access.destination_displacement_meters)
  const validApproach = data?.approach &&
    typeof data.approach === 'object' &&
    isValidLineString(data.approach.geometry) &&
    isValidDirectionsDistance(data.approach.distance_km) &&
    (data.approach.duration_seconds === undefined ||
      isValidDirectionsDistance(data.approach.duration_seconds))

  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    data.profile !== 'walking' ||
    typeof routeId !== 'string' ||
    data.route_id !== routeId ||
    !Number.isInteger(data.map_revision) ||
    data.map_revision < 0 ||
    !validAccess ||
    !validApproach ||
    !validFallback ||
    (data.access.type === 'official_start') !== isFallback ||
    !Number.isInteger(data.evaluated_candidates) ||
    data.evaluated_candidates < 0 ||
    data.evaluated_candidates > 3
  ) {
    throw new Error('Offward returned an invalid walking access directions response.')
  }
}

function validatePlaceDirectionsResponse(data, requestedProfile) {
  const isObject = data && typeof data === 'object' && !Array.isArray(data)
  const matchesRequestedProfile = data?.profile === requestedProfile
  const isCompositeAccessResponse = data?.profile === 'driving' &&
    data?.access?.profile === 'walking' &&
    isValidLineString(data?.access?.geometry)
  const hasValidOptionalAccess = data?.access === null ||
    data?.access === undefined ||
    (data.access?.profile === 'walking' && isValidLineString(data.access?.geometry))

  if (
    !isObject ||
    (!matchesRequestedProfile && !isCompositeAccessResponse) ||
    !isValidLineString(data.geometry) ||
    !isValidDirectionsDistance(data.distance_km) ||
    !hasValidOptionalAccess
  ) {
    throw new Error('Offward returned an invalid directions response.')
  }
}

export async function getRouteDirections(routeSlug, origin, profile, signal) {
  if (typeof routeSlug !== 'string' || routeSlug.trim().length === 0) {
    throw new Error('A Route is required to request directions.')
  }
  if (
    !origin ||
    !isValidCoordinate(origin.lat, -90, 90) ||
    !isValidCoordinate(origin.lng, -180, 180)
  ) {
    throw new Error('Your location is invalid. Check your location and try again.')
  }
  if (!VALID_PROFILES.has(profile)) {
    throw new Error('The selected travel mode is invalid. Choose walking or driving.')
  }

  let data
  try {
    const response = await apiClient.post(
      `/api/offward/routes/${encodeURIComponent(routeSlug)}/directions/`,
      {
        origin: { lat: origin.lat, lng: origin.lng },
        profile,
      },
      { signal },
    )
    data = response.data
  } catch (error) {
    if (signal?.aborted || error?.code === 'ERR_CANCELED') {
      throw error
    }
    throw getDirectionsError(error)
  }

  validateDirectionsResponse(data, profile)
  return data
}

export async function getRouteAccessDirections(routeSlug, routeId, origin, signal) {
  if (typeof routeSlug !== 'string' || routeSlug.trim().length === 0) {
    throw new Error('A Route is required to request directions.')
  }
  if (typeof routeId !== 'string' || routeId.length === 0) {
    throw new Error('A Route is required to request directions.')
  }
  if (
    !origin ||
    !isValidCoordinate(origin.lat, -90, 90) ||
    !isValidCoordinate(origin.lng, -180, 180)
  ) {
    throw new Error('Your location is invalid. Check your location and try again.')
  }

  let data
  try {
    const response = await apiClient.post(
      `/api/offward/routes/${encodeURIComponent(routeSlug)}/access-directions/`,
      {
        origin: { lat: origin.lat, lng: origin.lng },
        profile: 'walking',
      },
      { signal },
    )
    data = response.data
  } catch (error) {
    if (signal?.aborted || error?.code === 'ERR_CANCELED') {
      throw error
    }
    throw getRouteAccessDirectionsError(error)
  }

  validateRouteAccessDirectionsResponse(data, routeId)
  return data
}

export async function getPlaceDirections(placeSlug, origin, profile, signal) {
  if (typeof placeSlug !== 'string' || placeSlug.trim().length === 0) {
    throw new Error('A Place is required to request directions.')
  }
  if (
    !origin ||
    !isValidCoordinate(origin.lat, -90, 90) ||
    !isValidCoordinate(origin.lng, -180, 180)
  ) {
    throw new Error('Your location is invalid. Check your location and try again.')
  }
  if (!VALID_PROFILES.has(profile)) {
    throw new Error('The selected travel mode is invalid. Choose walking or driving.')
  }

  let data
  try {
    const response = await apiClient.post(
      `/api/offward/places/${encodeURIComponent(placeSlug)}/directions/`,
      {
        origin: { lat: origin.lat, lng: origin.lng },
        profile,
      },
      { signal },
    )
    data = response.data
  } catch (error) {
    if (signal?.aborted || error?.code === 'ERR_CANCELED') {
      throw error
    }
    throw getPlaceDirectionsError(error)
  }

  validatePlaceDirectionsResponse(data, profile)
  return data
}
