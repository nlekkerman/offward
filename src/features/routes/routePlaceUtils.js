export function getRoutePlaceIds(waypoints) {
  const seen = new Set()
  const placeIds = []

  for (const waypoint of Array.isArray(waypoints) ? waypoints : []) {
    const value = waypoint?.place_id
    if ((typeof value !== 'string' && typeof value !== 'number') || !String(value).trim()) {
      continue
    }

    const placeId = String(value)
    if (!seen.has(placeId)) {
      seen.add(placeId)
      placeIds.push(placeId)
    }
  }

  return placeIds
}
