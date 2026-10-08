import { normalizePaginatedResponse } from '../pagination.js'

export function normalizeManagementPage(data) {
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data }
  }
  return normalizePaginatedResponse(data, 'Management catalog')
}
