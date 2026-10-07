import { apiClient } from './apiClient.js'
import { normalizePaginatedResponse } from './pagination.js'

export async function getPublicPlaces({ country, page = 1, pageSize = 12 } = {}) {
  const params = {
    page,
    page_size: pageSize,
  }

  if (country) {
    params.country = country
  }

  const { data } = await apiClient.get('/api/offward/places/', { params })

  return normalizePaginatedResponse(data, 'Public places')
}

export async function getPublicPlaceBySlug(slug) {
  try {
    const { data } = await apiClient.get(`/api/offward/places/${encodeURIComponent(slug)}/`)

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Public place detail response must be an object.')
    }

    return data
  } catch (error) {
    if (error.response?.status === 404) {
      return null
    }

    throw error
  }
}