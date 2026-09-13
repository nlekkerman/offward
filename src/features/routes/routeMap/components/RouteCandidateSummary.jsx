function formatDistance(meters) {
  const value = Number(meters)
  if (!Number.isFinite(value) || value <= 0) {
    return '—'
  }
  return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`
}

function formatDuration(seconds) {
  const value = Number(seconds)
  if (!Number.isFinite(value) || value <= 0) {
    return '—'
  }
  const hours = Math.floor(value / 3600)
  const minutes = Math.round((value % 3600) / 60)
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}

function geometryPointCount(geometry) {
  return Array.isArray(geometry?.coordinates) ? geometry.coordinates.length : 0
}

function RouteCandidateSummary({ acceptedGeometry, candidate, mapRevision, updatedAt }) {
  const candidateGeometry = candidate?.geometry

  return (
    <section className="route-map-panel route-map-summary-panel">
      <div>
        <p className="eyebrow">Map revision</p>
        <h2>{mapRevision || 'Unversioned draft'}</h2>
        {updatedAt && <p className="route-map-muted">Updated {updatedAt}</p>}
      </div>

      <div className="route-map-summary-grid">
        <div>
          <span>Accepted points</span>
          <strong>{geometryPointCount(acceptedGeometry)}</strong>
        </div>
        <div>
          <span>Candidate points</span>
          <strong>{geometryPointCount(candidateGeometry)}</strong>
        </div>
        <div>
          <span>Candidate distance</span>
          <strong>{formatDistance(candidate?.distance_meters || candidate?.distanceMeters || candidate?.distance)}</strong>
        </div>
        <div>
          <span>Candidate time</span>
          <strong>{formatDuration(candidate?.duration_seconds || candidate?.durationSeconds || candidate?.duration)}</strong>
        </div>
      </div>
    </section>
  )
}

export default RouteCandidateSummary
