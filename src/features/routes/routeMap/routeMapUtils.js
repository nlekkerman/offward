export const WAYPOINT_TYPES = ['start', 'via', 'stop', 'finish']
export const INTERMEDIATE_WAYPOINT_TYPES = ['via', 'stop']

function createDraftWaypointId(order) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `new-${crypto.randomUUID()}`
  }
  return `new-${Date.now()}-${order}`
}

export function createEmptyWaypoint(order = 1, values = {}) {
  return {
    id: createDraftWaypointId(order),
    order,
    type: order === 1 ? 'start' : 'finish',
    label: values.label || '',
    place_id: values.place_id || '',
    latitude: values.latitude === undefined || values.latitude === null ? '' : String(values.latitude),
    longitude: values.longitude === undefined || values.longitude === null ? '' : String(values.longitude),
  }
}

export function getPlaceCoordinates(place) {
  const latitude = place?.latitude ?? place?.lat
  const longitude = place?.longitude ?? place?.lng ?? place?.lon

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return null
  }

  return {
    latitude: String(latitude),
    longitude: String(longitude),
  }
}

export function normalizeWaypoint(waypoint = {}, index = 0) {
  const place = waypoint.place && typeof waypoint.place === 'object' ? waypoint.place : null
  const latitude = waypoint.latitude ?? waypoint.lat ?? waypoint.coordinates?.lat ?? waypoint.coordinates?.[1] ?? ''
  const longitude = waypoint.longitude ?? waypoint.lng ?? waypoint.lon ?? waypoint.coordinates?.lng ?? waypoint.coordinates?.[0] ?? ''

  return {
    id: waypoint.id || `waypoint-${index + 1}`,
    order: Number(waypoint.order ?? waypoint.position ?? index + 1),
    type: WAYPOINT_TYPES.includes(waypoint.type) ? waypoint.type : index === 0 ? 'start' : 'via',
    label: waypoint.label || waypoint.name || place?.name || '',
    place_id: waypoint.place_id || waypoint.placeId || place?.id || '',
    latitude: latitude === null || latitude === undefined ? '' : String(latitude),
    longitude: longitude === null || longitude === undefined ? '' : String(longitude),
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
      type: getWaypointTypeForPosition(waypoint.type, index, array.length),
    }))
}

export function getWaypointTypeForPosition(type, index, length) {
  if (index === 0) {
    return 'start'
  }
  if (index === length - 1) {
    return 'finish'
  }
  return INTERMEDIATE_WAYPOINT_TYPES.includes(type) ? type : 'via'
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
  const source = Array.isArray(data) ? { waypoints: data } : data
  const acceptedGeometry = normalizeGeometry(source.accepted_geometry || source.acceptedGeometry || source.geometry)
  const candidateGeometry = normalizeGeometry(source.candidate_geometry || source.candidateGeometry)
  const hasWaypoints = Array.isArray(data) || Array.isArray(source.waypoints) || Array.isArray(source.route_waypoints)

  return {
    hasWaypoints,
    waypoints: normalizeWaypoints(source.waypoints || source.route_waypoints || []),
    acceptedGeometry,
    candidate: candidateGeometry
      ? {
          geometry: candidateGeometry,
          distance_meters: source.distance_meters,
          duration_seconds: source.duration_seconds,
        }
      : null,
    mapRevision: source.map_revision ?? source.mapRevision ?? source.revision ?? '',
    updatedAt: source.updated_at || source.updatedAt || '',
  }
}

export function normalizeCandidate(data = {}) {
  const geometry = normalizeGeometry(data.candidate_geometry || data.candidateGeometry)

  return geometry ? {
    geometry,
    distance_meters: data.distance_meters,
    duration_seconds: data.duration_seconds,
  } : null
}

export function buildWaypointPayload(waypoints) {
  return normalizeWaypoints(waypoints).map((waypoint, index) => ({
    ...(String(waypoint.id).startsWith('new-') ? {} : { id: waypoint.id }),
    order: index + 1,
    type: waypoint.type,
    coordinates: {
      lat: Number(waypoint.latitude),
      lng: Number(waypoint.longitude),
    },
    label: waypoint.label || '',
    place_id: waypoint.place_id || null,
  }))
}
