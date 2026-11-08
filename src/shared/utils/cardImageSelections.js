import { getPublicImageUrl } from './publicUrls.js'

// Public list/detail responses resolve manual card image selections to
// `card_image_selections: { [placement]: { id, url, thumbnail_url } }`.
// A missing placement key means no manual selection, so callers fall back
// to their existing automatic image resolution.
export function selectedCardImageUrl(entity, placement) {
  const selection = entity?.card_image_selections?.[placement]
  if (!selection || typeof selection !== 'object') return ''
  return getPublicImageUrl(selection.thumbnail_url) || getPublicImageUrl(selection.url) || ''
}
