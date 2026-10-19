export const MAX_LOCAL_DIRECTIONS_KM = 30

const OPENROUTESERVICE_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions'
const EARTH_RADIUS_KM = 6371.0088

export function isRouteDirectionsConfigured() {
  return typeof import.meta.env.VITE_OPENROUTESERVICE_API_KEY === 'string' &&
    import.meta.env.VITE_OPENROUTESERVICE_API_KEY.trim().length > 0
}

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

function getRoutingError(response) {
  if (response.status === 401 || response.status === 403) {
    return new Error('The routing service rejected its API key. Check the VITE_OPENROUTESERVICE_API_KEY configuration.')
  }
  if (response.status === 429) {
    return new Error('The routing service rate limit was reached. Please wait a moment and try again.')
  }
  return new Error('The routing service could not calculate directions. Please try again.')
}

export async function getRouteDirections(origin, destination, profile, signal) {
  if (!isRouteDirectionsConfigured()) {
    throw new Error('Local directions are not configured. Set VITE_OPENROUTESERVICE_API_KEY for the frontend build.')
  }
  if (profile !== 'foot-walking' && profile !== 'driving-car') {
    throw new Error('The selected directions mode is not supported.')
  }

  const response = await fetch(`${OPENROUTESERVICE_DIRECTIONS_URL}/${profile}/geojson`, {
    method: 'POST',
    headers: {
      Authorization: import.meta.env.VITE_OPENROUTESERVICE_API_KEY.trim(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates: [
        [origin.longitude, origin.latitude],
        [destination.lng, destination.lat],
      ],
    }),
    signal,
  })

  if (!response.ok) {
    throw getRoutingError(response)
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('The routing service returned an unreadable directions response.')
  }
  const feature = data?.features?.[0]
  const coordinates = feature?.geometry?.coordinates
  const distanceMeters = feature?.properties?.summary?.distance
  if (
    feature?.geometry?.type !== 'LineString' ||
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    !coordinates.every((coordinate) =>
      Array.isArray(coordinate) &&
      typeof coordinate[0] === 'number' &&
      Number.isFinite(coordinate[0]) &&
      coordinate[0] >= -180 &&
      coordinate[0] <= 180 &&
      typeof coordinate[1] === 'number' &&
      Number.isFinite(coordinate[1]) &&
      coordinate[1] >= -90 &&
      coordinate[1] <= 90
    ) ||
    typeof distanceMeters !== 'number' ||
    !Number.isFinite(distanceMeters) ||
    distanceMeters < 0
  ) {
    throw new Error('The routing service returned an invalid directions response.')
  }

  return { coordinates, distanceMeters }
}
