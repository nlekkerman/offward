import { collectionCount, collectionPreview } from '../../management/imageCollectionUtils.js'

function getGalleryImages(gallery) {
  return Array.isArray(gallery?.images) ? gallery.images : []
}

function RouteMapDetailOverlay({ detail, onClose, onPlayVideo, onOpenGallery, onShowFullRoute }) {
  if (!detail) {
    return null
  }

  const videos = Array.isArray(detail.videos) ? detail.videos : []
  const imageCollections = Array.isArray(detail.imageCollections) ? detail.imageCollections : []
  const hasMedia = videos.length > 0 || imageCollections.length > 0

  return (
    <aside className="route-map-detail-overlay" aria-live="polite" aria-label={`${detail.eyebrow}: ${detail.title}`}>
      <button type="button" className="route-map-detail-close" onClick={onClose} aria-label="Close map details">×</button>
      <header className="route-map-detail-header">
        <p className="route-map-detail-eyebrow">{detail.eyebrow}</p>
        <h3>{detail.title}</h3>
        {detail.subtitle && <p className="route-map-detail-subtitle">{detail.subtitle}</p>}
      </header>

      {detail.summary && <p className="route-map-detail-summary">{detail.summary}</p>}

      {hasMedia && (
        <section className="route-map-detail-media" aria-label="Media">
          <p className="route-map-detail-section-label">Media</p>
          {videos.length > 0 && (
            <div className="route-map-detail-media-group">
              <p>Videos</p>
              <div className="route-map-detail-rail">
                {videos.map((video) => (
                  <article className="route-map-video-preview" key={video.id}>
                    <div className="route-map-video-thumbnail">
                      {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" loading="lazy" /> : <span aria-hidden="true">▶</span>}
                    </div>
                    <div className="route-map-video-copy">
                      <strong>{video.title || 'Video'}</strong>
                      {video.duration && <span>{video.duration}</span>}
                      <button type="button" onClick={() => onPlayVideo(video)}>Play</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {imageCollections.length > 0 && (
            <div className="route-map-detail-media-group">
              <p>Galleries</p>
              <div className="route-map-detail-rail">
                {imageCollections.map((gallery, index) => {
                  const images = getGalleryImages(gallery)
                  const cover = collectionPreview(gallery)
                  const imageCount = collectionCount(gallery)
                  return (
                    <button
                      type="button"
                      className="route-map-gallery-preview"
                      key={gallery.id || gallery.title || index}
                      onClick={() => onOpenGallery(gallery)}
                      disabled={images.length === 0}
                    >
                      <span className="route-map-gallery-cover">{cover ? <img src={cover} alt="" loading="lazy" /> : <span aria-hidden="true">▧</span>}</span>
                      <span className="route-map-gallery-copy">
                        <strong>{gallery.title || 'Gallery'}</strong>
                        <span>{imageCount} {imageCount === 1 ? 'image' : 'images'}</span>
                        <span className="route-map-gallery-action">View</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {detail.type === 'segment' && (
        <button type="button" className="route-map-show-route" onClick={onShowFullRoute}>Show full route</button>
      )}
    </aside>
  )
}

export default RouteMapDetailOverlay