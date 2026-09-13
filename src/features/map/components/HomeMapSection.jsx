import MapView from './MapView.jsx'

function HomeMapSection() {
  return (
    <section className="home-map-section">
      <p className="eyebrow">MAP</p>
      <h2>Explore the map</h2>
      <p className="home-map-description">
        Routes, places and stories will appear here as Offward grows.
      </p>
      <MapView initialCenter={[50.0, 10.0]} initialZoom={4} />
    </section>
  )
}

export default HomeMapSection
