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

function normalizeAccessResponse(data, placeId) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Place access response must be an object.')
  }
  if (String(data.id) !== String(placeId)) {
    throw new Error('Place access response did not match the requested Place.')
  }
  if (data.access_revision === null
    || data.access_revision === undefined
    || !Number.isSafeInteger(Number(data.access_revision))
    || Number(data.access_revision) < 0) {
    throw new Error('Place access response did not include a valid access revision.')
  }
  return data
}

export const placeAccessApi = {
  update: async (placeId, payload) => {
    if (!placeId) {
      throw new Error('A saved Place ID is required to update access directions.')
    }
    const requestPayload = {
      ...payload,
      expected_access_revision: getExpectedAccessRevision(payload.expected_access_revision),
    }
    const { data } = await apiClient.patch(
      `/api/offward/manage/places/${encodeURIComponent(placeId)}/access/`,
      requestPayload,
    )
    return normalizeAccessResponse(data, placeId)
  },
}
