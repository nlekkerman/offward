import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import NotFoundPage from './NotFoundPage.jsx'
import { getCountryBySlug } from '../services/countriesApi.js'
import CountryFlag from '../shared/components/CountryFlag.jsx'
import CountryFood from '../features/food/CountryFood.jsx'
import CountryEntityPreview from './CountryEntityPreview.jsx'
import '../features/explore/explore.css'
import PageMetadata from '../shared/components/PageMetadata.jsx'
import { getContentDescription } from '../shared/utils/publicUrls.js'
import usePublicDetailPageView from '../shared/hooks/usePublicDetailPageView.js'

function getCountryTitle(country, slug) {
  return country.name || slug.replace(/[-_]+/g, ' ')
}

function CountryPage() {
  const { countrySlug } = useParams()
  const [country, setCountry] = useState(undefined)
  const [error, setError] = useState(false)
  const [loadedCountrySlug, setLoadedCountrySlug] = useState(null)

  useEffect(() => {
    let isCurrent = true

    async function loadCountry() {
      setCountry(undefined)
      setError(false)

      try {
        const data = await getCountryBySlug(countrySlug)
        if (isCurrent) {
          setCountry(data)
          setLoadedCountrySlug(countrySlug)
        }
      } catch {
        if (isCurrent) {
          setError(true)
          setLoadedCountrySlug(countrySlug)
        }
      }
    }

    loadCountry()

    return () => {
      isCurrent = false
    }
  }, [countrySlug])

  const countryStatus = loadedCountrySlug !== countrySlug
    ? 'loading'
    : error
      ? 'error'
      : country
        ? 'success'
        : 'not-found'
  usePublicDetailPageView(countryStatus, null)

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
      <PageMetadata
        title={getCountryTitle(country, countrySlug)}
        description={getContentDescription(country.summary, getCountryTitle(country, countrySlug))}
        path={`/countries/${encodeURIComponent(countrySlug)}`}
        noImage
      />
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