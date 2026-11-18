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

  const trackSegments = Array.from(tracks[0].getElementsByTagName('*'))
    .filter((element) => element.localName?.toLowerCase() === 'trkseg')
  if (trackSegments.length !== 1) {
    throw new Error('The GPX must contain exactly one continuous track segment; multiple segments are not supported.')
  }
  const trackPoints = Array.from(tracks[0].getElementsByTagName('*'))
    .filter((element) => element.localName?.toLowerCase() === 'trkpt')
  const segmentPoints = Array.from(trackSegments[0].getElementsByTagName('*'))
    .filter((element) => element.localName?.toLowerCase() === 'trkpt')
  if (trackPoints.length !== segmentPoints.length || trackPoints.length < 2) {
    throw new Error('The GPX track must contain at least 2 coordinates in one track segment.')
  }
  const coordinates = trackPoints.map((point) => {
    const longitudeText = point.getAttribute('lon')
    const latitudeText = point.getAttribute('lat')
    const coordinate = [Number(longitudeText), Number(latitudeText)]
    if (!longitudeText?.trim() || !latitudeText?.trim() || !isValidCoordinate(coordinate)) {
      throw new Error('The GPX track contains an invalid longitude or latitude.')
    }
    return coordinate
  })

  const trackFeatures = gpx(document).features.filter((feature) => feature.properties?._gpxType === 'trk')
  if (trackFeatures.length !== 1) {
    throw new Error('The GPX must contain exactly one recorded track with usable geometry.')
  }

  const converted = trackFeatures[0].geometry
  if (converted?.type !== 'LineString' || !Array.isArray(converted.coordinates)
    || converted.coordinates.length !== coordinates.length
    || converted.coordinates.some((point, index) => !isValidCoordinate(point)
      || point[0] !== coordinates[index][0] || point[1] !== coordinates[index][1])) {
    throw new Error('The GPX track could not be converted without changing its coordinates.')
  }

  return {
    geometry: { type: 'LineString', coordinates },
    rawPointCount: coordinates.length,
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