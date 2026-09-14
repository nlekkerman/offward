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