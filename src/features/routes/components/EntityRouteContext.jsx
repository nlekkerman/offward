import { Link } from 'react-router-dom'

function EntityRouteContext({ route, routeSlug, childLabel, childSubtitle }) {
  if (!route) {
    return null
  }

  return (
    <div className="route-detail-context">
      <Link className="route-detail-back" to={`/routes/${encodeURIComponent(routeSlug)}`}>
        ← Back to Route
      </Link>
      <div className="route-detail-context-card">
        <div className="route-detail-context-copy">
          <p className="eyebrow">Route context</p>
          <Link className="route-detail-context-route" to={`/routes/${encodeURIComponent(routeSlug)}`}>
            {route.title}
          </Link>
          {childSubtitle && <p className="route-detail-context-subtitle">{childSubtitle}</p>}
        </div>
        <span className="route-detail-context-type">{childLabel}</span>
      </div>
    </div>
  )
}

export default EntityRouteContext
