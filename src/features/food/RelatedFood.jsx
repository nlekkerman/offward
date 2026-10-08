import FoodCard from './FoodCard.jsx'
import usePublicCountries from './usePublicCountries.js'
import useRelatedFood from './useRelatedFood.js'

function RelatedFood({ foodIds }) {
  const { countries } = usePublicCountries()
  const { requestedIds, resolvedFoods, unresolvedIds, loading, error, canLoadMore, loadMore } = useRelatedFood(foodIds)

  if (!requestedIds.length) return null
  return (
    <section className="related-food" aria-label="Related Food">
      <p className="eyebrow">RELATED FOOD</p>
      <h2>Food along the way</h2>
      {resolvedFoods.length > 0 && <div className="food-grid food-grid-compact">{resolvedFoods.map((food) => <FoodCard key={food.id} food={food} countries={countries} compact />)}</div>}
      {unresolvedIds.length > 0 && (
        <div className="food-relationship-status" aria-live="polite">
          {loading ? <p role="status">Looking for related Food…</p> : <p>{unresolvedIds.length} related Food {unresolvedIds.length === 1 ? 'item is' : 'items are'} not resolved in the loaded public catalog.{!canLoadMore && ' They may be unavailable or unpublished.'}</p>}
          {error && <p role="alert">Unable to load the public Food catalog. Please retry.</p>}
          {canLoadMore && <button className="food-button" type="button" disabled={loading} onClick={() => loadMore().catch(() => {})}>{error ? 'Retry Food lookup' : 'Load next Food page'}</button>}
        </div>
      )}
    </section>
  )
}

export default RelatedFood
