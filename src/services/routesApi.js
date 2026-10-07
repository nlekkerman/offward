import { apiClient } from './apiClient.js'
import { normalizePaginatedResponse } from './pagination.js'

export async function getPublicRoutes({
  country,
  status = 'active',
  activityType,
  includeGeometry = false,
  page = 1,
  pageSize = 12,
} = {}) {
  const params = {
    status,
    include_geometry: includeGeometry,
    page,
    page_size: pageSize,
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

  return normalizePaginatedResponse(data, 'Public routes')
}

export async function getRoutes(options) {
  return getPublicRoutes(options)
}

export async function getPublicRouteBySlug(slug) {
  try {
    const { data } = await apiClient.get(`/api/offward/routes/${encodeURIComponent(slug)}/`)

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Public route detail response must be an object.')
    }

    return data
  } catch (error) {
    if (error.response?.status === 404) {
      return null
    }

    throw error
  }
}