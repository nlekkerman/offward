import { useEffect, useSyncExternalStore } from 'react'
import FoodCard from './FoodCard.jsx'
import usePublicCountries from './usePublicCountries.js'
import { getPublicFoodSnapshot, loadNextPublicFoodPage, subscribePublicFoods } from './publicFoodCache.js'
import { publicRelationshipIds, resolvePublicFoodIds } from './publicFoodResolution.js'

function RelatedFood({ foodIds }) {
  const snapshot = useSyncExternalStore(subscribePublicFoods, getPublicFoodSnapshot, getPublicFoodSnapshot)
  const { countries } = usePublicCountries()
  const ids = publicRelationshipIds(foodIds)
  const { foods, unresolved } = resolvePublicFoodIds(ids, snapshot.records)
  const needsInitialPage = unresolved.length > 0 && snapshot.status === 'idle'

  useEffect(() => {
    if (needsInitialPage) loadNextPublicFoodPage().catch(() => {})
  }, [needsInitialPage])

  if (!ids.length) return null
  const canLoad = snapshot.page === 0 || Boolean(snapshot.next)
  return (
    <section className="related-food" aria-label="Related Food">
      <p className="eyebrow">RELATED FOOD</p>
      <h2>Food along the way</h2>
      {foods.length > 0 && <div className="food-grid food-grid-compact">{foods.map((food) => <FoodCard key={food.id} food={food} countries={countries} compact />)}</div>}
      {unresolved.length > 0 && (
        <div className="food-relationship-status" aria-live="polite">
          {snapshot.status === 'loading' ? <p role="status">Looking for related Food…</p> : <p>{unresolved.length} related Food {unresolved.length === 1 ? 'item is' : 'items are'} not resolved in the loaded public catalog.{!canLoad && ' They may be unavailable or unpublished.'}</p>}
          {snapshot.status === 'error' && <p role="alert">Unable to load the public Food catalog. Please retry.</p>}
          {canLoad && <button className="food-button" type="button" disabled={snapshot.status === 'loading'} onClick={() => loadNextPublicFoodPage().catch(() => {})}>{snapshot.status === 'error' ? 'Retry Food lookup' : 'Load next Food page'}</button>}
        </div>
      )}
    </section>
  )
}

export default RelatedFood
