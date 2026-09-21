export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function flattenErrorMessages(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(flattenErrorMessages).filter(Boolean).join(' ')
  if (typeof value === 'object') {
    return Object.entries(value).map(([field, message]) => {
      const text = flattenErrorMessages(message)
      return text ? `${field}: ${text}` : ''
    }).filter(Boolean).join(' ')
  }
  return ''
}

export function errorMessage(error, fallback) {
  return flattenErrorMessages(error?.response?.data?.detail) || flattenErrorMessages(error?.response?.data) || error?.message || fallback
}

export function imageId(image) {
  return String(image?.image_id || image?.asset_id || image?.image?.id || image?.id || '')
}

export function imageUrl(image) {
  return image?.url || image?.image_url || image?.image?.url || image?.image?.image_url || image?.src || ''
}

export function imageCaption(image) {
  return image?.caption || ''
}

// Canonical membership payload shape for PUT .../image-collections/:id/images/,
// shared by upload, reorder, caption update, and remove so the field names never drift again.
export function toImageMembershipPayload(images) {
  return images.map((image, index) => ({
    image_asset_id: imageId(image),
    order: index,
    caption: imageCaption(image),
  }))
}

export function collectionPreview(collection) {
  return collection?.preview_image?.thumbnail_url || collection?.preview_image?.url || collection?.preview_image?.image_url || collection?.preview_image_url || imageUrl(collection?.images?.[0])
}

export function collectionCount(collection) {
  return collection?.image_count ?? collection?.images_count ?? collection?.images?.length ?? 0
}

export function formatManagementDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}