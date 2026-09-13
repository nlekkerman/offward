import { apiClient } from '../apiClient.js'
import { buildRouteMapPayload, buildWaypointPayload, normalizeRouteMap } from '../../features/routes/routeMap/routeMapUtils.js'

function routeMapPath(routeId, suffix = '') {
  return `/api/offward/manage/routes/${routeId}/map/${suffix}`
}

export const routeMapApi = {
  get: async (routeId) => {
    const { data } = await apiClient.get(routeMapPath(routeId))
    return normalizeRouteMap(data)
  },
  update: async (routeId, values) => {
    const { data } = await apiClient.patch(routeMapPath(routeId), buildRouteMapPayload(values))
    return normalizeRouteMap(data)
  },
  calculateCandidate: async (routeId, waypoints) => {
    const { data } = await apiClient.post(routeMapPath(routeId, 'candidate/'), {
      waypoints: buildWaypointPayload(waypoints),
    })
    return normalizeRouteMap(data)
  },
  acceptCandidate: async (routeId, candidateGeometry) => {
    const { data } = await apiClient.post(routeMapPath(routeId, 'accept-candidate/'), {
      geometry: candidateGeometry,
    })
    return normalizeRouteMap(data)
  },
}
