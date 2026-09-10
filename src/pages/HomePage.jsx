import { Link } from 'react-router-dom'
import { getCountries } from '../services/countriesApi.js'

function HomePage() {
  const countries = getCountries()

  return (
    <section className="page-placeholder">
      <p className="eyebrow">OFFWARD</p>
      <h1>Explore by country</h1>
      <ul>
        {countries.map((country) => (
          <li key={country.id}>
            <Link to={`/countries/${country.slug}`}>{country.name}</Link>
            {' '}({country.status})
          </li>
        ))}
      </ul>
    </section>
  )
}

export default HomePage