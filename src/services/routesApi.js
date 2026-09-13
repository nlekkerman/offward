import { apiClient } from './apiClient.js'

export async function getPublicRoutes({ includeGeometry = false } = {}) {
  const { data } = await apiClient.get('/api/offward/routes/', {
    params: {
      include_geometry: includeGeometry,
    },
  })

  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.results)) {
    return data.results
  }

  return []
}

export async function getRoutes(options) {
  return getPublicRoutes(options)
}