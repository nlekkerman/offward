import { getPublicPlaces } from '../../services/placesApi.js'
import { getPublicRouteBySlug, getPublicRoutes } from '../../services/routesApi.js'
import { getPublicStories } from '../../services/storiesApi.js'
import { createPublicRelationshipCatalog } from './publicFoodCacheState.js'

export const publicPlaceCatalog = createPublicRelationshipCatalog((page) => getPublicPlaces({ page, pageSize: 24 }))
export const publicRouteCatalog = createPublicRelationshipCatalog((page) => getPublicRoutes({ page, pageSize: 24, includeGeometry: false }))
// The existing Story helper drops pagination metadata. Never imply that its
// first response is exhaustive, or invent a page/detail-by-UUID endpoint.
export const publicStoryCatalog = createPublicRelationshipCatalog(async () => ({
  results: await getPublicStories(), next: null,
}), true)

const routeContexts = new Map()
const pendingContexts = new Map()

export function getPublicRouteContext(route) {
  const key = String(route.id)
  if (routeContexts.has(key)) return Promise.resolve(routeContexts.get(key))
  if (pendingContexts.has(key)) return pendingContexts.get(key)
  const pending = getPublicRouteBySlug(route.slug).then((detail) => {
    if (detail && detail.id && String(detail.id) !== key) {
      throw new Error('The public Route context does not match the catalog.')
    }
    routeContexts.set(key, detail ? { ...detail, slug: detail.slug || route.slug } : null)
    return routeContexts.get(key)
  }).finally(() => pendingContexts.delete(key))
  pendingContexts.set(key, pending)
  return pending
}
