import { apiClient, clearCsrfToken, ensureCsrfToken, setCsrfToken } from './apiClient.js'

const UNAUTHENTICATED_SESSION = Object.freeze({
  isAuthenticated: false,
  isStaff: false,
  username: '',
})

// HTTP 200 alone never implies a session: only the parsed JSON body decides.
function normalizeSession(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ...UNAUTHENTICATED_SESSION }
  }

  const isAuthenticated = payload.is_authenticated === true
  const isStaff = isAuthenticated && payload.is_staff === true

  return {
    isAuthenticated,
    isStaff,
    username: typeof payload.username === 'string' ? payload.username : '',
  }
}

function getReadableAuthError(error) {
  const detail = error?.response?.data?.detail
  if (detail) {
    return detail
  }

  const nonFieldError = error?.response?.data?.non_field_errors?.[0]
  if (nonFieldError) {
    return nonFieldError
  }

  return error?.message || 'Unable to sign in.'
}

export async function getCsrf() {
  const { data } = await apiClient.get('/api/auth/csrf/')
  setCsrfToken(data?.csrfToken || '')
  return data?.csrfToken || ''
}

export async function getSession() {
  try {
    const { data } = await apiClient.get('/api/auth/session/')
    return normalizeSession(data)
  } catch {
    return { ...UNAUTHENTICATED_SESSION }
  }
}

export async function loginWithSession({ username, password }) {
  try {
    await getCsrf()
    await apiClient.post('/api/auth/login/', { username, password }, {
      headers: { 'Content-Type': 'application/json' },
    })
    return getSession()
  } catch (error) {
    throw new Error(getReadableAuthError(error), { cause: error })
  }
}

export async function logoutSession() {
  await ensureCsrfToken()
  await apiClient.post('/api/auth/logout/', {})
  clearCsrfToken()
  return true
}
