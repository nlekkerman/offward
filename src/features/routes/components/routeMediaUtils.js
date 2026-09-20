// Shared helper for resolving Route/Segment/Waypoint media_ids (or Route
// video_ids) against the public Video catalog. Ownership is explicit: only
// ids actually present on a given target are resolved for that target, so a
// Video attached to a Waypoint never implicitly appears under its Segment or
// Route.
export function normalizeMediaIds(ids) {
  return Array.isArray(ids) ? [...new Set(ids.map((id) => String(id)).filter(Boolean))] : []
}

export function resolveAttachedVideos(ids, videoById) {
  return normalizeMediaIds(ids)
    .map((id) => videoById.get(id))
    .filter((video) => video && video.playback_url)
}
