import { collectionPreview } from '../management/imageCollectionUtils.js'
import { getCombinedMapBounds, getRenderablePlaces, isRenderableRoute } from '../map/mapGeometry.js'

export const EXPLORE_BATCH_SIZE = 12

function imageUrl(image) {
  return image?.url || image?.image_url || image?.image?.url || image?.image?.image_url || ''
}

export function getExplorePreview(entity) {
  const collection = Array.isArray(entity.image_collections) ? entity.image_collections[0] : null
  return imageUrl(entity.hero_image) || collectionPreview(collection)
    || imageUrl(entity.preview_image) || imageUrl(entity.image) || imageUrl(entity.thumbnail)
}

export function getExploreBounds(routes, places, selectedId) {
  const selectedRoutes = selectedId ? routes.filter((route) => route.id === selectedId) : routes
  const selectedPlaces = selectedId ? places.filter((place) => place.id === selectedId) : places
  return getCombinedMapBounds(selectedRoutes.filter(isRenderableRoute), getRenderablePlaces(selectedPlaces))
}