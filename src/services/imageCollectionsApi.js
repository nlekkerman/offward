import { apiClient } from './apiClient.js'

// Public full-detail fetch for a single ImageCollection (ordered images), used
// only when a user explicitly opens a Gallery preview - never on Route load or hover.
export async function getPublicImageCollection(id) {
  const { data } = await apiClient.get(`/api/offward/image-collections/${encodeURIComponent(id)}/`)
  return data
}
