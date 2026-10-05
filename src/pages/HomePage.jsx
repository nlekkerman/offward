import { Link } from 'react-router-dom'
import heroImage from '../assets/images/home/off-hero.webp'
import arrowLogo from '../assets/images/home/arrow-logo.webp'
import LatestContentRail from '../features/home/LatestContentRail.jsx'

function HomePage() {
  return (
    <>
      <HomeHero />
      <LatestContentRail />
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
        <div className="home-hero-heading-row">
          <h1>Not lost. Just Offward.</h1>
          <img className="home-hero-logo" src={arrowLogo} alt="" aria-hidden="true" />
        </div>
        <div className="home-hero-actions">
          <Link to="/explore?view=routes" className="primary-button">Explore routes</Link>
          <Link to="/explore?view=places" className="secondary-button">Explore places</Link>
        </div>
      </div>
    </section>
  )
}

export default HomePage