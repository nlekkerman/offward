import { useParams } from 'react-router-dom'
import NotFoundPage from './NotFoundPage.jsx'
import { getCountryBySlug } from '../services/countriesApi.js'

function CountryPage() {
  const { countrySlug } = useParams()
  const country = getCountryBySlug(countrySlug)

  if (!country) {
    return <NotFoundPage />
  }

  return (
    <section className="page-placeholder">
      <p className="eyebrow">{country.code}</p>
      <h1>{country.name}</h1>
      <p>{country.summary}</p>
      <p>Status: {country.status}</p>
    </section>
  )
}

export default CountryPage