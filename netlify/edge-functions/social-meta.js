const PUBLIC_ORIGIN = 'https://offward.eu'
const FALLBACK_IMAGE = `${PUBLIC_ORIGIN}/favicon.svg`
const API_BASE_ENV = 'VITE_API_BASE_URL'

const CONTENT_TYPES = {
  routes: { endpoint: 'routes', titleField: 'title', descriptionField: 'summary', type: 'website' },
  places: { endpoint: 'places', titleField: 'name', descriptionField: 'summary', type: 'website' },
  stories: { endpoint: 'stories', titleField: 'title', descriptionField: 'excerpt', type: 'article' },
  food: { endpoint: 'food', titleField: 'title', descriptionField: 'summary', type: 'website' },
  countries: { endpoint: 'countries', statusOnly: true },
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
      if (url.protocol === 'https:') return url.toString()
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

function replaceMetadata(html, metadata) {
  if (!/<\/head\s*>/i.test(html)) return html

  const result = clearMetadata(html)
  const title = htmlEscape(metadata.title)
  const description = htmlEscape(metadata.description)
  const canonical = htmlEscape(metadata.canonical)
  const image = htmlEscape(metadata.image)
  const type = htmlEscape(metadata.type)
  const injected = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:type" content="${type}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${image}">`,
  ].join('\n    ')

  return result.replace(/<\/head\s*>/i, `    ${injected}\n  </head>`)
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

function createHtmlResponse(response, html, status = response.status, statusText = response.statusText) {
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.delete('content-encoding')
  headers.delete('content-md5')
  headers.delete('etag')
  return new Response(html, { status, statusText, headers })
}

function getRequestTarget(pathname) {
  const match = pathname.match(/^\/(routes|places|stories|food|countries)\/([^/]+)\/?$/)
  if (!match) return null
  try {
    const slug = decodeURIComponent(match[2])
    return slug ? { type: match[1], slug } : null
  } catch {
    return null
  }
}

export default async function handler(request, context) {
  const target = getRequestTarget(new URL(request.url).pathname)
  const response = await context.next()
  if (!target || request.method !== 'GET' || !response.ok) return response

  const contentTypeHeader = response.headers.get('content-type') || ''
  if (!contentTypeHeader.toLowerCase().includes('text/html')) return response

  const apiBase = Netlify.env.get(API_BASE_ENV)
  if (!apiBase) {
    console.error(`Edge metadata skipped: ${API_BASE_ENV} is not available to Edge Functions.`)
    return response
  }

  let apiOrigin
  let detailUrl
  let originalHtml = null
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
      originalHtml = await response.text()
      return createHtmlResponse(response, replaceNotFoundMetadata(originalHtml), 404, 'Not Found')
    }
    if (!apiResponse.ok) return response
    if (CONTENT_TYPES[target.type].statusOnly) return response

    const content = await apiResponse.json()
    if (!isObject(content)) return response

    const mapping = CONTENT_TYPES[target.type]
    const title = cleanText(content[mapping.titleField])
    if (!title) return response
    const description = cleanText(content[mapping.descriptionField]) || [title, getCountry(content)].filter(Boolean).join(' — ')
    const canonical = `${PUBLIC_ORIGIN}/${target.type}/${encodeURIComponent(target.slug)}`
    const image = getSocialImage(content, target.type, apiOrigin)
    originalHtml = await response.text()
    const updatedHtml = replaceMetadata(originalHtml, { title, description, canonical, image, type: mapping.type })
    return createHtmlResponse(response, updatedHtml)
  } catch (error) {
    console.error(`Edge metadata fetch failed for ${target.type}/${target.slug}.`, error)
    if (originalHtml !== null) return createHtmlResponse(response, originalHtml)
    return response
  }
}
