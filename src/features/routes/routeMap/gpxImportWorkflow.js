import { managementApis } from '../../../services/management/index.js'
import { routeMapApi } from '../../../services/management/routeMapApi.js'
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

export function endpointsHaveWaypointPrecision(geometry) {
  const coordinates = geometry.coordinates
  return [coordinates[0], coordinates[coordinates.length - 1]]
    .every((point) => point.every((value) => Number(value.toFixed(6)) === value))
}

export function createImportWaypoints(geometry) {
  const coordinates = geometry.coordinates
  return [coordinates[0], coordinates[coordinates.length - 1]].map(([longitude, latitude], index) =>
    createEmptyWaypoint(index + 1, { name: index === 0 ? 'Start' : 'Finish', longitude, latitude }))
}

function verifiedWaypoints(response, geometry) {
  const raw = rawWaypoints(response)
  if (raw.length !== 2 || raw.some((waypoint) => !waypoint?.id)
    || String(raw[0].id) === String(raw[1].id)) {
    throw new Error('The stored start and finish waypoint IDs could not be verified.')
  }
  const waypoints = normalizeWaypoints(raw)
  const coordinates = geometry.coordinates
  const endpoints = [coordinates[0], coordinates[coordinates.length - 1]]
  if (waypoints.some((waypoint, index) => waypoint.longitude === '' || waypoint.latitude === ''
    || Number(waypoint.longitude) !== endpoints[index][0]
    || Number(waypoint.latitude) !== endpoints[index][1])) {
    throw new Error('Stored waypoint coordinates do not exactly match the GPX endpoints. The track was not saved.')
  }
  return waypoints
}

function matchingGeometry(actual, expected) {
  const geometry = actual?.type === 'Feature' ? actual.geometry : actual
  return geometry?.type === 'LineString' && Array.isArray(geometry.coordinates)
    && geometry.coordinates.length === expected.coordinates.length
    && geometry.coordinates.every((point, index) => Array.isArray(point) && point.length === 2
      && point[0] === expected.coordinates[index][0] && point[1] === expected.coordinates[index][1])
}

export function verifyImportWaypoints(response, map, geometry) {
  const returned = verifiedWaypoints(response, geometry)
  const stored = verifiedWaypoints(map.waypointResponse, geometry)
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
  const waypoints = verifiedWaypoints(map.waypointResponse, geometry)
  const segment = map.segments[0]
  if (waypoints.some((waypoint, index) => String(waypoint.id) !== String(expected.waypoints[index].id))
    || map.rawSegments.length !== 1 || map.segments.length !== 1
    || String(segment?.id) !== String(expected.segment.id)
    || String(segment?.start_waypoint_id) !== String(waypoints[0].id)
    || String(segment?.end_waypoint_id) !== String(waypoints[1].id)
    || segment?.mode !== 'manual' || !matchingGeometry(segment.geometry, geometry)
    || map.route.is_map_renderable !== true || !matchingGeometry(map.route.geometry, geometry)) {
    throw new Error('The import was submitted, but the canonical manual connection and current route geometry could not be verified exactly.')
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
