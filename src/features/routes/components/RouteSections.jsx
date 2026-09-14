function getMeaningfulSegments(segments) {
  if (!Array.isArray(segments)) {
    return []
  }

  return segments
    .filter((segment) => segment && typeof segment === 'object')
    .map((segment, index) => ({
      ...segment,
      order: Number.isFinite(Number(segment.order)) ? Number(segment.order) : index + 1,
      title: typeof segment.title === 'string' ? segment.title.trim() : '',
      summary: typeof segment.summary === 'string' ? segment.summary.trim() : '',
    }))
    .filter((segment) => segment.title || segment.summary)
    .sort((a, b) => a.order - b.order)
}

function RouteSections({ segments }) {
  const meaningfulSegments = getMeaningfulSegments(segments)

  if (meaningfulSegments.length === 0) {
    return null
  }

  return (
    <section className="route-detail-panel route-sections-panel" aria-labelledby="route-sections-title">
      <p className="eyebrow">SECTIONS</p>
      <h2 id="route-sections-title">Route sections</h2>
      <ol className="route-sections-list">
        {meaningfulSegments.map((segment) => (
          <li key={segment.id || `${segment.order}-${segment.title || segment.summary}`}>
            <span className="route-section-order">Section {segment.order}</span>
            {segment.title && <h3>{segment.title}</h3>}
            {segment.summary && <p>{segment.summary}</p>}
          </li>
        ))}
      </ol>
    </section>
  )
}

export default RouteSections