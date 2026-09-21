import { useEffect, useMemo, useState } from 'react'
import ContentVideoManager from '../../../video/ContentVideoManager.jsx'
import GalleryAttachmentManager from '../../../management/GalleryAttachmentManager.jsx'
import { managementApis } from '../../../../services/management/index.js'
import { getWaypointDisplayName } from '../routeMapUtils.js'

function getWaypointLabel(waypoint) {
  if (!waypoint) return 'Select a saved Waypoint'
  return `${waypoint.order} · ${waypoint.type === 'start' ? 'Start' : waypoint.type === 'finish' ? 'Finish' : 'Via'} · ${getWaypointDisplayName(waypoint)}`
}

function SegmentEditor({ segment, routeId, waypoints, validation, canRegenerate, onChange, onRegenerate, onSave, saving = false }) {
  const [stories, setStories] = useState([])
  const [storiesStatus, setStoriesStatus] = useState('loading')
  const [storySearch, setStorySearch] = useState('')

  useEffect(() => {
    let active = true

    async function loadStories() {
      try {
        const records = await managementApis.stories.list()
        if (active) {
          setStories(records)
          setStoriesStatus('success')
        }
      } catch {
        if (active) {
          setStoriesStatus('error')
        }
      }
    }

    loadStories()
    return () => {
      active = false
    }
  }, [])

  const selectedStoryIds = Array.isArray(segment?.story_ids) ? segment.story_ids : []
  const filteredStories = useMemo(() => {
    const query = storySearch.trim().toLowerCase()
    if (!query) return stories
    return stories.filter((story) => [story.title, story.name, story.slug].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)))
  }, [stories, storySearch])

  if (!segment) {
    return (
      <section className="route-map-panel">
        <p className="eyebrow">Segment editor</p>
        <div className="management-empty route-map-empty">Select or add a Segment to edit its details.</div>
      </section>
    )
  }

  const isNewSegment = String(segment.id).startsWith('new-')
  const update = (name, value) => onChange({ ...segment, [name]: value })
  const startWaypoint = waypoints.find((waypoint) => waypoint.id === segment.start_waypoint_id)
  const endWaypoint = waypoints.find((waypoint) => waypoint.id === segment.end_waypoint_id)
  const toggleStory = (storyId, checked) => {
    const nextIds = checked
      ? [...selectedStoryIds, storyId].filter((value, index, values) => values.findIndex((item) => String(item) === String(value)) === index)
      : selectedStoryIds.filter((value) => String(value) !== String(storyId))
    update('story_ids', nextIds)
  }

  return (
    <section className="route-map-panel">
      <div className="route-map-panel-header">
        <div>
          <p className="eyebrow">Segment editor</p>
          <h2>{isNewSegment ? 'New Segment' : `Editing Segment ${segment.order}`}</h2>
        </div>
        {segment.needs_review && <span className="segment-review-badge">Needs geometry review</span>}
      </div>
      {segment.needs_review && <p className="route-map-muted">Accepted Route geometry changed after this Segment geometry was saved.</p>}
      <div className="route-map-form-grid">
        <div className="form-field route-map-wide-field">
          <label htmlFor="segment-title">Title</label>
          <input id="segment-title" value={segment.title} onChange={(event) => update('title', event.target.value)} className="form-input" />
        </div>
        <div className="form-field route-map-wide-field">
          <label htmlFor="segment-summary">Summary</label>
          <textarea id="segment-summary" value={segment.summary} onChange={(event) => update('summary', event.target.value)} className="form-input" rows="3" />
        </div>
        <div className="form-field">
          <label htmlFor="segment-start">Start Waypoint</label>
          <select id="segment-start" value={segment.start_waypoint_id} onChange={(event) => update('start_waypoint_id', event.target.value)} className="form-input">
            <option value="">Select start</option>
            {waypoints.map((waypoint) => <option key={waypoint.id} value={waypoint.id}>{getWaypointLabel(waypoint)}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="segment-end">End Waypoint</label>
          <select id="segment-end" value={segment.end_waypoint_id} onChange={(event) => update('end_waypoint_id', event.target.value)} className="form-input">
            <option value="">Select end</option>
            {waypoints.map((waypoint) => <option key={waypoint.id} value={waypoint.id}>{getWaypointLabel(waypoint)}</option>)}
          </select>
        </div>
        <div className="form-field route-map-wide-field">
          <label htmlFor="segment-story-search">Stories</label>
          {storiesStatus === 'loading' && <p className="route-map-muted">Loading Stories...</p>}
          {storiesStatus === 'error' && <p className="field-error-text">Unable to load Stories. Segment editing remains available.</p>}
          {storiesStatus === 'success' && (
            <>
              <input
                id="segment-story-search"
                type="search"
                value={storySearch}
                onChange={(event) => setStorySearch(event.target.value)}
                className="form-input"
                placeholder="Search Stories"
              />
              <div className="checkbox-list segment-story-list">
                {filteredStories.length > 0 ? filteredStories.map((story) => (
                  <label key={story.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedStoryIds.some((value) => String(value) === String(story.id))}
                      onChange={(event) => toggleStory(story.id, event.target.checked)}
                    />
                    <span>{story.title || story.name || story.slug || story.id}</span>
                  </label>
                )) : <p className="route-map-muted">No Stories match this search.</p>}
              </div>
            </>
          )}
        </div>
      </div>
      {!validation.valid && <p className="field-error-text segment-validation-message">{validation.message}</p>}
      <div className="segment-editor-actions">
        <button type="button" className="secondary-button small-button" onClick={onRegenerate} disabled={!canRegenerate}>Regenerate geometry from accepted Route</button>
      </div>
      {startWaypoint && endWaypoint && validation.valid && <p className="route-map-muted">Geometry follows the accepted Route between the selected boundaries.</p>}
      <div className="route-map-edit-actions">
        <button type="button" className="secondary-button small-button" onClick={() => onChange({ ...segment, id: segment.id })}>Cancel</button>
        <button type="button" className="primary-button small-button" onClick={onSave} disabled={saving}>
          {saving ? (isNewSegment ? 'Adding Segment...' : 'Saving Segment...') : isNewSegment ? 'Add Segment' : 'Save Segment'}
        </button>
      </div>
      <ContentVideoManager
        resourceKey="segment"
        resourceId={segment.id}
        routeId={routeId}
        segmentId={segment.id}
        attachedVideoIds={segment.media_ids || []}
        onAttachmentsChange={(nextIds) => onChange({ ...segment, media_ids: nextIds })}
      />
      <GalleryAttachmentManager
        ownerType="RouteSegment"
        ownerId={segment.id}
        attachedCollectionIds={segment.image_collection_ids || []}
        onAttach={(collection) => onChange({ ...segment, image_collection_ids: [...(segment.image_collection_ids || []), collection.id] })}
        onDetach={(collection) => onChange({ ...segment, image_collection_ids: (segment.image_collection_ids || []).filter((value) => String(value) !== String(collection.id)) })}
      />
    </section>
  )
}

export default SegmentEditor
