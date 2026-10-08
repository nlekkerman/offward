import { apiClient } from './apiClient.js'
import { normalizePaginatedResponse } from './pagination.js'

export async function getPublicCountriesPage({ page = 1, pageSize = 24 } = {}) {
  const { data } = await apiClient.get('/api/offward/countries/', { params: { page, page_size: pageSize } })
  return Array.isArray(data)
    ? { count: data.length, results: data, next: null, previous: null }
    : normalizePaginatedResponse(data, 'Public countries')
}

export async function getCountries() {
  const { data } = await apiClient.get('/api/offward/countries/')

  if (Array.isArray(data)) {
    return data
  }

  return Array.isArray(data?.results) ? data.results : []
}

export async function getCountryBySlug(slug) {
  try {
    const { data } = await apiClient.get(`/api/offward/countries/${slug}/`)
    return data
  } catch (error) {
    if (error.response?.status === 404) {
      return null
    }

    throw error
  }
}