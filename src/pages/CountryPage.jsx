import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import NotFoundPage from './NotFoundPage.jsx'
import { getCountryBySlug } from '../services/countriesApi.js'
import CountryFlag from '../shared/components/CountryFlag.jsx'
import CountryFood from '../features/food/CountryFood.jsx'
import CountryEntityPreview from './CountryEntityPreview.jsx'
import '../features/explore/explore.css'

function CountryPage() {
  const { countrySlug } = useParams()
  const [country, setCountry] = useState(undefined)
  const [error, setError] = useState(false)

  useEffect(() => {
    let isCurrent = true

    async function loadCountry() {
      setCountry(undefined)
      setError(false)

      try {
        const data = await getCountryBySlug(countrySlug)
        if (isCurrent) {
          setCountry(data)
        }
      } catch {
        if (isCurrent) {
          setError(true)
        }
      }
    }

    loadCountry()

    return () => {
      isCurrent = false
    }
  }, [countrySlug])

  if (error) {
    return <section className="explore-page">Unable to load this country.</section>
  }

  if (country === undefined) {
    return <section className="explore-page">Loading country...</section>
  }

  if (!country) {
    return <NotFoundPage />
  }

  return (
    <section className="explore-page explore-discovery country-page">
      <div className="country-detail-identity">
        <CountryFlag code={country.code} countryName={country.name} size="medium" />
        <div>
          <p className="eyebrow">{country.code}</p>
          <h1>{country.name}</h1>
        </div>
      </div>
      {country.summary && <p className="country-page-summary">{country.summary}</p>}
      {country.body && <p className="country-page-body">{country.body}</p>}
      <CountryEntityPreview country={country} mode="routes" />
      <CountryEntityPreview country={country} mode="places" />
      <CountryFood country={country} />
    </section>
  )
}

export default CountryPage