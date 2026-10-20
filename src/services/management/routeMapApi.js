import { apiClient } from '../apiClient.js'
import { buildSegmentPayload, buildWaypointPayload, normalizeCandidate, normalizeRouteMap, normalizeSegments } from '../../features/routes/routeMap/routeMapUtils.js'

function routeMapPath(routeId, suffix = '') {
  return `/api/offward/manage/routes/${routeId}/${suffix}`
}

function getExpectedMapRevision(mapRevision) {
  if (mapRevision === undefined || mapRevision === null || mapRevision === '') {
    throw new Error('A current Route map revision is required to save waypoints.')
  }

  const revision = Number(mapRevision)
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new Error('The current Route map revision must be a non-negative integer.')
  }

  return revision
}

export const routeMapApi = {
  getWaypoints: async (routeId) => {
    const { data } = await apiClient.get(routeMapPath(routeId, 'waypoints/'))
    return normalizeRouteMap(data)
  },
  getCanonicalMap: async (routeId) => {
    const [{ data: routeData }, waypoints, segments] = await Promise.all([
      apiClient.get(routeMapPath(routeId)),
      routeMapApi.getWaypoints(routeId),
      routeMapApi.getSegments(routeId),
    ])
    return {
      ...normalizeRouteMap({ ...routeData, ...waypoints }),
      acceptedGeometry: normalizeRouteMap(routeData).acceptedGeometry,
      segments,
      isMapRenderable: routeData?.is_map_renderable === true,
      route: routeData,
    }
  },
  updateWaypoints: async (routeId, waypoints, mapRevision) => {
    const { data: waypointData } = await apiClient.put(routeMapPath(routeId, 'waypoints/'), {
      expected_map_revision: getExpectedMapRevision(mapRevision),
      waypoints: buildWaypointPayload(waypoints),
    })
    const { data: routeData } = await apiClient.get(routeMapPath(routeId))
    const normalizedWaypoints = normalizeRouteMap(waypointData)
    const normalizedRoute = normalizeRouteMap(routeData)

    return {
      ...normalizedWaypoints,
      acceptedGeometry: normalizedRoute.acceptedGeometry,
      candidate: normalizedRoute.candidate,
      mapRevision: normalizedRoute.mapRevision,
      updatedAt: normalizedRoute.updatedAt,
    }
  },
  createPlaceFromWaypoint: async (routeId, waypointId, payload) => {
    const { data } = await apiClient.post(
      routeMapPath(routeId, `waypoints/${waypointId}/create-place/`),
      payload,
    )
    return data
  },
  getSegments: async (routeId) => {
    const { data } = await apiClient.get(routeMapPath(routeId, 'segments/'))
    if (!Array.isArray(data)) {
      throw new Error('Management segments response must be a bare array.')
    }
    return normalizeSegments(data)
  },
  updateSegments: async (routeId, segments) => {
    const { data } = await apiClient.put(routeMapPath(routeId, 'segments/'), {
      segments: buildSegmentPayload(segments),
    })
    if (!Array.isArray(data)) {
      throw new Error('Management segments response must be a bare array.')
    }
    return normalizeSegments(data)
  },
  calculateSegmentCandidate: async (routeId, segmentId, profile, mapRevision) => {
    const { data } = await apiClient.post(
      routeMapPath(routeId, `segments/${segmentId}/calculate-candidate/`),
      {
        profile,
        expected_map_revision: mapRevision,
      },
    )
    return {
      candidate: normalizeCandidate(data),
      mapRevision: data?.map_revision,
    }
  },
  updateSegment: async (routeId, segmentId, payload) => {
    const { data } = await apiClient.patch(routeMapPath(routeId, `segments/${segmentId}/`), payload)
    return {
      segment: normalizeSegments([data?.segment || data])[0],
      mapRevision: data?.map_revision,
    }
  },
}
