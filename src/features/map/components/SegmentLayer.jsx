import { GeoJSON } from 'react-leaflet'
import { isRenderableRoute } from '../mapGeometry.js'

const SEGMENT_STYLE = {
  color: '#D28A22',
  weight: 5,
  opacity: 0.22,
  lineCap: 'round',
  lineJoin: 'round',
}

const SELECTED_SEGMENT_STYLE = {
  color: '#D28A22',
  weight: 6,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round',
}

function SegmentLayer({ segments, selectedSegmentId, onSegmentSelect }) {
  return segments.map((segment) => {
    if (!isRenderableRoute(segment)) {
      return null
    }

    const selected = segment.id === selectedSegmentId
    return (
      <GeoJSON
        key={`segment-${segment.id}`}
        data={{ type: 'Feature', geometry: segment.geometry, properties: {} }}
        style={selected ? SELECTED_SEGMENT_STYLE : SEGMENT_STYLE}
        eventHandlers={onSegmentSelect ? { click: () => onSegmentSelect(segment.id) } : undefined}
      />
    )
  })
}

export default SegmentLayer