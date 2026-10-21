import { apiClient } from '../apiClient.js'

function getExpectedAccessRevision(revision) {
  if (revision === null || revision === undefined || revision === '') {
    throw new Error('A current Place access revision is required to save access directions.')
  }
  const expectedRevision = Number(revision)
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new Error('A current Place access revision is required to save access directions.')
  }
  return expectedRevision
}

function getPlaceAccessUrl(placeId) {
  if (!placeId) {
    throw new Error('A saved Place ID is required to access Place directions.')
  }
  return `/api/offward/manage/places/${encodeURIComponent(placeId)}/access/`
}

function normalizeAccessResponse(data, placeId) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Place access response must be an object.')
  }
  if (String(data.id) !== String(placeId)) {
    throw new Error('Place access response did not match the requested Place.')
  }
  if (data.access_revision === null
    || data.access_revision === undefined
    || data.access_revision === ''
    || !Number.isSafeInteger(Number(data.access_revision))
    || Number(data.access_revision) < 0) {
    throw new Error('Place access response did not include a valid access revision.')
  }
  return {
    ...data,
    access_start_latitude: data.access_start_latitude ?? null,
    access_start_longitude: data.access_start_longitude ?? null,
    access_start_name: typeof data.access_start_name === 'string' ? data.access_start_name : '',
    access_start_description: typeof data.access_start_description === 'string' ? data.access_start_description : '',
    access_geometry: data.access_geometry ?? null,
    access_revision: Number(data.access_revision),
  }
}

export const placeAccessApi = {
  get: async (placeId) => {
    const { data } = await apiClient.get(getPlaceAccessUrl(placeId))
    return normalizeAccessResponse(data, placeId)
  },
  update: async (placeId, payload) => {
    if (!placeId) {
      throw new Error('A saved Place ID is required to update access directions.')
    }
    const requestPayload = {
      ...payload,
      expected_access_revision: getExpectedAccessRevision(payload.expected_access_revision),
    }
    const { data } = await apiClient.patch(getPlaceAccessUrl(placeId), requestPayload)
    return normalizeAccessResponse(data, placeId)
  },
}
