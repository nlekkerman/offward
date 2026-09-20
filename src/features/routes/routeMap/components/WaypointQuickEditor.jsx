import { useState } from 'react'

function WaypointQuickEditor({ waypoint, saving = false, onSave, onCancel }) {
  const [name, setName] = useState(waypoint?.name || '')

  if (!waypoint) {
    return null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const saved = await onSave(name)
    if (saved !== false) {
      onCancel()
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <form className="waypoint-quick-editor" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <label htmlFor={`quick-waypoint-name-${waypoint.id}`}>Name</label>
      <input
        id={`quick-waypoint-name-${waypoint.id}`}
        type="text"
        value={name}
        maxLength={180}
        onChange={(event) => setName(event.target.value)}
        className="form-input"
        autoFocus
      />
      <div className="waypoint-quick-actions">
        <button type="submit" className="primary-button small-button" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        <button type="button" className="secondary-button small-button" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  )
}

export default WaypointQuickEditor
