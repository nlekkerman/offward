import { apiClient } from '../apiClient.js'

const basePath = '/api/offward/manage/contact-messages/'

function normalizeList(data) {
  if (Array.isArray(data)) {
    return data
  }
  if (Array.isArray(data?.results)) {
    return data.results
  }
  return []
}

export async function getContactMessages(filters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.category) params.set('category', filters.category)

  const query = params.toString()
  const { data } = await apiClient.get(query ? `${basePath}?${query}` : basePath)
  return normalizeList(data)
}

export async function getContactMessage(id) {
  const { data } = await apiClient.get(`${basePath}${id}/`)
  return data
}

export async function updateContactMessageStatus(id, status) {
  const { data } = await apiClient.patch(`${basePath}${id}/`, { status })
  return data
}

export const contactMessagesApi = {
  list: getContactMessages,
  getById: getContactMessage,
  updateStatus: updateContactMessageStatus,
}