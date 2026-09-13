function RouteGeometryLegend() {
  return (
    <div className="route-geometry-legend" aria-label="Route map legend">
      <span><i className="legend-line accepted" />Accepted geometry</span>
      <span><i className="legend-line candidate" />Candidate</span>
      <span><i className="legend-point" />Waypoint</span>
    </div>
  )
}

export default RouteGeometryLegend
