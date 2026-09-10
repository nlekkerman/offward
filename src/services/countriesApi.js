import { apiClient } from './apiClient.js'

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