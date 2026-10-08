export function publicRelationshipIds(value) {
  return Array.isArray(value) ? [...new Set(value.filter(Boolean).map(String))] : []
}

export function getRouteFoodIds(route) {
  const waypoints = Array.isArray(route?.waypoints) ? route.waypoints : []
  const segments = Array.isArray(route?.segments) ? route.segments : []
  return publicRelationshipIds([
    ...publicRelationshipIds(route?.food_ids),
    ...waypoints.flatMap((waypoint) => publicRelationshipIds(waypoint?.food_ids)),
    ...segments.flatMap((segment) => publicRelationshipIds(segment?.food_ids)),
  ])
}

export function resolvePublicFoodIds(ids, records) {
  const wanted = publicRelationshipIds(ids)
  const foods = wanted.map((id) => records.get(id)).filter((food) => food?.slug)
  const resolved = new Set(foods.map((food) => String(food.id)))
  return { foods, unresolved: wanted.filter((id) => !resolved.has(id)) }
}

export function nextRouteContextBatch(records, checked) {
  return records.filter((route) => route?.id && route.slug && !checked.has(String(route.id))).slice(0, 4)
}

export function resolvePublicRouteChildren(contexts, waypointIds, segmentIds) {
  const links = new Map()
  for (const route of contexts.values()) {
    if (!route?.id || !route.slug) continue
    for (const [field, wanted, label] of [
      ['waypoints', publicRelationshipIds(waypointIds), 'Waypoint'],
      ['segments', publicRelationshipIds(segmentIds), 'Segment'],
    ]) {
      for (const child of Array.isArray(route[field]) ? route[field] : []) {
        if (!child?.id || !wanted.includes(String(child.id)) || (child.route_id && String(child.route_id) !== String(route.id))) continue
        const key = `${field}:${child.id}`
        links.set(key, {
          key,
          to: `/routes/${encodeURIComponent(route.slug)}/${field}/${encodeURIComponent(child.id)}`,
          title: child.title || child.name || child.label || `${label}${child.order ? ` ${child.order}` : ''}`,
          routeTitle: route.title,
        })
      }
    }
  }
  return [...links.values()]
}
