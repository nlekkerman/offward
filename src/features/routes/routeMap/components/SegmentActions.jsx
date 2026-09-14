function SegmentActions({ saving, disabled, dirty, onSave }) {
  return (
    <div className="route-map-actions segment-actions" aria-label="Segment actions">
      <button type="button" className="primary-button" onClick={onSave} disabled={disabled || saving}>
        {saving ? 'Saving...' : dirty ? 'Save Segments' : 'Segments saved'}
      </button>
    </div>
  )
}

export default SegmentActions
