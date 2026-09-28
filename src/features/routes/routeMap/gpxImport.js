import { gpx } from '@tmcw/togeojson'
import simplify from '@turf/simplify'

export const GPX_SIMPLIFICATION_LEVELS = [
  { id: 'high', label: 'High detail', tolerance: 0.00003 },
  { id: 'normal', label: 'Normal', tolerance: 0.0001 },
  { id: 'low', label: 'Low detail', tolerance: 0.0003 },
]

function isValidCoordinate(coordinate) {
  if (!Array.isArray(coordinate) || coordinate.length < 2) return false
  const [longitude, latitude] = coordinate
  return Number.isFinite(longitude)
    && Number.isFinite(latitude)
    && longitude >= -180
    && longitude <= 180
    && latitude >= -90
    && latitude <= 90
}

function coordinatesMeet(first, second) {
  return Math.abs(first[0] - second[0]) <= 1e-7
    && Math.abs(first[1] - second[1]) <= 1e-7
}

function getTrackSegments(geometry) {
  if (geometry?.type === 'LineString') return [geometry.coordinates]
  if (geometry?.type === 'MultiLineString') return geometry.coordinates
  throw new Error('The GPX track must produce a LineString geometry.')
}

function mergeTrackSegments(segments) {
  const merged = []

  for (const segment of segments) {
    if (!Array.isArray(segment) || segment.length < 2 || !segment.every(isValidCoordinate)) {
      throw new Error('The GPX track contains invalid coordinates or a segment with fewer than 2 points.')
    }

    const coordinates = segment.map(([longitude, latitude]) => [longitude, latitude])
    if (!merged.length) {
      merged.push(...coordinates)
      continue
    }

    if (!coordinatesMeet(merged[merged.length - 1], coordinates[0])) {
      throw new Error('This GPX track has separated segments that cannot be safely merged into one line.')
    }
    merged.push(...coordinates.slice(1))
  }

  return merged
}

export function parseGpxTrack(xmlText) {
  const document = new DOMParser().parseFromString(xmlText, 'application/xml')
  const root = document.documentElement
  if (!root || root.localName?.toLowerCase() !== 'gpx' || document.querySelector('parsererror')) {
    throw new Error('The selected file is not valid GPX/XML.')
  }

  const tracks = Array.from(document.getElementsByTagName('*'))
    .filter((element) => element.localName?.toLowerCase() === 'trk')
  if (tracks.length > 1) {
    throw new Error('This GPX contains multiple tracks. Import one recorded track at a time.')
  }
  if (tracks.length === 0) {
    throw new Error('No recorded track was found in this GPX file.')
  }

  const trackPoints = Array.from(tracks[0].getElementsByTagName('*'))
    .filter((element) => element.localName?.toLowerCase() === 'trkpt')
  for (const point of trackPoints) {
    const longitudeText = point.getAttribute('lon')
    const latitudeText = point.getAttribute('lat')
    const coordinate = [Number(longitudeText), Number(latitudeText)]
    if (!longitudeText?.trim() || !latitudeText?.trim() || !isValidCoordinate(coordinate)) {
      throw new Error('The GPX track contains an invalid longitude or latitude.')
    }
  }

  const trackFeatures = gpx(document).features.filter((feature) => feature.properties?._gpxType === 'trk')
  if (trackFeatures.length !== 1) {
    throw new Error('The GPX must contain exactly one recorded track with usable geometry.')
  }

  const segments = getTrackSegments(trackFeatures[0].geometry)
  const rawPointCount = segments.reduce((count, segment) => count + (Array.isArray(segment) ? segment.length : 0), 0)
  if (rawPointCount < 2) {
    throw new Error('The GPX track must contain at least 2 coordinates.')
  }

  return {
    geometry: { type: 'LineString', coordinates: mergeTrackSegments(segments) },
    rawPointCount,
  }
}

export function simplifyGpxTrack(geometry, levelId = 'normal') {
  const level = GPX_SIMPLIFICATION_LEVELS.find((option) => option.id === levelId)
    || GPX_SIMPLIFICATION_LEVELS.find((option) => option.id === 'normal')
  const feature = simplify({ type: 'Feature', properties: {}, geometry }, {
    tolerance: level.tolerance,
    highQuality: true,
  })
  const simplifiedGeometry = feature?.geometry

  if (simplifiedGeometry?.type !== 'LineString'
    || !Array.isArray(simplifiedGeometry.coordinates)
    || simplifiedGeometry.coordinates.length < 2
    || !simplifiedGeometry.coordinates.every(isValidCoordinate)) {
    throw new Error('The GPX track could not be simplified to a valid LineString.')
  }

  return simplifiedGeometry
}