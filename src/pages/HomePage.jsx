import { Link } from 'react-router-dom'
import heroImage from '../assets/images/home/off-hero.webp'
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
    <section className="home-hero" aria-labelledby="home-hero-title">
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
        <h1 id="home-hero-title"><span>Not lost.</span> <span>Just Offward.</span></h1>
        <div className="home-hero-actions">
          <Link to="/explore?view=routes" className="primary-button">Explore routes</Link>
          <Link to="/explore?view=places" className="secondary-button">Explore places</Link>
        </div>
      </div>
    </section>
  )
}

export default HomePage