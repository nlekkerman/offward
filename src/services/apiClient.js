import axios from 'axios'

let csrfToken = ''

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

export function setCsrfToken(token) {
  csrfToken = token || ''
}

export function clearCsrfToken() {
  csrfToken = ''
}

export function getCsrfToken() {
  return csrfToken || getCookie('csrftoken')
}

export async function ensureCsrfToken() {
  const currentToken = getCsrfToken()
  if (currentToken) {
    return currentToken
  }

  const { data } = await apiClient.get('/api/auth/csrf/')
  const nextToken = data?.csrfToken || getCookie('csrftoken')
  setCsrfToken(nextToken)
  return nextToken
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