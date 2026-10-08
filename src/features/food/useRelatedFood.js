import { useEffect, useSyncExternalStore } from 'react'
import { getPublicFoodSnapshot, loadNextPublicFoodPage, subscribePublicFoods } from './publicFoodCache.js'
import { publicRelationshipIds, resolvePublicFoodIds } from './publicFoodResolution.js'

function useRelatedFood(foodIds) {
  const snapshot = useSyncExternalStore(subscribePublicFoods, getPublicFoodSnapshot, getPublicFoodSnapshot)
  const requestedIds = publicRelationshipIds(foodIds)
  const { foods: resolvedFoods, unresolved: unresolvedIds } = resolvePublicFoodIds(requestedIds, snapshot.records)
  const needsInitialPage = unresolvedIds.length > 0 && snapshot.status === 'idle'

  useEffect(() => {
    if (needsInitialPage) loadNextPublicFoodPage().catch(() => {})
  }, [needsInitialPage])

  return {
    requestedIds,
    resolvedFoods,
    unresolvedIds,
    loading: unresolvedIds.length > 0 && snapshot.status === 'loading',
    error: snapshot.status === 'error',
    canLoadMore: snapshot.page === 0 || Boolean(snapshot.next),
    loadMore: loadNextPublicFoodPage,
  }
}

export default useRelatedFood
