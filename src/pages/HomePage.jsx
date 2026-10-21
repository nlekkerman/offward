import LatestContentRail from '../features/home/LatestContentRail.jsx'
import '../shared/layout/HomePage.css'

function HomePage() {
  return (
    <div className="home-hero">
      <div className="home-hero-content">
        <LatestContentRail />
      </div>
    </div>
  )
}

export default HomePage