import { useId, useState } from 'react'
import { isRenderableRoute } from '../../map/mapGeometry.js'

function getOrderedSegments(segments) {
  if (!Array.isArray(segments)) {
    return []
  }

  return segments
    .filter((segment) => segment && typeof segment === 'object')
    .map((segment, index) => ({
      ...segment,
      order: Number.isFinite(Number(segment.order)) ? Number(segment.order) : index + 1,
      title: typeof segment.title === 'string' ? segment.title.trim() : '',
    }))
    .sort((a, b) => a.order - b.order)
}

function RouteSections({ segments, selectedSegmentId, onSegmentSelect }) {
  const orderedSegments = getOrderedSegments(segments)
  const [isOpen, setIsOpen] = useState(false)
  const listId = useId()

  if (orderedSegments.length === 0) {
    return null
  }

  const handleSelect = (segmentId) => {
    onSegmentSelect(segmentId)
    setIsOpen(false)
  }

  return (
    <div className="route-map-sections-control">
      <button
        type="button"
        className="route-map-sections-trigger"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>Sections</span>
        <strong>{orderedSegments.length}</strong>
        <span aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <ol id={listId} className="route-map-sections-list">
          {orderedSegments.map((segment) => {
            const available = typeof segment.id === 'string' && isRenderableRoute(segment)
            const selected = segment.id === selectedSegmentId
            const title = segment.title || 'Untitled section'
            return (
              <li key={segment.id || `${segment.order}-${title}`}>
                <button
                  type="button"
                  className={selected ? 'route-map-section-row is-selected' : 'route-map-section-row'}
                  disabled={!available}
                  aria-pressed={selected}
                  aria-label={`Section ${segment.order}: ${title}`}
                  onClick={() => handleSelect(segment.id)}
                >
                  <span>Section {segment.order}</span>
                  <strong>{title}</strong>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

export default RouteSections