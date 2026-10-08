import { apiClient } from './apiClient.js'
import { normalizePaginatedResponse } from './pagination.js'

export async function getPublicFoods({ page = 1, page_size = 12, country, food_type } = {}) {
  const params = { page, page_size }
  if (country) params.country = country
  if (food_type) params.food_type = food_type
  const { data } = await apiClient.get('/api/offward/food/', { params })
  return normalizePaginatedResponse(data, 'Public food')
}

export async function getPublicFoodBySlug(slug) {
  try {
    const { data } = await apiClient.get(`/api/offward/food/${encodeURIComponent(slug)}/`)
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Public food detail response must be an object.')
    }
    return data
  } catch (error) {
    if (error.response?.status === 404) return null
    throw error
  }
}
