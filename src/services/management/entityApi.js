import { apiClient } from '../apiClient.js'
import { normalizeManagementPage } from './catalogPagination.js'

export function createManagementEntityApi(resourceKey) {
  const basePath = `/api/offward/manage/${resourceKey}/`

  return {
    listPage: async ({ page = 1, pageSize = 24 } = {}) => {
      const { data } = await apiClient.get(basePath, { params: { page, page_size: pageSize } })
      return normalizeManagementPage(data)
    },
    list: async () => {
      const { data } = await apiClient.get(basePath)
      if (Array.isArray(data)) {
        return data
      }
      if (Array.isArray(data?.results)) {
        return data.results
      }
      return []
    },
    getById: async (id) => {
      const { data } = await apiClient.get(`${basePath}${encodeURIComponent(id)}/`)
      return data
    },
    create: async (payload) => {
      const { data } = await apiClient.post(basePath, payload)
      return data
    },
    update: async (id, payload) => {
      const { data } = await apiClient.patch(`${basePath}${id}/`, payload)
      return data
    },
    remove: async (id) => {
      await apiClient.delete(`${basePath}${id}/`)
    },
  }
}
