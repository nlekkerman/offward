import {
  getOffwardAuthState,
  subscribeToOffwardAuthState,
} from './offwardAuthState.js'

const EVENT_ENDPOINT = '/api/offward/analytics/events/'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CONTENT_TYPES = new Set(['route', 'place', 'story', 'food'])
const INTERACTION_ACTIONS = new Set(['directions', 'track', 'related_content'])
const STATIC_PAGE_PATHS = new Set(['/', '/contact', '/countries', '/food', '/stories'])
const DETAIL_PATH_PATTERN = /^\/(countries|food|places|routes|stories|events|tours|videos)\/[^/]+$/
const CONTENT_TYPE_BY_COLLECTION = {
  food: 'food',
  places: 'place',
  routes: 'route',
  stories: 'story',
}

let lifecycleInitialized = false
let initialNavigationType = null
let initialDocumentPath = null
let initialLocationKey = null
let currentPath = null
let currentPage = null
let lastEmittedPageView = null
let pendingPageView = null

function canSendAnalytics() {
  const authState = getOffwardAuthState()
  return authState === 'anonymous' || authState === 'authenticated'
}

function normalizePagePath(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return null
  if (pathname === '/') return '/'
  return `${pathname.replace(/\/+$/, '')}/`
}

function pathWithoutTrailingSlash(pathname) {
  if (pathname === '/') return '/'
  return pathname.replace(/\/+$/, '')
}

function isValidContent(content) {
  return Boolean(
    content &&
    CONTENT_TYPES.has(content.type) &&
    typeof content.uuid === 'string' &&
    UUID_PATTERN.test(content.uuid),
  )
}

function getAnalyticsEndpoint() {
  if (typeof window === 'undefined') return null
  const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin
  return new URL(EVENT_ENDPOINT, baseUrl).toString()
}

function sendEvent(payload) {
  if (!canSendAnalytics() || typeof window === 'undefined' || typeof fetch !== 'function') return

  try {
    const body = JSON.stringify(payload)
    if (new TextEncoder().encode(body).byteLength >= 2048) return

    const endpoint = getAnalyticsEndpoint()
    if (!endpoint) return

    void fetch(endpoint, {
      method: 'POST',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json' },
      body,
    }).catch(() => {})
  } catch {
    // Analytics delivery must not affect the visitor experience.
  }
}

function sendVisit() {
  sendEvent({ event_type: 'visit' })
}

function sendPageView(pathname, locationKey, content) {
  const pagePath = normalizePagePath(pathname)
  const pathKey = pathWithoutTrailingSlash(pathname)
  if (!pagePath || !(STATIC_PAGE_PATHS.has(pathKey) || DETAIL_PATH_PATTERN.test(pathKey))) return

  let safeContent
  if (content !== undefined) {
    if (!isValidContent(content)) return
    const collection = pathKey.split('/')[1]
    if (CONTENT_TYPE_BY_COLLECTION[collection] !== content.type) return
    safeContent = { type: content.type, uuid: content.uuid }
  } else if (DETAIL_PATH_PATTERN.test(pathKey) && CONTENT_TYPE_BY_COLLECTION[pathKey.split('/')[1]]) {
    return
  }
  if (currentPage?.pagePath === pagePath) return

  const eventKey = `${locationKey}:${pagePath}`
  if (lastEmittedPageView === eventKey) return
  if (!canSendAnalytics()) {
    if (getOffwardAuthState() === 'pending') {
      pendingPageView = { pathname, locationKey, content }
    }
    return
  }

  lastEmittedPageView = eventKey
  pendingPageView = null

  currentPage = { pagePath, content: safeContent }
  sendEvent({
    event_type: 'page_view',
    page_path: pagePath,
    ...(safeContent ? { content: safeContent } : {}),
  })

  if (locationKey === initialLocationKey && pathKey === initialDocumentPath &&
      (initialNavigationType === 'navigate' || initialNavigationType === 'back_forward')) {
    sendVisit()
  }
}

export function initializeAnalyticsLifecycle() {
  if (lifecycleInitialized || typeof window === 'undefined') return
  lifecycleInitialized = true
  initialDocumentPath = pathWithoutTrailingSlash(window.location.pathname)
  const navigationEntry = typeof performance === 'undefined'
    ? null
    : performance.getEntriesByType?.('navigation')?.[0]
  initialNavigationType = navigationEntry?.type || null

  subscribeToOffwardAuthState((authState) => {
    if (authState !== 'anonymous' && authState !== 'authenticated') {
      pendingPageView = null
      return
    }

    if (pendingPageView) {
      const pending = pendingPageView
      pendingPageView = null
      sendPageView(pending.pathname, pending.locationKey, pending.content)
    }
  })

  window.addEventListener('pageshow', (event) => {
    if (!event.persisted || !currentPage) return
    sendVisit()
    sendEvent({
      event_type: 'page_view',
      page_path: currentPage.pagePath,
      ...(currentPage.content ? { content: currentPage.content } : {}),
    })
  })
}

export function observePublicLocation(pathname, locationKey) {
  const pathKey = pathWithoutTrailingSlash(pathname)
  if (pathKey === currentPath) return

  currentPath = pathKey
  currentPage = null
  pendingPageView = null
  if (initialLocationKey === null) initialLocationKey = locationKey

  if (STATIC_PAGE_PATHS.has(pathKey)) {
    sendPageView(pathname, locationKey)
  }
}

export function trackPublicDetailPageView(pathname, locationKey, contentType, uuid) {
  const pathKey = pathWithoutTrailingSlash(pathname)
  if (currentPath === null) {
    currentPath = pathKey
    if (initialLocationKey === null) initialLocationKey = locationKey
  }
  if (pathKey !== currentPath || !DETAIL_PATH_PATTERN.test(pathKey)) return

  const collection = pathKey.split('/')[1]
  const expectedType = CONTENT_TYPE_BY_COLLECTION[collection]
  if (expectedType) {
    if (contentType !== expectedType || !UUID_PATTERN.test(String(uuid || ''))) return
    sendPageView(pathname, locationKey, { type: expectedType, uuid })
    return
  }

  sendPageView(pathname, locationKey)
}

export function trackInteraction(action, contentType, uuid) {
  if (!INTERACTION_ACTIONS.has(action) || !CONTENT_TYPES.has(contentType) ||
      typeof uuid !== 'string' || !UUID_PATTERN.test(uuid)) return
  if (action !== 'related_content' && contentType !== 'route' && contentType !== 'place') return

  sendEvent({
    event_type: 'interaction',
    action,
    content: { type: contentType, uuid },
  })
}
