import { Link } from 'react-router-dom'

function EntityRouteContext({ route, routeSlug, childLabel, childTitle, childSubtitle }) {
  if (!route) {
    return null
  }

  return (
    <div className="route-detail-context" style={{ marginBottom: '2rem', display: 'grid', gap: '0.75rem' }}>
      <Link className="route-detail-back" to={`/routes/${encodeURIComponent(routeSlug)}`}>
        ← Back to Route
      </Link>
      <div style={{ display: 'grid', gap: '0.35rem', border: '1px solid #30362f', borderRadius: '0.75rem', background: '#171b18', padding: '1rem 1.1rem' }}>
        <p className="eyebrow">{childLabel}</p>
        <h2 style={{ margin: 0, color: '#f3efe6', fontSize: '1.6rem', fontWeight: 400 }}>{childTitle}</h2>
        {childSubtitle && <p style={{ margin: 0, color: '#aaa99e' }}>{childSubtitle}</p>}
        <Link to={`/routes/${encodeURIComponent(routeSlug)}`} style={{ color: '#d8b47c', textDecoration: 'none' }}>
          {route.title}
        </Link>
      </div>
    </div>
  )
}

export default EntityRouteContext
