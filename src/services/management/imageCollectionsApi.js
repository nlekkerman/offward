import { apiClient } from '../apiClient.js'

function getList(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
}

export async function uploadImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post('/api/offward/manage/images/', formData)
  return data
}

export const imageCollectionsApi = {
  list: async () => {
    const { data } = await apiClient.get('/api/offward/manage/image-collections/')
    return getList(data)
  },
  create: async (payload) => {
    const { data } = await apiClient.post('/api/offward/manage/image-collections/', payload)
    return data
  },
  getById: async (id) => {
    const { data } = await apiClient.get(`/api/offward/manage/image-collections/${encodeURIComponent(id)}/`)
    return data
  },
  update: async (id, payload) => {
    const { data } = await apiClient.patch(`/api/offward/manage/image-collections/${encodeURIComponent(id)}/`, payload)
    return data
  },
  delete: async (id) => {
    await apiClient.delete(`/api/offward/manage/image-collections/${encodeURIComponent(id)}/`)
  },
  replaceImages: async (id, images) => {
    const { data } = await apiClient.put(`/api/offward/manage/image-collections/${encodeURIComponent(id)}/images/`, { images })
    return data
  },
}
