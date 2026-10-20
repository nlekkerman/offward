import heroImage from '../assets/images/home/topographic-mountain.webp'
import LatestContentRail from '../features/home/LatestContentRail.jsx'

function HomePage() {
  return (
    <div className="home-hero">
      <img
        className="home-hero-image"
        src={heroImage}
        alt=""
        loading="eager"
        fetchPriority="high"
        aria-hidden="true"
      />
      <div className="home-hero-content">
        <LatestContentRail />
      </div>
    </div>
  )
}

export default HomePage