function RouteGeometryLegend() {
  return (
    <div className="route-geometry-legend" aria-label="Route map legend">
      <span><i className="legend-line calculated" />Calculated</span>
      <span><i className="legend-line manual" />Manual</span>
      <span><i className="legend-line straight" />Straight</span>
      <span><i className="legend-line unresolved" />Unresolved</span>
      <span><i className="legend-line selected" />Selected / preview</span>
      <span><i className="legend-point" />Waypoint</span>
    </div>
  )
}

export default RouteGeometryLegend
