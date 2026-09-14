import { apiClient } from './apiClient.js'

export async function getPublicRoutes({ country, status = 'active', activityType, includeGeometry = true } = {}) {
  const params = {
    status,
    include_geometry: includeGeometry,
  }

  if (country) {
    params.country = country
  }

  if (activityType) {
    params.activity_type = activityType
  }

  const { data } = await apiClient.get('/api/offward/routes/', {
    params,
  })

  if (!Array.isArray(data)) {
    throw new Error('Public routes response must be a bare array.')
  }

  return data
}

export async function getRoutes(options) {
  return getPublicRoutes(options)
}