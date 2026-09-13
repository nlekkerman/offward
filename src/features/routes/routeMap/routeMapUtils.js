export const WAYPOINT_TYPES = ['start', 'via', 'stop', 'finish']

export function createEmptyWaypoint(order = 1) {
  return {
    id: `new-${Date.now()}-${order}`,
    order,
    type: order === 1 ? 'start' : 'via',
    label: '',
    place_id: '',
    latitude: '',
    longitude: '',
    notes: '',
  }
}

export function normalizeWaypoint(waypoint = {}, index = 0) {
  const place = waypoint.place && typeof waypoint.place === 'object' ? waypoint.place : null
  const latitude = waypoint.latitude ?? waypoint.lat ?? waypoint.coordinates?.[1] ?? ''
  const longitude = waypoint.longitude ?? waypoint.lng ?? waypoint.lon ?? waypoint.coordinates?.[0] ?? ''

  return {
    id: waypoint.id || `waypoint-${index + 1}`,
    order: Number(waypoint.order ?? waypoint.position ?? index + 1),
    type: WAYPOINT_TYPES.includes(waypoint.type) ? waypoint.type : index === 0 ? 'start' : 'via',
    label: waypoint.label || waypoint.name || place?.name || '',
    place_id: waypoint.place_id || waypoint.placeId || place?.id || '',
    latitude: latitude === null || latitude === undefined ? '' : String(latitude),
    longitude: longitude === null || longitude === undefined ? '' : String(longitude),
    notes: waypoint.notes || waypoint.description || '',
  }
}

export function normalizeWaypoints(waypoints) {
  if (!Array.isArray(waypoints)) {
    return []
  }

  return waypoints
    .map(normalizeWaypoint)
    .sort((a, b) => a.order - b.order)
    .map((waypoint, index, array) => ({
      ...waypoint,
      order: index + 1,
      type: waypoint.type || (index === 0 ? 'start' : index === array.length - 1 ? 'finish' : 'via'),
    }))
}

export function isValidLatitude(value) {
  const numberValue = Number(value)
  return value !== '' && Number.isFinite(numberValue) && numberValue >= -90 && numberValue <= 90
}

export function isValidLongitude(value) {
  const numberValue = Number(value)
  return value !== '' && Number.isFinite(numberValue) && numberValue >= -180 && numberValue <= 180
}

export function getWaypointErrors(waypoint) {
  const errors = {}

  if (!isValidLatitude(waypoint.latitude)) {
    errors.latitude = 'Latitude must be between -90 and 90.'
  }

  if (!isValidLongitude(waypoint.longitude)) {
    errors.longitude = 'Longitude must be between -180 and 180.'
  }

  if (!WAYPOINT_TYPES.includes(waypoint.type)) {
    errors.type = 'Choose a valid waypoint type.'
  }

  return errors
}

export function validateWaypoints(waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return { valid: false, message: 'Add at least two waypoints before calculating a route.' }
  }

  const invalidIndex = waypoints.findIndex((waypoint) => Object.keys(getWaypointErrors(waypoint)).length > 0)
  if (invalidIndex >= 0) {
    return { valid: false, message: `Waypoint ${invalidIndex + 1} needs valid coordinates.` }
  }

  return { valid: true, message: '' }
}

export function isValidLineString(geometry) {
  if (!geometry || geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)) {
    return false
  }

  if (geometry.coordinates.length < 2) {
    return false
  }

  return geometry.coordinates.every((coordinate) => {
    if (!Array.isArray(coordinate) || coordinate.length < 2) {
      return false
    }
    const [longitude, latitude] = coordinate
    return isValidLongitude(longitude) && isValidLatitude(latitude)
  })
}

export function normalizeGeometry(value) {
  if (!value) {
    return null
  }

  if (value.type === 'Feature' && value.geometry) {
    return isValidLineString(value.geometry) ? value.geometry : null
  }

  return isValidLineString(value) ? value : null
}

export function normalizeRouteMap(data = {}) {
  const acceptedGeometry = normalizeGeometry(data.accepted_geometry || data.acceptedGeometry || data.geometry)
  const candidateGeometry = normalizeGeometry(data.candidate_geometry || data.candidateGeometry || data.candidate?.geometry)

  return {
    waypoints: normalizeWaypoints(data.waypoints || data.route_waypoints || []),
    acceptedGeometry,
    candidate: data.candidate
      ? { ...data.candidate, geometry: candidateGeometry }
      : candidateGeometry
        ? { geometry: candidateGeometry }
        : null,
    mapRevision: data.map_revision || data.mapRevision || data.revision || '',
    updatedAt: data.updated_at || data.updatedAt || '',
  }
}

export function buildWaypointPayload(waypoints) {
  return normalizeWaypoints(waypoints).map((waypoint, index) => ({
    id: String(waypoint.id).startsWith('new-') ? undefined : waypoint.id,
    order: index + 1,
    type: waypoint.type,
    label: waypoint.label || '',
    place_id: waypoint.place_id || null,
    latitude: Number(waypoint.latitude),
    longitude: Number(waypoint.longitude),
    notes: waypoint.notes || '',
  }))
}

export function buildRouteMapPayload({ waypoints, acceptedGeometry, mapRevision }) {
  return {
    waypoints: buildWaypointPayload(waypoints),
    accepted_geometry: normalizeGeometry(acceptedGeometry),
    map_revision: mapRevision || undefined,
  }
}
