import { apiClient } from './apiClient.js'
import { normalizePaginatedResponse } from './pagination.js'

function orderPublicStories(stories) {
  return stories
    .filter((story) => !story.status || story.status === 'active')
    .slice()
    .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0))
}

export async function getPublicStoriesPage({ page = 1, pageSize = 12 } = {}) {
  const { data } = await apiClient.get('/api/offward/stories/', {
    params: { page, page_size: pageSize },
  })

  const result = Array.isArray(data)
    ? { count: data.length, next: null, previous: null, results: data }
    : normalizePaginatedResponse(data, 'Public stories')

  return { ...result, results: orderPublicStories(result.results) }
}

export async function getPublicStories() {
  const page = await getPublicStoriesPage()
  return page.results
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