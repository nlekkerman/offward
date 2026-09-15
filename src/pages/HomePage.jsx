import { Link } from 'react-router-dom'
import heroImage from '../assets/images/home/off-hero.webp'
import LatestStoryFeature from '../features/stories/LatestStoryFeature.jsx'

function HomePage() {
  return (
    <>
      <HomeHero />
      <section className="home-main">
        <LatestStoryFeature />
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