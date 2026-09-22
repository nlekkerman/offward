import { apiClient } from './apiClient.js'

export async function submitContactMessage(payload) {
  const { data } = await apiClient.post('/api/offward/contact/', payload)
  return data
}