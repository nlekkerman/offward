import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCountries } from '../services/countriesApi.js'

function HomePage() {
  const [countries, setCountries] = useState([])
  const [error, setError] = useState(false)

  useEffect(() => {
    let isCurrent = true

    async function loadCountries() {
      try {
        const data = await getCountries()
        if (isCurrent) {
          setCountries(data)
        }
      } catch {
        if (isCurrent) {
          setError(true)
        }
      }
    }

    loadCountries()

    return () => {
      isCurrent = false
    }
  }, [])

  if (error) {
    return <section className="page-placeholder">Unable to load countries.</section>
  }

  if (!countries.length) {
    return <section className="page-placeholder">Loading countries...</section>
  }

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