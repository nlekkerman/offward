import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCountries } from '../services/countriesApi.js'
import heroImage from '../assets/images/home/off-hero.webp'

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
    return (
      <>
        <HomeHero />
        <section className="page-placeholder">Unable to load countries.</section>
      </>
    )
  }

  if (!countries.length) {
    return (
      <>
        <HomeHero />
        <section className="page-placeholder">Loading countries...</section>
      </>
    )
  }

  return (
    <>
      <HomeHero />
      <section className="page-placeholder">
        <h2>Explore by country</h2>
        <ul>
          {countries.map((country) => (
            <li key={country.id}>
              <Link to={`/countries/${country.slug}`}>{country.name}</Link>
              {' '}({country.status})
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function HomeHero() {
  return (
    <section className="home-hero">
      <img
        className="home-hero-image"
        src={heroImage}
        alt=""
        loading="eager"
        fetchPriority="high"
        aria-hidden="true"
      />
      <div className="home-hero-content">
        <p className="eyebrow">OFFWARD</p>
        <h1>Routes, places and stories from the road.</h1>
        <div className="home-hero-actions">
          <Link to="/explore?view=routes" className="primary-button">Explore routes</Link>
          <Link to="/explore?view=places" className="secondary-button">Explore places</Link>
        </div>
      </div>
    </section>
  )
}

export default HomePage