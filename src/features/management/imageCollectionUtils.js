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

// Returns the ImageAsset UUID. Management collection rows are CollectionImage records whose
// own `id` is the membership row, so `image_asset_id` must win over `id`.
export function imageId(image) {
  const isMembership = image && (Object.hasOwn(image, 'image_asset_id') || Object.hasOwn(image, 'order'))
  return String(image?.image_asset_id || image?.image_id || image?.asset_id || image?.image?.id || (isMembership ? '' : image?.id) || '')
}

export function imageUrl(image) {
  return image?.url || image?.image_url || image?.image?.url || image?.image?.image_url || image?.src || ''
}

export function imagePreviewUrl(image) {
  return image?.thumbnail_url || imageUrl(image)
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

// Preview URL for a collection membership row. Reads the same ImageAsset URL fields the frontend
// already consumes for this API family (upload response, preview_image, ImageLightbox), flat or nested.
export function membershipPreviewUrl(row) {
  const asset = row?.image_asset || row?.image || row?.asset
  return row?.image?.thumbnail_url || row?.image?.url
    || imageUrl(row)
    || row?.thumbnail_url || row?.public_url
    || asset?.thumbnail_url || asset?.public_url || asset?.url || asset?.image_url
    || ''
}

// Normalizes collection rows (management detail/PUT response or freshly uploaded assets) into
// canonical membership rows keyed by ImageAsset UUID, ordered by `order`. Preview URLs known
// from earlier rows (e.g. upload responses) are kept as a fallback when a row carries no URL.
export function toMembershipRows(rows, previousRows = []) {
  const knownUrls = new Map(previousRows.map((row) => [imageId(row), membershipPreviewUrl(row)]))
  return (Array.isArray(rows) ? rows : [])
    .map((row, index) => ({ row, index }))
    .sort((a, b) => (a.row?.order ?? a.index) - (b.row?.order ?? b.index) || a.index - b.index)
    .map(({ row }) => {
      const assetId = imageId(row)
      return {
        image_asset_id: assetId,
        caption: imageCaption(row),
        url: membershipPreviewUrl(row) || knownUrls.get(assetId) || '',
      }
    })
    .filter((row) => row.image_asset_id)
}

export function collectionPreview(collection) {
  return imagePreviewUrl(collection?.preview_image) || collection?.preview_image_url || imageUrl(collection?.images?.[0])
}

export function collectionCount(collection) {
  return collection?.image_count ?? collection?.images_count ?? collection?.images?.length ?? 0
}

export function formatManagementDate(value, includeTime = false) {
  if (!value) return '—'
  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const options = { day: 'numeric', month: 'short', year: 'numeric' }
  if (includeTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
  }
  return new Intl.DateTimeFormat(undefined, options).format(date)
}