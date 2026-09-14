import { apiClient } from './apiClient.js'

export async function getPublicPlaces({ country } = {}) {
  const params = {}

  if (country) {
    params.country = country
  }

  const { data } = await apiClient.get('/api/offward/places/', { params })

  if (!Array.isArray(data)) {
    throw new Error('Public places response must be a bare array.')
  }

  return data
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