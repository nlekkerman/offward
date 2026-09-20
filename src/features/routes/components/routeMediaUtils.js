// Public Route detail currently embeds Videos on each owner. Shallow ID
// resolution remains as compatibility for older public payloads.
export function normalizeMediaIds(ids) {
  return Array.isArray(ids) ? [...new Set(ids.map((id) => String(id)).filter(Boolean))] : []
}

function playableVideos(videos) {
  const seen = new Set()
  return (Array.isArray(videos) ? videos : []).filter((video) => {
    const id = String(video?.id || '')
    if (!id || !video?.playback_url || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export function resolveAttachedVideos(ownerOrIds, videoById = new Map()) {
  if (ownerOrIds && !Array.isArray(ownerOrIds) && Array.isArray(ownerOrIds.videos)) {
    return playableVideos(ownerOrIds.videos)
  }

  const ids = Array.isArray(ownerOrIds)
    ? ownerOrIds
    : ownerOrIds?.media_ids ?? ownerOrIds?.video_ids

  return playableVideos(normalizeMediaIds(ids)
    .map((id) => videoById.get(id))
    .filter(Boolean))
}

export function resolveImageCollections(owner) {
  if (!Array.isArray(owner?.image_collections)) return []

  const seen = new Set()
  return owner.image_collections.filter((collection) => {
    const id = String(collection?.id || '')
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export function getAttachedMediaCount(owner, videoById = new Map()) {
  return resolveAttachedVideos(owner, videoById).length + resolveImageCollections(owner).length
}
