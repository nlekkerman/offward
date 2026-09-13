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
  updateWaypoints: async (routeId, waypoints, mapRevision) => {
    const { data } = await apiClient.put(routeMapPath(routeId, 'waypoints/'), {
      waypoints: buildWaypointPayload(waypoints),
      map_revision: mapRevision,
    })
    return normalizeRouteMap(data)
  },
  calculateCandidate: async (routeId, mapRevision) => {
    const { data } = await apiClient.post(routeMapPath(routeId, 'calculate-candidate/'), {
      map_revision: mapRevision,
    })
    return {
      candidate: normalizeCandidate(data),
      mapRevision: data?.map_revision || data?.mapRevision || data?.revision || mapRevision,
    }
  },
  acceptGeometry: async (routeId, candidateGeometry, mapRevision) => {
    const { data } = await apiClient.post(routeMapPath(routeId, 'accept-geometry/'), {
      geometry: candidateGeometry,
      map_revision: mapRevision,
    })
    return normalizeRouteMap(data)
  },
}
