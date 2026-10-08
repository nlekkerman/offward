import { useEffect, useMemo, useState } from 'react'
import { routeMapApi } from '../../services/management/routeMapApi.js'
import { errorMessage } from './imageCollectionUtils.js'
import RelationshipAttachmentManager from './RelationshipAttachmentManager.jsx'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function RouteChildRelationships({ routes, values, onChange, disabled = false, errors = {} }) {
  const [browseRouteId, setBrowseRouteId] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ routeId: '', attempt: -1, waypoints: [], segments: [], error: '' })
  const [known, setKnown] = useState({ waypoints: [], segments: [] })

  useEffect(() => {
    if (!browseRouteId) return undefined
    let active = true
    Promise.allSettled([routeMapApi.getWaypoints(browseRouteId), routeMapApi.getSegments(browseRouteId)]).then(([waypointResult, segmentResult]) => {
      if (!active) return
      const routeLabel = routes.find((route) => String(route.id) === browseRouteId)?.title || browseRouteId
      const waypoints = waypointResult.status === 'fulfilled' ? waypointResult.value.waypoints.filter((item) => UUID.test(item.id)).map((item) => ({ ...item, routeLabel })) : []
      const segments = segmentResult.status === 'fulfilled' ? segmentResult.value.filter((item) => UUID.test(item.id)).map((item) => ({ ...item, routeLabel })) : []
      const failures = [waypointResult, segmentResult].flatMap((response, index) => response.status === 'rejected' ? [`${index === 0 ? 'Waypoints' : 'Segments'}: ${errorMessage(response.reason, 'Unable to load route children.')}`] : [])
      setResult({ routeId: browseRouteId, attempt, waypoints, segments, error: failures.join(' ') })
      setKnown((previous) => {
        const merge = (items, incoming) => [...new Map([...items, ...incoming].map((item) => [String(item.id), item])).values()]
        return { waypoints: merge(previous.waypoints, waypoints), segments: merge(previous.segments, segments) }
      })
    })
    return () => { active = false }
  }, [browseRouteId, attempt, routes])

  const current = result.routeId === browseRouteId && result.attempt === attempt
  const catalogs = useMemo(() => {
    const build = (field, key) => {
      const ids = new Set((values[field] || []).map(String))
      const records = new Map(known[key].filter((item) => ids.has(String(item.id))).map((item) => [String(item.id), item]))
      if (current) result[key].forEach((item) => records.set(String(item.id), item))
      return [...records.values()]
    }
    return { waypoints: build('waypoint_ids', 'waypoints'), segments: build('segment_ids', 'segments') }
  }, [known, result, current, values])

  function manager(field, key, label) {
    const ids = values[field] || []
    const unresolved = ids.filter((id) => !known[key].some((item) => String(item.id) === String(id)))
    return <div>
      <RelationshipAttachmentManager
        title={label}
        attachedIds={ids}
        availableItems={catalogs[key]}
        getLabel={(item) => key === 'waypoints' ? `${item.name || item.label || item.place_name || `Waypoint ${item.order}`} (${item.routeLabel})` : `${item.title || `Segment ${item.order}`} (${item.routeLabel})`}
        onAttach={(id) => { if (UUID.test(id)) onChange(field, [...new Set([...ids, id])]) }}
        onDetach={(id) => onChange(field, ids.filter((value) => String(value) !== String(id)))}
        disabled={disabled}
        emptyText={`No ${label.toLowerCase()} attached.`}
      />
      {errors[field] && <p className="field-error-text" role="alert">{errors[field]}</p>}
      {unresolved.length > 0 && <p role="status">Some selected {label.toLowerCase()} are shown by UUID. Browse their Route to resolve labels; selections remain attached.</p>}
    </div>
  }

  return <section className="food-relationships">
    <div className="form-field"><label htmlFor="relationship-browse-route">Browse saved Route Waypoints and Segments</label><select id="relationship-browse-route" className="form-input" value={browseRouteId} disabled={disabled} onChange={(event) => setBrowseRouteId(event.target.value)}><option value="">Choose a Route to browse</option>{routes.map((route) => <option key={route.id} value={route.id}>{route.title || route.slug || route.id}</option>)}</select><p>This only chooses browsing context; it does not attach or modify the Route.</p></div>
    {browseRouteId && !current && <p role="status">Loading saved Route children...</p>}
    {current && result.error && <p className="management-error" role="alert">{result.error} <button type="button" className="secondary-button small-button" onClick={() => setAttempt((value) => value + 1)} disabled={disabled}>Retry Route children</button></p>}
    {current && !result.error && !result.waypoints.length && !result.segments.length && <p>No saved children on this Route.</p>}
    {manager('waypoint_ids', 'waypoints', 'Waypoints')}
    {manager('segment_ids', 'segments', 'Segments')}
  </section>
}

export default RouteChildRelationships
