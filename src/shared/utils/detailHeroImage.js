import { getPublicImageUrl } from './publicUrls.js'

const FULL_IMAGE_FIELDS = ['url', 'image_url', 'public_url', 'preview_image_url', 'src']
const THUMBNAIL_FIELDS = ['thumbnail_url', 'thumbnail']
const NESTED_IMAGE_FIELDS = ['image', 'image_asset', 'asset']

function imageUrlFrom(image, fields) {
  if (typeof image === 'string') {
    return fields === FULL_IMAGE_FIELDS ? getPublicImageUrl(image) : null
  }
  if (!image || typeof image !== 'object') return null

  const candidates = fields.flatMap((field) => {
    const values = [image[field]]
    for (const nestedField of NESTED_IMAGE_FIELDS) {
      if (image[nestedField] && typeof image[nestedField] === 'object') {
        values.push(image[nestedField][field])
      }
    }
    return values
  })

  return candidates.map(getPublicImageUrl).find(Boolean) || null
}

function collectionImageUrl(collections, fields) {
  for (const collection of collections) {
    const images = Array.isArray(collection?.images) ? collection.images : []
    for (const image of images) {
      const url = imageUrlFrom(image, fields)
      if (url) return url
    }
  }

  for (const collection of collections) {
    const previewImage = collection?.preview_image
    const url = imageUrlFrom(previewImage, fields)
      || imageUrlFrom(collection?.preview_image_url, fields)
      || imageUrlFrom(collection, fields)
    if (url) return url
  }

  return null
}

export function getDetailHeroImage(content, entityType) {
  if (!content || typeof content !== 'object') return null

  if (entityType === 'story') {
    const storyHero = imageUrlFrom(content.hero_image, FULL_IMAGE_FIELDS)
      || imageUrlFrom(content.hero_image, THUMBNAIL_FIELDS)
    if (storyHero) return storyHero
  }

  const collections = Array.isArray(content.image_collections) ? content.image_collections : []
  return collectionImageUrl(collections, FULL_IMAGE_FIELDS)
    || collectionImageUrl(collections, THUMBNAIL_FIELDS)
}
