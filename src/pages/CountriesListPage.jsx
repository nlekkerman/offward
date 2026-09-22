import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCountries } from '../services/countriesApi.js'
import CountryFlag from '../shared/components/CountryFlag.jsx'

function CountriesListPage() {
  const [status, setStatus] = useState('loading')
  const [countries, setCountries] = useState([])

  useEffect(() => {
    let isCurrent = true

    async function loadCountries() {
      try {
        const data = await getCountries()
        if (isCurrent) {
          setCountries(data)
          setStatus('success')
        }
      } catch {
        if (isCurrent) {
          setStatus('error')
        }
      }
    }

    loadCountries()

    return () => {
      isCurrent = false
    }
  }, [])

  return (
    <section className="explore-page">
      <div className="explore-heading">
        <div>
          <p className="eyebrow">PUBLIC COUNTRIES</p>
          <h1>Countries</h1>
        </div>
        {status === 'success' && (
          <p className="explore-count" aria-live="polite">
            {countries.length} {countries.length === 1 ? 'country' : 'countries'}
          </p>
        )}
      </div>

      {status === 'loading' && <p className="explore-status" role="status">Loading countries...</p>}
      {status === 'error' && <p className="explore-status" role="status">Unable to load countries.</p>}
      {status === 'success' && countries.length === 0 && (
        <p className="explore-status" role="status">No countries are published yet.</p>
      )}

      {countries.length > 0 && (
        <div className="explore-route-list" aria-label="Countries">
          {countries.map((country) => (
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
    </section>
  )
}

export default CountriesListPage
