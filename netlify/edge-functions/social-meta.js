import { PUBLIC_PAGE_METADATA } from '../../src/shared/constants/publicPageMetadata.js'

const PUBLIC_ORIGIN = 'https://offward.eu'
const FALLBACK_IMAGE = `${PUBLIC_ORIGIN}/favicon.svg`
const API_BASE_ENV = 'VITE_API_BASE_URL'

const CONTENT_TYPES = {
  routes: { endpoint: 'routes', titleField: 'title', descriptionField: 'summary', fallbackTitle: 'Route', type: 'website' },
  places: { endpoint: 'places', titleField: 'name', descriptionField: 'summary', fallbackTitle: 'Place', type: 'website' },
  stories: { endpoint: 'stories', titleField: 'title', descriptionField: 'excerpt', fallbackTitle: 'Story', type: 'article' },
  food: { endpoint: 'food', titleField: 'title', descriptionField: 'summary', fallbackTitle: 'Food', type: 'website' },
  countries: { endpoint: 'countries', titleField: 'name', descriptionField: 'summary', noImage: true, fallbackTitle: null, type: 'website' },
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function htmlEscape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function getCountry(content) {
  const country = content.country
  if (typeof country === 'string') return country.trim()
  if (!isObject(country)) return ''
  return cleanText(country.name) || cleanText(country.slug)
}

function getImageUrl(value, apiOrigin) {
  const candidates = []
  if (typeof value === 'string') {
    candidates.push(value)
  } else if (isObject(value)) {
    candidates.push(
      value.url,
      value.image_url,
      value.thumbnail_url,
      value.preview_image_url,
      value.public_url,
      value.src,
    )
    if (isObject(value.image)) candidates.push(value.image.url, value.image.image_url, value.image.thumbnail_url)
    if (isObject(value.image_asset)) candidates.push(value.image_asset.url, value.image_asset.image_url)
    if (isObject(value.asset)) candidates.push(value.asset.url, value.asset.image_url)
  }

  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue
    try {
      const url = new URL(candidate.trim(), `${apiOrigin}/`)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        url.protocol = 'https:'
        return url.toString()
      }
    } catch {
      continue
    }
  }
  return null
}

function getSocialImage(content, contentType, apiOrigin) {
  const hero = getImageUrl(content.hero_image, apiOrigin)
  if (contentType === 'stories' && hero) return hero

  if (contentType !== 'stories') {
    for (const field of ['preview_image', 'image', 'cover_image']) {
      const url = getImageUrl(content[field], apiOrigin)
      if (url) return url
    }
  }

  const collections = Array.isArray(content.image_collections) ? content.image_collections : []
  for (const collection of collections) {
    if (!isObject(collection)) continue
    const url = getImageUrl(collection.preview_image, apiOrigin)
      || getImageUrl(collection.preview_image_url, apiOrigin)
      || getImageUrl(Array.isArray(collection.images) ? collection.images[0] : null, apiOrigin)
      || getImageUrl(collection, apiOrigin)
    if (url) return url
  }

  return hero || FALLBACK_IMAGE
}

function clearMetadata(html) {
  const titleTag = /<title\b[^>]*>[\s\S]*?<\/title\s*>/i
  const canonicalTag = /<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/gi
  let result = html.replace(titleTag, '')
  result = result.replace(canonicalTag, '')

  for (const [attribute, value] of [
    ['name', 'description'],
    ['property', 'og:title'],
    ['property', 'og:description'],
    ['property', 'og:url'],
    ['property', 'og:image'],
    ['property', 'og:type'],
    ['name', 'twitter:card'],
    ['name', 'twitter:title'],
    ['name', 'twitter:description'],
    ['name', 'twitter:image'],
    ['name', 'robots'],
  ]) {
    const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const tag = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}\\s*=\\s*["']${escapedValue}["'])[^>]*>`, 'gi')
    result = result.replace(tag, '')
  }

  return result
}

function replaceUnindexedMetadata(html) {
  if (!/<\/head\s*>/i.test(html)) return html

  const result = clearMetadata(html)
  return result.replace(
    /<\/head\s*>/i,
    '    <title>Offward</title>\n    <meta name="robots" content="noindex,nofollow">\n  </head>',
  )
}

