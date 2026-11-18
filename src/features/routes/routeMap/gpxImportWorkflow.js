import { managementApis } from '../../../services/management/index.js'
import { routeMapApi } from '../../../services/management/routeMapApi.js'
import { isRenderableRoute } from '../../map/mapGeometry.js'
import { createEmptyWaypoint, normalizeRouteMap, normalizeWaypoints } from './routeMapUtils.js'

export const EXISTING_ROUTE_MESSAGE = 'This route already has map content. GPX replacement or extension is not supported.'

function revisionOf(route) {
  return route?.map_revision ?? route?.mapRevision ?? route?.revision
}

function validRevision(value) {
  return value !== undefined && value !== null && value !== ''
    && Number.isSafeInteger(Number(value)) && Number(value) >= 0
}

function rawWaypoints(response) {
  const items = Array.isArray(response) ? response : response?.waypoints ?? response?.route_waypoints
  if (!Array.isArray(items)) throw new Error('The canonical waypoint response could not be verified.')
  return items
}

export async function getVerifiedImportMap(routeId) {
  const before = await managementApis.routes.getById(routeId)
  const map = await routeMapApi.getCanonicalMap(routeId)
  const after = await managementApis.routes.getById(routeId)
  const revisions = [revisionOf(before), revisionOf(map.route), revisionOf(after)]
  const waypointRevision = revisionOf(map.waypointResponse)
  if (waypointRevision !== undefined && waypointRevision !== null && waypointRevision !== '') revisions.push(waypointRevision)
  if (!revisions.every(validRevision) || revisions.some((revision) => Number(revision) !== Number(revisions[0]))) {
    throw new Error('The route changed or its current map revision could not be verified. Refresh and review it before importing.')
  }
  rawWaypoints(map.waypointResponse)
  if (!map.route || !Object.prototype.hasOwnProperty.call(map.route, 'geometry')) {
    throw new Error('Canonical route geometry is unavailable. Import cannot be safely verified.')
  }
  return map
}

export function hasExistingImportContent(map) {
  return rawWaypoints(map.waypointResponse).length > 0
    || map.rawSegments.length > 0
    || map.route.geometry != null
    || map.route.accepted_geometry != null
    || map.route.acceptedGeometry != null
}

export function getWaypointPrecisionEndpoints(geometry) {
  const coordinates = geometry.coordinates
  return [coordinates[0], coordinates[coordinates.length - 1]]
    .map((point) => point.map((value) => Number(value.toFixed(6))))
}

export function endpointsHaveWaypointPrecision(geometry) {
  const coordinates = geometry.coordinates
  const endpoints = [coordinates[0], coordinates[coordinates.length - 1]]
  return getWaypointPrecisionEndpoints(geometry)
    .every((point, index) => point.every((value, axis) => value === endpoints[index][axis]))
}

export function createImportWaypoints(geometry) {
  const coordinates = geometry.coordinates
  return [coordinates[0], coordinates[coordinates.length - 1]].map(([longitude, latitude], index) =>
    createEmptyWaypoint(index + 1, { name: index === 0 ? 'Start' : 'Finish', longitude, latitude }))
}

function diagnosticValue(value) {
  if (value === undefined) return 'missing'
  return JSON.stringify(value) ?? String(value)
}

function verifiedWaypoints(response, geometry, source) {
  const raw = rawWaypoints(response)
  if (raw.length !== 2) {
    throw new Error(`${source} waypoint count mismatch: expected 2, actual ${raw.length}.`)
  }
  const missingId = raw.findIndex((waypoint) => !waypoint?.id)
  if (missingId !== -1) {
    throw new Error(`${source} waypoint at response index ${missingId} has no ID: ${diagnosticValue(raw[missingId]?.id)}.`)
  }
  if (String(raw[0].id) === String(raw[1].id)) {
    throw new Error(`${source} waypoint IDs are not distinct: ${diagnosticValue(raw[0].id)} and ${diagnosticValue(raw[1].id)}.`)
  }
  const waypoints = normalizeWaypoints(raw)
  const coordinates = geometry.coordinates
  const endpoints = [coordinates[0], coordinates[coordinates.length - 1]]
  const mismatch = waypoints.findIndex((waypoint, index) => waypoint.longitude === '' || waypoint.latitude === ''
    || Number(waypoint.longitude) !== endpoints[index][0]
    || Number(waypoint.latitude) !== endpoints[index][1])
  if (mismatch !== -1) {
    const waypoint = waypoints[mismatch]
    throw new Error(`${source} waypoint ${mismatch === 0 ? 'start' : 'finish'} coordinates mismatch: expected ${diagnosticValue(endpoints[mismatch])}, actual longitude ${diagnosticValue(waypoint.longitude)}, latitude ${diagnosticValue(waypoint.latitude)}.`)
  }
  return waypoints
}

function geometryMismatch(actual, expected) {
  const geometry = actual?.type === 'Feature' ? actual.geometry : actual
  const coordinates = geometry?.coordinates
  const actualCount = Array.isArray(coordinates) ? coordinates.length : null
  const expectedCount = expected.coordinates.length
  let firstDifference = Array.isArray(coordinates)
    ? coordinates.findIndex((point, index) => index >= expectedCount || !Array.isArray(point) || point.length !== 2
      || point[0] !== expected.coordinates[index][0] || point[1] !== expected.coordinates[index][1])
    : 0
  if (firstDifference === -1 && actualCount !== expectedCount) firstDifference = actualCount
  if (geometry?.type === 'LineString' && actualCount === expectedCount && firstDifference === -1) return ''

  const difference = firstDifference === -1
    ? 'no coordinate difference found'
    : `first differing coordinate at index ${firstDifference}: expected ${diagnosticValue(expected.coordinates[firstDifference])}, actual ${diagnosticValue(coordinates?.[firstDifference])}`
  return `geometry type expected "LineString", actual ${diagnosticValue(geometry?.type)}; coordinate counts expected ${expectedCount}, actual ${actualCount === null ? 'unavailable' : actualCount}; ${difference}`
}

