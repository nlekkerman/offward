import { getPublicFoods } from '../../services/foodsApi.js'
import { createPublicFoodCache } from './publicFoodCacheState.js'

const cache = createPublicFoodCache(getPublicFoods)
export { getNextPage } from './publicFoodCacheState.js'
export const rememberPublicFoods = cache.remember
export const subscribePublicFoods = cache.subscribe
export const getPublicFoodSnapshot = cache.getSnapshot
export const loadPublicFoodPage = cache.loadPage
export const loadNextPublicFoodPage = cache.loadNext
export const invalidatePublicFoods = cache.invalidate
