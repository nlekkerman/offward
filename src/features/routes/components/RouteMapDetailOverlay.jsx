import { collectionPreview } from '../../management/imageCollectionUtils.js'

// Gallery preview image takes priority (first attachment with a usable
// cover); Video thumbnail/poster is the fallback. Never both, never more
// than one image - full media consumption lives on the detail page.
function resolvePreviewImage(videos, imageCollections) {
  const gallery = imageCollections.find((collection) => collectionPreview(collection))
  if (gallery) return collectionPreview(gallery)

  const video = videos.find((item) => item.thumbnail_url || item.poster_url)
  return video ? video.thumbnail_url || video.poster_url : null
}

function formatMediaCounts(videoCount, galleryCount) {
  const parts = []
  if (videoCount > 0) parts.push(`${videoCount} ${videoCount === 1 ? 'video' : 'videos'}`)
  if (galleryCount > 0) parts.push(`${galleryCount} ${galleryCount === 1 ? 'gallery' : 'galleries'}`)
  return parts.join(' · ')
}

function RouteMapDetailOverlay({ detail, onClose, onShowFullRoute, onViewDetails, onPointerEnter, onPointerLeave }) {
  if (!detail) {
    return null
  }

  const videos = Array.isArray(detail.videos) ? detail.videos : []
  const imageCollections = Array.isArray(detail.imageCollections) ? detail.imageCollections : []
  const previewImage = resolvePreviewImage(videos, imageCollections)
  const mediaCounts = formatMediaCounts(videos.length, imageCollections.length)

  const activate = () => onViewDetails(detail)
  const handleKeyDown = (event) => {
    // Ignore keydowns bubbling up from nested controls (Close, Show full route).
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activate()
    }
  }

  return (
    <aside
      className="route-map-detail-overlay"
      aria-live="polite"
      aria-label={`${detail.eyebrow}: ${detail.title}. Activate to view details.`}
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={handleKeyDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <button type="button" className="route-map-detail-close" onClick={(event) => { event.stopPropagation(); onClose() }} aria-label="Close map details">×</button>
      <header className="route-map-detail-header">
        <p className="route-map-detail-eyebrow">{detail.eyebrow}</p>
        <h3>{detail.title}</h3>
        {detail.subtitle && <p className="route-map-detail-subtitle">{detail.subtitle}</p>}
      </header>

      {detail.summary && <p className="route-map-detail-summary">{detail.summary}</p>}

      {previewImage && (
        <div className="route-map-detail-preview">
          <img src={previewImage} alt="" loading="lazy" />
        </div>
      )}

      {mediaCounts && <p className="route-map-detail-counts">{mediaCounts}</p>}

      <div className="route-map-detail-actions">
        {detail.type === 'segment' && (
          <button type="button" className="route-map-show-route" onClick={(event) => { event.stopPropagation(); onShowFullRoute() }}>Show full route</button>
        )}
        <span className="route-map-view-details" aria-hidden="true">View details →</span>
      </div>
    </aside>
  )
}

export default RouteMapDetailOverlay