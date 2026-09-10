import { Link } from 'react-router-dom'
import { getCountries } from '../services/countriesApi.js'

function ExplorePage() {
  const countries = getCountries()

  return (
    <section className="page-placeholder">
      <p className="eyebrow">COUNTRIES</p>
      <h1>Explore</h1>
      <ul>
        {countries.map((country) => (
          <li key={country.id}>
            <Link to={`/countries/${country.slug}`}>{country.name}</Link>
            {' '}<span>{country.code} · {country.status}</span>
            <p>{country.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ExplorePage