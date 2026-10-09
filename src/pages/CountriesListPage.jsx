import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPublicCountriesPage } from '../services/countriesApi.js'
import CountryFlag from '../shared/components/CountryFlag.jsx'

function CountriesListPage() {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ status: 'loading', countries: [], count: 0, next: null, page: 0, moreError: false })
  const morePending = useRef(false)

  useEffect(() => {
    let isCurrent = true

    async function loadCountries() {
      setResult({ status: 'loading', countries: [], count: 0, next: null, page: 0, moreError: false })
      morePending.current = false
      try {
        const data = await getPublicCountriesPage({ page: 1 })
        if (isCurrent) {
          setResult({ status: 'success', countries: data.results, count: data.count, next: data.next, page: 1, moreError: false })
        }
      } catch {
        if (isCurrent) {
          setResult((value) => ({ ...value, status: 'error' }))
        }
      }
    }

    loadCountries()

    return () => {
      isCurrent = false
    }
  }, [attempt])

  const loadMore = async () => {
    if (!result.next || morePending.current) return
    morePending.current = true
    setResult((value) => ({ ...value, status: 'loading-more', moreError: false }))
    try {
      const page = result.page + 1
      const data = await getPublicCountriesPage({ page })
      setResult((value) => {
        const records = new Map(value.countries.map((country) => [String(country.id || country.slug), country]))
        data.results.forEach((country) => records.set(String(country.id || country.slug), country))
        return { status: 'success', countries: [...records.values()], count: data.count, next: data.next, page, moreError: false }
      })
    } catch {
      setResult((value) => ({ ...value, status: 'success', moreError: true }))
    } finally {
      morePending.current = false
    }
  }

  return (
    <section className="explore-page">
      <div className="explore-heading">
        <div>
          <p className="eyebrow">PUBLIC COUNTRIES</p>
          <h1>Countries</h1>
        </div>
        {result.status !== 'loading' && result.status !== 'error' && (
          <p className="explore-count" aria-live="polite">
            Showing {result.countries.length} of {result.count} countries
          </p>
        )}
      </div>

      {result.status === 'loading' && <p className="explore-status" role="status">Loading countries...</p>}
      {result.status === 'error' && <div className="explore-status" role="alert"><p>Unable to load countries.</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></div>}
      {result.status === 'success' && result.countries.length === 0 && (
        <p className="explore-status" role="status">No countries are published yet.</p>
      )}

      {result.countries.length > 0 && (
        <div className="explore-route-list" aria-label="Countries">
          {result.countries.map((country) => (
            <Link key={country.id || country.slug} to={`/countries/${country.slug}`} className="explore-route-item">
              <span className="country-card-identity">
                <CountryFlag code={country.code} countryName={country.name} size="medium" />
                <span>
                  <strong>{country.name}</strong>
                  {country.code && <small>{country.code.toUpperCase()}</small>}
                </span>
              </span>
              {country.summary && <span>{country.summary}</span>}
            </Link>
          ))}
        </div>
      )}
      {result.moreError && <p className="explore-status" role="alert">Unable to load more countries. Your loaded countries are preserved.</p>}
      {result.next && <button type="button" className="food-button" disabled={result.status === 'loading-more'} onClick={loadMore}>{result.status === 'loading-more' ? 'Loading more countries…' : result.moreError ? 'Retry loading more countries' : 'Load more countries'}</button>}
    </section>
  )
}

export default CountriesListPage
