import { useEffect, useRef, useState } from 'react'
import FoodCard from '../features/food/FoodCard.jsx'
import { FOOD_TYPES } from '../features/food/foodConstants.js'
import { getNextPage, loadPublicFoodPage } from '../features/food/publicFoodCache.js'
import usePublicCountries from '../features/food/usePublicCountries.js'
import { formatActivityLabel } from '../features/home/latestContentFormatting.js'

function FoodsListPage() {
  const [country, setCountry] = useState('')
  const [foodType, setFoodType] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ key: null, foods: [], count: 0, next: null, page: 0, status: 'loading', error: false })
  const requestRef = useRef(0)
  const morePending = useRef(false)
  const countries = usePublicCountries()
  const key = JSON.stringify([country, foodType, attempt])

  useEffect(() => {
    const request = ++requestRef.current
    morePending.current = false
    loadPublicFoodPage({ page: 1, page_size: 12, country, food_type: foodType }).then((data) => {
      if (request === requestRef.current) setResult({ key, foods: data.results, count: data.count, next: data.next, page: 1, status: 'success', error: false })
    }).catch(() => {
      if (request === requestRef.current) setResult({ key, foods: [], count: 0, next: null, page: 0, status: 'error', error: true })
    })
    return () => { requestRef.current += 1 }
  }, [country, foodType, key])

  const current = result.key === key ? result : { foods: [], status: 'loading' }
  const loadMore = async () => {
    if (!current.next || morePending.current) return
    morePending.current = true
    const request = requestRef.current
    setResult((value) => ({ ...value, status: 'loading-more', error: false }))
    try {
      const page = getNextPage(current.next, current.page)
      const data = await loadPublicFoodPage({ page, page_size: 12, country, food_type: foodType })
      if (request === requestRef.current) {
        setResult((value) => {
          const known = new Map(value.foods.map((food) => [String(food.id || food.slug), food]))
          data.results.forEach((food) => known.set(String(food.id || food.slug), food))
          return { ...value, foods: [...known.values()], count: data.count, next: data.next, page, status: 'success', error: false }
        })
      }
    } catch {
      if (request === requestRef.current) setResult((value) => ({ ...value, status: 'success', error: true }))
    } finally {
      if (request === requestRef.current) morePending.current = false
    }
  }

  return (
    <section className="food-page">
      <header className="explore-heading"><div><p className="eyebrow">PUBLIC FOOD</p><h1>Food</h1></div>{current.count !== undefined && <p className="explore-count" aria-live="polite">{current.foods.length} of {current.count} Food items</p>}</header>
      <div className="food-filters">
        <label>Country<select aria-describedby="food-country-catalog-note" value={country} onChange={(event) => setCountry(event.target.value)}><option value="">All countries</option>{countries.countries.map((item) => <option key={item.id || item.slug} value={item.slug || item.id}>{item.name}</option>)}</select></label>
        <label>Food type<select value={foodType} onChange={(event) => setFoodType(event.target.value)}><option value="">All types</option>{FOOD_TYPES.map((type) => <option key={type} value={type}>{formatActivityLabel(type)}</option>)}</select></label>
      </div>
      <div id="food-country-catalog-note" className="food-relationship-status">
        {countries.status === 'loading' && <p role="status">Loading countries...</p>}
        {countries.next && <><p>More countries are available. Load the next page to expand the filter options.</p><button type="button" className="food-button" onClick={countries.loadMore} disabled={countries.status === 'loading'}>Load more countries</button></>}
      </div>
      {countries.status === 'error' && <p role="alert">Country filters are unavailable. <button className="food-button" onClick={countries.retry}>Retry countries</button></p>}
      {current.status === 'loading' && <p role="status">Loading Food…</p>}
      {current.status === 'error' && <div role="alert"><p>Unable to load Food.</p><button className="food-button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></div>}
      {current.status === 'success' && !current.foods.length && <p role="status">No Food matches these filters.</p>}
      {current.foods.length > 0 && <div className="food-grid">{current.foods.map((food) => <FoodCard key={food.id || food.slug} food={food} countries={countries.countries} />)}</div>}
      {current.next && <div className="food-pagination">{current.error && <p role="alert">Unable to load more Food. Your loaded items are preserved.</p>}<button className="food-button" disabled={current.status === 'loading-more'} onClick={loadMore}>{current.status === 'loading-more' ? 'Loading more…' : current.error ? 'Retry load more' : 'Load more'}</button></div>}
    </section>
  )
}

export default FoodsListPage
