import { apiClient } from './apiClient.js'

export async function getPublicStories() {
  const { data } = await apiClient.get('/api/offward/stories/')

  const stories = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []

  // Defensive client-side ordering/filtering: only trust items the public API
  // has not already marked as non-active, sorted by published_at descending.
  return stories
    .filter((story) => !story.status || story.status === 'active')
    .slice()
    .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0))
}

export async function getLatestPublicStory() {
  const stories = await getPublicStories()
  return stories[0] || null
}

export async function getPublicStoryBySlug(slug) {
  try {
    const { data } = await apiClient.get(`/api/offward/stories/${encodeURIComponent(slug)}/`)

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Public story detail response must be an object.')
    }

    return data
  } catch (error) {
    if (error.response?.status === 404) {
      return null
    }

    throw error
  }
}