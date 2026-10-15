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
        <h1 id="home-hero-title">Offward</h1>
        <p className="home-hero-pronunciation">/ˈɒf.wəd/</p>
        <p className="home-hero-part-of-speech">adverb</p>
        <div className="home-hero-definition">
          <p className="home-hero-definition-primary">Away from the expected path.</p>
          <p className="home-hero-definition-secondary">
            Toward places, stories and moments you would otherwise miss.
          </p>
        </div>
        <div className="home-hero-actions">
          <Link to="/explore?view=routes" className="primary-button">Explore routes</Link>
          <Link to="/explore?view=places" className="secondary-button">Explore places</Link>
        </div>
      </div>
      <blockquote className="home-hero-tagline">
        <span>Not lost.</span>
        <span>Just Offward.</span>
      </blockquote>
    </section>
  )
}

export default HomePage