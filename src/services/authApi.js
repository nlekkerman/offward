import { apiClient } from './apiClient.js'

const candidateSessionEndpoints = [
  '/api/auth/session/',
  '/api/session/',
  '/api/auth/user/',
  '/api/user/',
  '/api/me/',
]

function getCookie(name) {
  if (typeof document === 'undefined') {
    return ''
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : ''
}

function normalizeUser(payload) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  if (payload.user && typeof payload.user === 'object') {
    return normalizeUser(payload.user)
  }

  const user = {
    id: payload.id ?? payload.pk ?? payload.user_id ?? null,
    username: payload.username ?? payload.email ?? payload.name ?? null,
    email: payload.email ?? null,
    first_name: payload.first_name ?? payload.given_name ?? null,
    last_name: payload.last_name ?? payload.family_name ?? null,
    is_staff: Boolean(payload.is_staff ?? payload.staff ?? false),
    is_superuser: Boolean(payload.is_superuser ?? payload.superuser ?? false),
  }

  if (!user.username && !user.email && user.id === null) {
    return null
  }

  return user
}

export async function getSession() {
  let lastError = null

  for (const endpoint of candidateSessionEndpoints) {
    try {
      const { data, status } = await apiClient.get(endpoint, {
        validateStatus: () => true,
      })

      if (typeof data === 'string' && data.includes('<html')) {
        continue
      }

      if ((status === 200 || status === 204) && data && typeof data === 'object') {
        const user = normalizeUser(data)

        if (data.authenticated === false || data.isAuthenticated === false) {
          return { status: 'unauthenticated', user: null }
        }

        if (user) {
          if (!user.is_staff && !user.is_superuser) {
            return { status: 'denied', user }
          }
          return { status: 'authenticated', user }
        }

        if (data.detail === 'Authentication credentials were not provided.') {
          return { status: 'unauthenticated', user: null }
        }
      }
    } catch (error) {
      lastError = error
    }
  }

  if (lastError) {
    return { status: 'unauthenticated', user: null, error: lastError }
  }

  return { status: 'unauthenticated', user: null }
}

export async function loginWithSession({ username, password }) {
  const credentials = { username, password }
  const attempts = [
    {
      endpoint: '/api/auth/login/',
      payload: credentials,
      headers: { 'Content-Type': 'application/json' },
    },
    {
      endpoint: '/api/auth/login/',
      payload: new URLSearchParams(credentials),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
    {
      endpoint: '/api/login/',
      payload: credentials,
      headers: { 'Content-Type': 'application/json' },
    },
    {
      endpoint: '/api/login/',
      payload: new URLSearchParams(credentials),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
    {
      endpoint: '/admin/login/',
      payload: new URLSearchParams(credentials),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  ]

  let lastError = null

  for (const attempt of attempts) {
    try {
      const csrftoken = getCookie('csrftoken')
      const { status } = await apiClient.post(attempt.endpoint, attempt.payload, {
        withCredentials: true,
        validateStatus: () => true,
        headers: {
          ...(csrftoken ? { 'X-CSRFToken': csrftoken } : {}),
          ...attempt.headers,
        },
      })

      if (status >= 200 && status < 300) {
        const session = await getSession()
        if (session.status === 'authenticated' || session.status === 'denied') {
          return session
        }
        return { status: 'authenticated', user: null }
      }
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('Unable to sign in.')
}

export async function logoutSession() {
  const endpoints = ['/api/auth/logout/', '/api/logout/']
  let lastError = null

  for (const endpoint of endpoints) {
    try {
      const csrftoken = getCookie('csrftoken')
      await apiClient.post(
        endpoint,
        {},
        {
          withCredentials: true,
          headers: csrftoken ? { 'X-CSRFToken': csrftoken } : {},
        },
      )
      return true
    } catch (error) {
      lastError = error
    }
  }

  if (lastError) {
    throw lastError
  }

  return true
}
