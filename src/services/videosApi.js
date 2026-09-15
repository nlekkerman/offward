import { apiClient } from './apiClient.js'

export async function getPublicVideos() {
  const { data } = await apiClient.get('/api/offward/videos/')

  const videos = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []

  return videos.filter((video) => !video.status || video.status === 'active')
}