export function verifyImportWaypoints(response, map, geometry) {
  const returned = verifiedWaypoints(response, geometry, 'Returned')
  const stored = verifiedWaypoints(map.waypointResponse, geometry, 'Stored')
  if (stored.some((waypoint, index) => String(waypoint.id) !== String(returned[index].id))) {
    throw new Error('The stored waypoint IDs changed. The track was not saved.')
  }
  if (map.rawSegments.length !== 1 || !map.rawSegments[0]?.id || map.segments.length !== 1) {
    throw new Error('The automatically created connection could not be verified. The track was not saved.')
  }
  const segment = map.segments[0]
  if (String(segment.start_waypoint_id) !== String(stored[0].id)
    || String(segment.end_waypoint_id) !== String(stored[1].id)) {
    throw new Error('The connection does not link the imported start and finish. The track was not saved.')
  }
  if (!Object.prototype.hasOwnProperty.call(map.rawSegments[0], 'geometry')) {
    throw new Error('The new connection geometry is unavailable. The track was not saved.')
  }
  if (map.rawSegments[0].geometry !== null) {
    throw new Error('The new connection already has geometry. GPX replacement is not supported.')
  }
  if (map.route.geometry != null || map.route.accepted_geometry != null || map.route.acceptedGeometry != null) {
    throw new Error('The route acquired geometry during import. GPX replacement is not supported.')
  }
  return { waypoints: stored, segment, revision: normalizeRouteMap(map).mapRevision }
}

export function verifyCompletedImport(map, geometry, expected) {
  const waypoints = verifiedWaypoints(map.waypointResponse, geometry, 'Stored')
  const segment = map.segments[0]
  const rawSegment = map.rawSegments.length === 1 ? map.rawSegments[0]
    : map.rawSegments.find((item) => item?.id && String(item.id) === String(segment?.id))
  const failures = []
  waypoints.forEach((waypoint, index) => {
    if (String(waypoint.id) !== String(expected.waypoints[index].id)) {
      failures.push(`Waypoint ${index} ID mismatch: expected ${diagnosticValue(expected.waypoints[index].id)}, actual ${diagnosticValue(waypoint.id)}.`)
    }
  })
  if (map.rawSegments.length !== 1) failures.push(`Raw segment count mismatch: expected 1, actual ${map.rawSegments.length}.`)
  if (map.segments.length !== 1) failures.push(`Normalized segment count mismatch: expected 1, actual ${map.segments.length}.`)
  if (String(segment?.id) !== String(expected.segment.id)) {
    failures.push(`Segment ID mismatch: expected ${diagnosticValue(expected.segment.id)}, normalized ${diagnosticValue(segment?.id)}, raw ${diagnosticValue(rawSegment?.id)}.`)
  }
  if (String(segment?.start_waypoint_id) !== String(waypoints[0].id)) {
    failures.push(`Segment start waypoint ID mismatch: expected ${diagnosticValue(waypoints[0].id)}, actual ${diagnosticValue(segment?.start_waypoint_id)}.`)
  }
  if (String(segment?.end_waypoint_id) !== String(waypoints[1].id)) {
    failures.push(`Segment end waypoint ID mismatch: expected ${diagnosticValue(waypoints[1].id)}, actual ${diagnosticValue(segment?.end_waypoint_id)}.`)
  }
  if (segment?.mode !== 'manual') {
    failures.push(`Segment mode mismatch: expected "manual", actual ${diagnosticValue(segment?.mode)} (raw mode ${diagnosticValue(rawSegment?.mode)}, connection_mode ${diagnosticValue(rawSegment?.connection_mode)}, resolution_mode ${diagnosticValue(rawSegment?.resolution_mode)}, resolution ${diagnosticValue(rawSegment?.resolution)}).`)
  }
  const segmentGeometryMismatch = geometryMismatch(segment?.geometry, geometry)
  if (segmentGeometryMismatch) {
    const rawGeometryMismatch = geometryMismatch(rawSegment?.geometry, geometry)
    failures.push(`Segment ${segment?.geometry == null ? `geometry was unavailable after normalization; raw ${rawGeometryMismatch || 'geometry matches'}` : segmentGeometryMismatch}.`)
  }
  if (map.route.geometry_is_current !== true) {
    failures.push(`Route geometry_is_current mismatch: expected true, actual ${diagnosticValue(map.route.geometry_is_current)}.`)
  }
  if (!isRenderableRoute(map.route)) {
    failures.push('Route geometry is not a renderable LineString with valid coordinates.')
  }
  const routeGeometryMismatch = geometryMismatch(map.route.geometry, geometry)
  if (routeGeometryMismatch) failures.push(`Route ${routeGeometryMismatch}.`)
  if (failures.length) {
    throw new Error(`The import was submitted, but verification failed: ${failures.join(' ')}`)
  }
}

export function describeImportState(map) {
  const count = rawWaypoints(map.waypointResponse).length
  if (!count) return 'The refreshed route has no waypoints.'
  if (!map.segments.length || map.segments.some((segment) => !segment.geometry)) {
    return 'The refreshed route has waypoints, but its connection is unresolved. Review it before continuing manually.'
  }
  return 'The refreshed route has waypoints and connection geometry. Review it; import success has not been verified.'
}
