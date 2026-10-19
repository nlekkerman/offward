import { orderedCollectionImages } from '../../features/routes/components/routeMediaUtils.js'
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

function imageIdentity(image) {
  if (!image || typeof image !== 'object') return null
  return String(image.image_asset_id || image.image_id || image.asset_id || image.image?.id || image.id || '') || null
}

function imageMatches(candidate, image, imageUrl) {
  if (candidate === image) return true
  const identity = imageIdentity(image)
  if (identity && imageIdentity(candidate) === identity) return true
  return imageUrlFrom(candidate, FULL_IMAGE_FIELDS) === imageUrl
    || imageUrlFrom(candidate, THUMBNAIL_FIELDS) === imageUrl
}

function galleryImages(collection, entityType) {
  return entityType === 'route' || entityType === 'food'
    ? orderedCollectionImages(collection)
    : (Array.isArray(collection?.images) ? collection.images : [])
}

export function getDetailHeroSourceIndex(collection, source, entityType) {
  const images = galleryImages(collection, entityType)
  return images.findIndex((candidate) => imageMatches(candidate, source?.image, source?.imageUrl))
}

function galleryIndex(collection, image, imageUrl, entityType) {
  return getDetailHeroSourceIndex(collection, { image, imageUrl }, entityType)
}

function collectionSource(collections, fields, entityType) {
  for (const collection of collections) {
    const images = Array.isArray(collection?.images) ? collection.images : []
    for (const image of images) {
      const url = imageUrlFrom(image, fields)
      if (url) {
        return {
          imageUrl: url,
          sourceType: 'collection',
          collection,
          image,
          index: galleryIndex(collection, image, url, entityType),
        }
      }
    }
  }

  for (const collection of collections) {
    const previewImage = collection?.preview_image
    const url = imageUrlFrom(previewImage, fields)
      || imageUrlFrom(collection?.preview_image_url, fields)
      || imageUrlFrom(collection, fields)
    if (url) {
      const image = previewImage && imageUrlFrom(previewImage, fields) === url ? previewImage : null
      return {
        imageUrl: url,
        sourceType: 'collection',
        collection,
        image,
        index: image ? galleryIndex(collection, image, url, entityType) : -1,
      }
    }
  }

  return null
}

function findCollectionImage(collections, image, imageUrl) {
  for (const collection of collections) {
    const images = Array.isArray(collection?.images) ? collection.images : []
    const matchingImage = images.find((candidate) => imageMatches(candidate, image, imageUrl))
    if (matchingImage) {
      return {
        imageUrl,
        sourceType: 'collection',
        collection,
        image: matchingImage,
        index: galleryIndex(collection, matchingImage, imageUrl, 'story'),
      }
    }
  }
  return null
}

export function getDetailHeroSource(content, entityType) {
  if (!content || typeof content !== 'object') return null

  const collections = Array.isArray(content.image_collections) ? content.image_collections : []

  if (entityType === 'story') {
    const storyHero = imageUrlFrom(content.hero_image, FULL_IMAGE_FIELDS)
      || imageUrlFrom(content.hero_image, THUMBNAIL_FIELDS)
    if (storyHero) {
      return findCollectionImage(collections, content.hero_image, storyHero) || {
        imageUrl: storyHero,
        sourceType: 'standalone',
        image: content.hero_image,
        index: 0,
      }
    }
  }

  return collectionSource(collections, FULL_IMAGE_FIELDS, entityType)
    || collectionSource(collections, THUMBNAIL_FIELDS, entityType)
}

export function getDetailHeroImage(content, entityType) {
  return getDetailHeroSource(content, entityType)?.imageUrl || null
}
