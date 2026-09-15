import axios from 'axios'

function getCookie(name) {
  if (typeof document === 'undefined') {
    return ''
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : ''
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
})

export function getCsrfToken() {
  return getCookie('csrftoken')
}

export async function ensureCsrfToken() {
  const currentToken = getCsrfToken()
  if (currentToken) {
    return currentToken
  }

  const { data } = await apiClient.get('/api/auth/csrf/')
  return getCookie('csrftoken') || data?.csrfToken || ''
}

apiClient.interceptors.request.use(async (config) => {
  const method = config.method?.toUpperCase()
  const unsafeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

  if (unsafeMethod) {
    const token = await ensureCsrfToken()
    if (token) {
      config.headers = config.headers || {}
      config.headers['X-CSRFToken'] = token
    }
  }

  return config
})