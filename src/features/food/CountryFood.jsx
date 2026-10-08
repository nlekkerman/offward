import { useEffect, useRef, useState } from 'react'
import { getPublicFoods } from '../../services/foodsApi.js'
import FoodCard from './FoodCard.jsx'
import usePublicCountries from './usePublicCountries.js'
import { getNextPage } from './publicFoodCache.js'

function CountryFood({ country }) {
  const countryFilter = country.slug || country.id
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ countryFilter: '', page: 0, foods: [], next: null, status: 'loading', error: '' })
  const request = useRef(0)
  const loadingMore = useRef(false)
  const { countries } = usePublicCountries()

  useEffect(() => {
    const generation = ++request.current
    loadingMore.current = false
    setResult({ countryFilter, page: 0, foods: [], next: null, status: 'loading', error: '' })
    getPublicFoods({ page: 1, page_size: 12, country: countryFilter }).then((data) => {
      if (request.current === generation) {
        setResult({ countryFilter, page: 1, foods: data.results, next: data.next, status: 'success', error: '' })
      }
    }).catch((error) => {
      if (request.current === generation) {
        setResult({ countryFilter, page: 0, foods: [], next: null, status: 'error', error: error?.message || 'Unable to load Food for this Country.' })
      }
    })
    return () => { request.current += 1 }
  }, [countryFilter, attempt])

  const current = result.countryFilter === countryFilter ? result : { foods: [], status: 'loading' }

  const loadMore = async () => {
    if (!current.next || loadingMore.current) return
    loadingMore.current = true
    const generation = request.current
    setResult((value) => ({ ...value, status: 'loading-more', error: '' }))
    try {
      const page = getNextPage(current.next, current.page)
      const data = await getPublicFoods({ page, page_size: 12, country: countryFilter })
      if (request.current === generation) {
        setResult((value) => {
          const records = new Map(value.foods.map((food) => [String(food.id || food.slug), food]))
          data.results.forEach((food) => records.set(String(food.id || food.slug), food))
          return { ...value, page, foods: [...records.values()], next: data.next, status: 'success', error: '' }
        })
      }
    } catch (error) {
      if (request.current === generation) setResult((value) => ({ ...value, status: 'success', error: error?.message || 'Unable to load more Food.' }))
    } finally {
      if (request.current === generation) loadingMore.current = false
    }
  }

  return (
    <section className="related-food" aria-label={`Food from ${country.name}`}>
      <p className="eyebrow">COUNTRY FOOD</p>
      <h2>Food from {country.name}</h2>
      {current.status === 'loading' && <p role="status">Loading Country Food…</p>}
      {current.status === 'error' && <div role="alert"><p>{current.error}</p><button className="food-button" type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></div>}
      {current.status === 'success' && !current.foods.length && <p role="status">No Food is listed for this Country.</p>}
      {current.foods.length > 0 && <div className="food-grid food-grid-compact">{current.foods.map((food) => <FoodCard key={food.id || food.slug} food={food} countries={[country, ...countries]} compact />)}</div>}
      {current.error && current.status === 'success' && <p role="alert">Unable to load more Food: {current.error}</p>}
      {current.next && <button className="food-button" type="button" disabled={current.status === 'loading-more'} onClick={loadMore}>{current.status === 'loading-more' ? 'Loading more…' : current.error ? 'Retry load more' : 'Load more Food'}</button>}
    </section>
  )
}

export default CountryFood
