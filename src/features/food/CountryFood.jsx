import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPublicFoods } from '../../services/foodsApi.js'
import FoodCard from './FoodCard.jsx'

const PAGE_SIZE = 6

function CountryFood({ country }) {
  const countryFilter = country.slug || country.id
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ countryFilter: '', foods: [], status: 'loading', error: '' })

  useEffect(() => {
    let isCurrent = true
    if (!countryFilter) {
      setResult({ countryFilter: '', foods: [], status: 'success', error: '' })
      return () => { isCurrent = false }
    }

    setResult({ countryFilter, foods: [], status: 'loading', error: '' })
    getPublicFoods({ page: 1, page_size: PAGE_SIZE, country: countryFilter }).then((data) => {
      if (isCurrent) setResult({ countryFilter, foods: data.results, status: 'success', error: '' })
    }).catch((error) => {
      if (isCurrent) setResult({ countryFilter, foods: [], status: 'error', error: error?.message || 'Unable to load Food for this Country.' })
    })
    return () => { isCurrent = false }
  }, [countryFilter, attempt])

  const current = result.countryFilter === countryFilter ? result : { foods: [], status: 'loading' }
  const foodUrl = countryFilter ? `/food?country=${encodeURIComponent(countryFilter)}` : null

  return (
    <section className="related-food" aria-label={`Food from ${country.name}`}>
      <div className="country-discovery-preview-heading"><h2>Food from {country.name}</h2>{foodUrl && <Link className="country-discovery-view-all" to={foodUrl}>View all Food</Link>}</div>
      {current.status === 'loading' && <p role="status">Loading Country Food…</p>}
      {current.status === 'error' && <div role="alert"><p>{current.error}</p><button className="food-button" type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></div>}
      {current.status === 'success' && !current.foods.length && <p role="status">No Food is listed for this Country.</p>}
      {current.foods.length > 0 && <div className="food-grid food-grid-compact">{current.foods.map((food) => <FoodCard key={food.id || food.slug} food={food} compact showCountry={false} />)}</div>}
    </section>
  )
}

export default CountryFood