function replaceMetadata(html, metadata) {
  if (!/<\/head\s*>/i.test(html)) return html

  const result = clearMetadata(html)
  const title = htmlEscape(metadata.title)
  const description = htmlEscape(metadata.description)
  const canonical = htmlEscape(metadata.canonical)
  const type = htmlEscape(metadata.type)
  const injected = [
    `<title>${title} | Offward</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:type" content="${type}">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
  ].join('\n    ')
  const withImage = metadata.image
    ? [
        `<meta property="og:image" content="${htmlEscape(metadata.image)}">`,
        '<meta name="twitter:card" content="summary_large_image">',
        `<meta name="twitter:image" content="${htmlEscape(metadata.image)}">`,
      ].join('\n    ')
    : '<meta name="twitter:card" content="summary">'

  return result.replace(/<\/head\s*>/i, `    ${injected}\n    ${withImage}\n  </head>`)
}

function replaceNotFoundMetadata(html) {
  if (!/<\/head\s*>/i.test(html)) return html

  const result = clearMetadata(html)
  const injected = [
    '<title>404 — Not lost. Just Offward. | Offward</title>',
    '<meta name="robots" content="noindex,follow">',
  ].join('\n    ')

  return result.replace(/<\/head\s*>/i, `    ${injected}\n  </head>`)
}

function withRobotsHeader(response, value) {
  const headers = new Headers(response.headers)
  headers.set('x-robots-tag', value)
  headers.set('cache-control', 'no-store')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function createHtmlResponse(response, html, status = response.status, statusText = response.statusText) {
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.delete('content-encoding')
  headers.delete('content-md5')
  headers.delete('etag')
  if (status === 404) headers.set('x-robots-tag', 'noindex,follow')
  return new Response(html, { status, statusText, headers })
}

function getRequestTarget(pathname) {
  const nestedMatch = pathname.match(/^\/routes\/([^/]+)\/(waypoints|segments)\/([^/]+)\/?$/)
  const match = pathname.match(/^\/(routes|places|stories|food|countries)\/([^/]+)\/?$/)
  if (!nestedMatch && !match) return null
  try {
    if (nestedMatch) {
      const [, rawSlug, nestedType, rawId] = nestedMatch
      const slug = decodeURIComponent(rawSlug)
      const id = decodeURIComponent(rawId)
      return slug && id ? { type: 'routes', slug, nestedType, id } : null
    }
    const slug = decodeURIComponent(match[2])
    return slug ? { type: match[1], slug } : null
  } catch {
    return null
  }
}

function getNestedContent(route, target) {
  const items = target.nestedType === 'waypoints' ? route.waypoints : route.segments
  if (!Array.isArray(items)) return null
  return items.find((item) => isObject(item) && String(item.id) === target.id) || null
}

function getNestedTitle(route, target, content) {
  if (target.nestedType === 'waypoints') {
    return cleanText(content.name)
      || cleanText(content.label)
      || cleanText(content.place_name)
      || (content.order != null ? `Waypoint ${content.order}` : 'Waypoint')
  }

  const start = Array.isArray(route.waypoints)
    ? route.waypoints.find((item) => isObject(item) && String(item.id) === String(content.start_waypoint_id))
    : null
  const end = Array.isArray(route.waypoints)
    ? route.waypoints.find((item) => isObject(item) && String(item.id) === String(content.end_waypoint_id))
    : null
  const startName = cleanText(start?.name) || cleanText(start?.label) || 'Start'
  const endName = cleanText(end?.name) || cleanText(end?.label) || 'End'
  return cleanText(content.title) || `${startName} → ${endName}`
}

function isPlaceholderPath(pathname) {
  return /^\/(events|tours|videos)\/[^/]+\/?$/.test(pathname)
}

function isInvalidRewrittenPath(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  const rewrittenFamilies = [
    { prefix: 'food', listPath: '/food' },
    { prefix: 'countries', listPath: '/countries' },
    { prefix: 'places' },
    { prefix: 'routes' },
    { prefix: 'stories', listPath: '/stories' },
    { prefix: 'videos' },
    { prefix: 'tours' },
    { prefix: 'events' },
  ]

  for (const family of rewrittenFamilies) {
    if (normalizedPath === `/${family.prefix}`) return family.listPath !== normalizedPath
    if (!normalizedPath.startsWith(`/${family.prefix}/`)) continue
    if (family.listPath === normalizedPath) return false
    if (getRequestTarget(normalizedPath)) return false
    if (family.prefix === 'events' || family.prefix === 'tours' || family.prefix === 'videos') {
      return !new RegExp(`^/${family.prefix}/[^/]+$`).test(normalizedPath)
        || !isPlaceholderPath(normalizedPath)
    }
    return true
  }
  return false
}

export default async function handler(request, context) {
  const requestUrl = new URL(request.url)
  const target = getRequestTarget(requestUrl.pathname)
  let response = await context.next()
  let originalHtml = null

  if (requestUrl.pathname === '/robots.txt' && (request.method === 'GET' || request.method === 'HEAD')) {
    const robots = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /manage',
      '',
    ].join('\n')
    return new Response(request.method === 'HEAD' ? null : robots, {
      status: 200,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }

  const contentTypeHeader = response.headers.get('content-type') || ''
  const isHtml = contentTypeHeader.toLowerCase().includes('text/html')
  const isManagementPath = requestUrl.pathname === '/manage' || requestUrl.pathname.startsWith('/manage/')
  if (isHtml && response.ok && isInvalidRewrittenPath(requestUrl.pathname)) {
    response = withRobotsHeader(response, 'noindex,follow')
    const html = await response.text()
    return createHtmlResponse(response, replaceNotFoundMetadata(html), 404, 'Not Found')
  }

  if (isHtml && (isManagementPath || response.status === 404)) {
    response = withRobotsHeader(response, 'noindex,nofollow')
    originalHtml = await response.text()
    if (response.status === 404) {
      return createHtmlResponse(response, replaceNotFoundMetadata(originalHtml), 404, 'Not Found')
    }
    response = createHtmlResponse(response, replaceUnindexedMetadata(originalHtml))
    if (!target) return response
  }

  if (isHtml && response.ok && isPlaceholderPath(requestUrl.pathname)) {
    response = withRobotsHeader(response, 'noindex,nofollow')
    const html = await response.text()
    return createHtmlResponse(response, replaceUnindexedMetadata(html))
  }

  if (request.method !== 'GET' || !response.ok || !isHtml) return response

  if (!target) {
    const metadataPath = requestUrl.pathname.replace(/\/+$/, '') || '/'
    const metadata = {
      '/explore': PUBLIC_PAGE_METADATA.explore,
      '/countries': PUBLIC_PAGE_METADATA.countries,
      '/stories': PUBLIC_PAGE_METADATA.stories,
      '/food': PUBLIC_PAGE_METADATA.food,
      '/about': PUBLIC_PAGE_METADATA.about,
      '/contact': PUBLIC_PAGE_METADATA.contact,
    }[metadataPath]
    if (!metadata) return response

    const pageMetadata = metadataPath === '/explore'
      ? metadata[requestUrl.searchParams.get('view') === 'places' ? 'places' : 'routes']
      : metadata
    const canonical = `${PUBLIC_ORIGIN}${metadataPath}`
    const html = await response.text()
    return createHtmlResponse(response, replaceMetadata(html, {
      ...pageMetadata,
      canonical,
      type: 'website',
      image: FALLBACK_IMAGE,
    }))
  }

  const apiBase = Netlify.env.get(API_BASE_ENV)
  if (!apiBase) {
    console.error(`Edge metadata skipped: ${API_BASE_ENV} is not available to Edge Functions.`)
    return response
  }

  let apiOrigin
  let detailUrl
  try {
    const apiBaseUrl = new URL(apiBase)
    if (apiBaseUrl.protocol !== 'https:' && apiBaseUrl.protocol !== 'http:') return response
    apiOrigin = apiBaseUrl.origin
    const endpoint = CONTENT_TYPES[target.type].endpoint
    detailUrl = new URL(`/api/offward/${endpoint}/${encodeURIComponent(target.slug)}/`, apiOrigin)
  } catch (error) {
    console.error('Edge metadata skipped: invalid API base URL.', error)
    return response
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    let apiResponse
    try {
      apiResponse = await fetch(detailUrl, { signal: controller.signal })
    } finally {
      clearTimeout(timeout)
    }
    if (apiResponse.status === 404) {
      originalHtml = originalHtml ?? await response.text()
      return createHtmlResponse(response, replaceNotFoundMetadata(originalHtml), 404, 'Not Found')
    }
    if (!apiResponse.ok) return response
    const route = await apiResponse.json()
    if (!isObject(route)) return response

    const mapping = CONTENT_TYPES[target.type]
    const content = target.nestedType ? getNestedContent(route, target) : route
    if (!content) {
      originalHtml = await response.text()
      return createHtmlResponse(response, replaceNotFoundMetadata(originalHtml), 404, 'Not Found')
    }
    const title = target.nestedType
      ? getNestedTitle(route, target, content)
      : cleanText(content[mapping.titleField])
        || (mapping.fallbackTitle || target.slug.replace(/[-_]+/g, ' '))
    const description = cleanText(target.nestedType
      ? content.summary || content.note || content.description
      : content[mapping.descriptionField])
      || (target.nestedType || target.type === 'countries'
        ? title
        : [title, getCountry(content)].filter(Boolean).join(' — '))
    const contentPath = target.nestedType
      ? `/routes/${encodeURIComponent(target.slug)}/${target.nestedType}/${encodeURIComponent(target.id)}`
      : `/${target.type}/${encodeURIComponent(target.slug)}`
    const canonical = `${PUBLIC_ORIGIN}${contentPath}`
    const image = mapping.noImage
      ? null
      : getSocialImage(target.nestedType ? route : content, target.type, apiOrigin)
    originalHtml = originalHtml ?? await response.text()
    const updatedHtml = replaceMetadata(originalHtml, { title, description, canonical, image, type: mapping.type })
    return createHtmlResponse(response, updatedHtml)
  } catch (error) {
    console.error(`Edge metadata fetch failed for ${target.type}/${target.slug}.`, error)
    if (originalHtml !== null) return createHtmlResponse(response, originalHtml)
    return response
  }
}
