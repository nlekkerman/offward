import { apiClient } from './apiClient.js'

const pendingPublicImageCollections = new Map()

// Share an in-flight public detail request between gallery rendering and viewing.
export function getPublicImageCollection(id) {
  const collectionId = String(id)
  const pendingRequest = pendingPublicImageCollections.get(collectionId)
  if (pendingRequest) return pendingRequest

  const request = apiClient.get(`/api/offward/image-collections/${encodeURIComponent(collectionId)}/`)
    .then(({ data }) => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Public image collection response must be an object.')
      }
      return data
    })
  const trackedRequest = request.then(
    (collection) => {
      if (pendingPublicImageCollections.get(collectionId) === trackedRequest) {
        pendingPublicImageCollections.delete(collectionId)
      }
      return collection
    },
    (error) => {
      if (pendingPublicImageCollections.get(collectionId) === trackedRequest) {
        pendingPublicImageCollections.delete(collectionId)
      }
      throw error
    },
  )

  pendingPublicImageCollections.set(collectionId, trackedRequest)
  return trackedRequest
}
