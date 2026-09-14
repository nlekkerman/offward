export function isValidCoordinate(pt) {
  if (!Array.isArray(pt) || pt.length < 2) {
    return false
  }
  const [lng, lat] = pt
  return (
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180 &&
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90
  )
}

export function isRenderableRoute(route) {
  if (!route || typeof route !== 'object') {
    return false
  }
  const { geometry } = route
  if (!geometry || typeof geometry !== 'object') {
    return false
  }
  if (geometry.type !== 'LineString') {
    return false
  }
  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) {
    return false
  }
  return geometry.coordinates.every(isValidCoordinate)
}

function isValidWaypoint(waypoint) {
  const lat = waypoint?.coordinates?.lat
  const lng = waypoint?.coordinates?.lng

  return (
    typeof waypoint?.id === 'string' &&
    waypoint.id.length > 0 &&
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  )
}

function getWaypointType(waypoint, index, length) {
  if (waypoint.type === 'start' || index === 0) {
    return 'start'
  }
  if (waypoint.type === 'finish' || index === length - 1) {
    return 'finish'
  }
  if (waypoint.type === 'stop') {
    return 'stop'
  }
  return 'via'
}

export function getValidWaypoints(waypoints) {
  if (!Array.isArray(waypoints)) {
    return []
  }

  const sortedWaypoints = waypoints
    .filter((waypoint) => waypoint && typeof waypoint === 'object')
    .sort((a, b) => Number(a.order) - Number(b.order))

  return sortedWaypoints
    .map((waypoint, index, array) => ({
      ...waypoint,
      order: Number.isFinite(Number(waypoint.order)) ? Number(waypoint.order) : index + 1,
      markerType: getWaypointType(waypoint, index, array.length),
    }))
    .filter(isValidWaypoint)
}

export function getCombinedBounds(validRoutes) {
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity
  let count = 0

  for (const route of validRoutes) {
    for (const [lng, lat] of route.geometry.coordinates) {
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      count++
    }
  }

  if (count < 2 || !Number.isFinite(minLat) || !Number.isFinite(minLng)) {
    return null
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ]
}

export function getWaypointBounds(validWaypoints) {
  if (validWaypoints.length < 1) {
    return null
  }

  return validWaypoints.map((waypoint) => [waypoint.coordinates.lat, waypoint.coordinates.lng])
}

export function isValidLatitude(lat) {
  if (lat === '' || lat === null || lat === undefined || typeof lat === 'boolean') {
    return false
  }
  const num = Number(lat)
  return Number.isFinite(num) && num >= -90 && num <= 90
}

export function isValidLongitude(lng) {
  if (lng === '' || lng === null || lng === undefined || typeof lng === 'boolean') {
    return false
  }
  const num = Number(lng)
  return Number.isFinite(num) && num >= -180 && num <= 180
}

export function parseValidCoordinates(lat, lng) {
  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    return null
  }
  return [Number(lat), Number(lng)]
}

export function isRenderablePlace(place) {
  const { latitude, longitude } = place || {}
  return isValidLatitude(latitude) && isValidLongitude(longitude)
}

export function getRenderablePlaces(places) {
  if (!Array.isArray(places)) {
    return []
  }

  return places.filter(isRenderablePlace)
}

export function getPlaceBounds(validPlaces) {
  if (validPlaces.length < 1) {
    return null
  }

  return validPlaces.map((place) => [place.latitude, place.longitude])
}

export function getCombinedMapBounds(validRoutes, validPlaces) {
  const routeBounds = getCombinedBounds(validRoutes)
  const placeBounds = getPlaceBounds(validPlaces)
  const points = []

  if (routeBounds) {
    points.push(...routeBounds)
  }
  if (placeBounds) {
    points.push(...placeBounds)
  }

  if (points.length === 0) {
    return null
  }

  return points
}

export function normalizeCenter(center) {
  if (Array.isArray(center) && center.length >= 2) {
    const lat = Number(center[0])
    const lng = Number(center[1])
    if (!isNaN(lat) && !isNaN(lng)) {
      return [lat, lng]
    }
  }
  if (
    center &&
    typeof center === 'object' &&
    typeof center.lat === 'number' &&
    typeof center.lng === 'number'
  ) {
    return [center.lat, center.lng]
  }
  return [50.0, 10.0]
}