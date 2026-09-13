import { apiClient } from '../apiClient.js'
import { buildWaypointPayload, normalizeCandidate, normalizeRouteMap } from '../../features/routes/routeMap/routeMapUtils.js'

function routeMapPath(routeId, suffix = '') {
  return `/api/offward/manage/routes/${routeId}/${suffix}`
}

export const routeMapApi = {
  getWaypoints: async (routeId) => {
    const { data } = await apiClient.get(routeMapPath(routeId, 'waypoints/'))
    return normalizeRouteMap(data)
  },
  updateWaypoints: async (routeId, waypoints) => {
    const { data: waypointData } = await apiClient.put(routeMapPath(routeId, 'waypoints/'), {
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
  calculateCandidate: async (routeId, waypoints) => {
    const { data } = await apiClient.post(routeMapPath(routeId, 'calculate-candidate/'), {
      waypoints: buildWaypointPayload(waypoints).map((waypoint) => ({
        order: waypoint.order,
        type: waypoint.type,
        coordinates: waypoint.coordinates,
        label: waypoint.label,
        place_id: waypoint.place_id,
      })),
      profile: 'driving',
    })
    return {
      candidate: normalizeCandidate(data),
      mapRevision: data?.map_revision,
    }
  },
  acceptGeometry: async (routeId, candidateGeometry, mapRevision) => {
    const { data } = await apiClient.post(routeMapPath(routeId, 'accept-geometry/'), {
      candidate_geometry: candidateGeometry,
      expected_map_revision: mapRevision,
    })
    return {
      ...normalizeRouteMap(data),
      isMapRenderable: data?.is_map_renderable,
    }
  },
}
