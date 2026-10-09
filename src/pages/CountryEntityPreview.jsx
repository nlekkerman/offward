import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPublicPlaces } from '../services/placesApi.js'
import { getPublicRoutes } from '../services/routesApi.js'
import { ExploreCard } from '../features/explore/ExploreResults.jsx'

const PAGE_SIZE = 6

function CountryEntityPreview({ country, mode }) {
  const countryFilter = country.slug || country.id
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ requestKey: '', status: 'loading', items: [] })
  const title = mode === 'routes' ? 'Routes' : 'Places'
  const requestKey = JSON.stringify([countryFilter, mode, attempt])

  useEffect(() => {
    if (!countryFilter) return undefined

    let isCurrent = true
    const fetchPage = mode === 'routes' ? getPublicRoutes : getPublicPlaces

    fetchPage({ country: countryFilter, page: 1, pageSize: PAGE_SIZE }).then(
      (data) => { if (isCurrent) setResult({ requestKey, status: 'success', items: data.results }) },
      () => { if (isCurrent) setResult({ requestKey, status: 'error', items: [] }) },
    )

    return () => { isCurrent = false }
  }, [countryFilter, mode, attempt, requestKey])

  if (!countryFilter) return null

  const current = result.requestKey === requestKey ? result : { status: 'loading', items: [] }
  const query = new URLSearchParams({ view: mode, country: String(countryFilter) })

  return (
    <section className="country-discovery-preview" aria-labelledby={`country-${mode}-heading`}>
      <header className="country-discovery-preview-heading">
        <h2 id={`country-${mode}-heading`}>{title}</h2>
        <Link className="country-discovery-view-all" to={`/explore?${query.toString()}`}>View all {title.toLowerCase()}</Link>
      </header>
      {current.status === 'loading' && <p className="explore-discovery-status" role="status">Loading {title.toLowerCase()}...</p>}
      {current.status === 'error' && <p className="explore-discovery-status" role="alert">Unable to load {title.toLowerCase()}. <button type="button" className="explore-text-action" onClick={() => setAttempt((value) => value + 1)}>Retry</button></p>}
      {current.status === 'success' && current.items.length === 0 && <p className="explore-discovery-status" role="status">No published {title.toLowerCase()} yet.</p>}
      {current.items.length > 0 && (
        <div className="explore-discovery-grid country-discovery-grid" aria-label={`${title} in ${country.name}`}>
          {current.items.map((item) => <ExploreCard key={item.id || item.slug} item={item} mode={mode} countries={[country]} compact showCountry={false} />)}
        </div>
      )}
    </section>
  )
}

export default CountryEntityPreview
