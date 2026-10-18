export const OFFWARD_ORIGIN = 'https://offward.eu'
export const FALLBACK_SOCIAL_IMAGE = `${OFFWARD_ORIGIN}/favicon.svg`

export function getPublicUrl(path) {
  const normalizedPath = String(path || '').replace(/^\/+/, '')
  return new URL(`/${normalizedPath}`, OFFWARD_ORIGIN).toString()
}

export function getContentDescription(summary, title, country = '') {
  if (typeof summary === 'string' && summary.trim()) return summary.trim()
  return [title, country].filter((value) => typeof value === 'string' && value.trim()).join(' — ')
}

function getApiAssetOrigin() {
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL
  if (!configuredApiUrl) return null

  try {
    const apiUrl = new URL(configuredApiUrl)
    if (apiUrl.protocol !== 'http:' && apiUrl.protocol !== 'https:') return null
    return `https://${apiUrl.host}/`
  } catch {
    return null
  }
}

export function getPublicImageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null

  try {
    const rawUrl = value.trim()
    let imageUrl
    if (rawUrl.startsWith('//')) {
      imageUrl = new URL(`https:${rawUrl}`)
    } else {
      try {
        imageUrl = new URL(rawUrl)
      } catch {
        const assetOrigin = getApiAssetOrigin()
        if (!assetOrigin) return null
        imageUrl = new URL(rawUrl, assetOrigin)
      }
    }
    if (imageUrl.protocol !== 'http:' && imageUrl.protocol !== 'https:') return null
    imageUrl.protocol = 'https:'
    return imageUrl.toString()
  } catch {
    return null
  }
}

function imageUrlFrom(value) {
  if (typeof value === 'string') return getPublicImageUrl(value)
  if (!value || typeof value !== 'object') return null

  const candidates = [
    value.url,
    value.image_url,
    value.thumbnail_url,
    value.preview_image_url,
    value.public_url,
    value.src,
    value.image?.url,
    value.image?.image_url,
    value.image?.thumbnail_url,
    value.image_asset?.url,
    value.image_asset?.image_url,
    value.asset?.url,
    value.asset?.image_url,
  ]

  return candidates.map(getPublicImageUrl).find(Boolean) || null
}

export function getContentSocialImage(content, { preferHero = false } = {}) {
  if (!content || typeof content !== 'object') return FALLBACK_SOCIAL_IMAGE

  const heroImage = imageUrlFrom(content.hero_image)
  if (preferHero && heroImage) return heroImage

  const directImage = imageUrlFrom(content.preview_image)
    || imageUrlFrom(content.image)
    || imageUrlFrom(content.cover_image)
  if (directImage) return directImage

  const collections = Array.isArray(content.image_collections) ? content.image_collections : []
  for (const collection of collections) {
    const preview = imageUrlFrom(collection.preview_image)
      || imageUrlFrom(collection.preview_image_url)
      || imageUrlFrom(collection.images?.[0])
      || imageUrlFrom(collection)
    if (preview) return preview
  }

  return heroImage || FALLBACK_SOCIAL_IMAGE
}
