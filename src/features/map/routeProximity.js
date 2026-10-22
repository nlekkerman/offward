const EARTH_RADIUS_METERS = 6371008.8
export const ROUTE_ARRIVAL_DISTANCE_METERS = 25
export const ROUTE_ARRIVAL_MAX_ACCURACY_METERS = 20
export const ROUTE_ARRIVAL_MAX_AGE_MS = 15000
export const ROUTE_ARRIVAL_MIN_READING_INTERVAL_MS = 1000
export const ROUTE_ARRIVAL_CONFIRMATION_WINDOW_MS = 15000
const REQUIRED_CONSECUTIVE_READINGS = 3

function isValidCoordinate(coordinate) {
  return Array.isArray(coordinate) &&
    coordinate.length >= 2 &&
    Number.isFinite(coordinate[0]) &&
    coordinate[0] >= -180 &&
    coordinate[0] <= 180 &&
    Number.isFinite(coordinate[1]) &&
    coordinate[1] >= -90 &&
    coordinate[1] <= 90
}

function getLongitudeDifferenceRadians(longitude, originLongitude) {
  let difference = longitude - originLongitude
  if (difference > 180) difference -= 360
  if (difference < -180) difference += 360
  return difference * Math.PI / 180
}

export function getDistanceToRouteMeters(position, geometry) {
  if (
    !Number.isFinite(position?.latitude) ||
    !Number.isFinite(position?.longitude) ||
    position.latitude < -90 ||
    position.latitude > 90 ||
    position.longitude < -180 ||
    position.longitude > 180 ||
    geometry?.type !== 'LineString' ||
    !Array.isArray(geometry.coordinates) ||
    geometry.coordinates.length < 2 ||
    !geometry.coordinates.every(isValidCoordinate)
  ) {
    return null
  }

  const originLatitude = position.latitude * Math.PI / 180
  const latitudeScale = Math.cos(originLatitude)
  const pointOnSegment = (coordinate) => [
    getLongitudeDifferenceRadians(coordinate[0], position.longitude) * EARTH_RADIUS_METERS * latitudeScale,
    (coordinate[1] - position.latitude) * Math.PI / 180 * EARTH_RADIUS_METERS,
  ]

  let minimumDistance = Infinity
  for (let index = 1; index < geometry.coordinates.length; index += 1) {
    const [startX, startY] = pointOnSegment(geometry.coordinates[index - 1])
    const [endX, endY] = pointOnSegment(geometry.coordinates[index])
    const segmentX = endX - startX
    const segmentY = endY - startY
    const segmentLengthSquared = segmentX ** 2 + segmentY ** 2
    const projection = segmentLengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, -(startX * segmentX + startY * segmentY) / segmentLengthSquared))
    const closestX = startX + projection * segmentX
    const closestY = startY + projection * segmentY
    minimumDistance = Math.min(minimumDistance, Math.hypot(closestX, closestY))
  }

  return Number.isFinite(minimumDistance) ? minimumDistance : null
}

export function createRouteArrivalDetector() {
  let lastTimestamp = null
  let firstConfirmationTimestamp = null
  let lastConfirmationTimestamp = null
  let consecutiveReadings = 0
  let arrived = false

  return {
    reset() {
      lastTimestamp = null
      firstConfirmationTimestamp = null
      lastConfirmationTimestamp = null
      consecutiveReadings = 0
      arrived = false
    },
    process(position, geometry, _mode, now = Date.now()) {
      void _mode
      if (arrived) return false
      if (!Number.isFinite(position?.timestamp)) {
        firstConfirmationTimestamp = null
        lastConfirmationTimestamp = null
        consecutiveReadings = 0
        return false
      }
      if (position.timestamp === lastTimestamp) {
        return false
      }

      lastTimestamp = position.timestamp
      const age = now - position.timestamp
      const isReliable = age >= 0 &&
        age <= ROUTE_ARRIVAL_MAX_AGE_MS &&
        Number.isFinite(position.accuracy) &&
        position.accuracy >= 0 &&
        position.accuracy <= ROUTE_ARRIVAL_MAX_ACCURACY_METERS
      const distance = isReliable ? getDistanceToRouteMeters(position, geometry) : null

      if (!isReliable || distance === null || distance > ROUTE_ARRIVAL_DISTANCE_METERS) {
        firstConfirmationTimestamp = null
        lastConfirmationTimestamp = null
        consecutiveReadings = 0
        return false
      }

      if (
        firstConfirmationTimestamp !== null &&
        position.timestamp - firstConfirmationTimestamp > ROUTE_ARRIVAL_CONFIRMATION_WINDOW_MS
      ) {
        firstConfirmationTimestamp = null
        lastConfirmationTimestamp = null
        consecutiveReadings = 0
      }

      if (
        lastConfirmationTimestamp !== null &&
        position.timestamp - lastConfirmationTimestamp < ROUTE_ARRIVAL_MIN_READING_INTERVAL_MS
      ) {
        return false
      }

      if (firstConfirmationTimestamp === null) {
        firstConfirmationTimestamp = position.timestamp
      }
      lastConfirmationTimestamp = position.timestamp
      consecutiveReadings += 1
      if (consecutiveReadings < REQUIRED_CONSECUTIVE_READINGS) return false

      arrived = true
      return true
    },
  }
}
