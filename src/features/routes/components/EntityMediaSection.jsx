import VideoPlayer from '../../video/VideoPlayer.jsx'
import { collectionCount, collectionPreview } from '../../management/imageCollectionUtils.js'

function EntityMediaSection({ videos = [], galleries = [], onOpenGallery, loadingGalleryId = null, galleryErrorByCollectionId = {} }) {
  const hasMedia = videos.length > 0 || galleries.length > 0

  if (!hasMedia) {
    return null
  }

  return (
    <section className="route-map-detail-media entity-detail-media" aria-label="Media">
      <div className="entity-detail-section-heading">
        <p className="route-map-detail-section-label">Media</p>
        <span>{videos.length + galleries.length} {videos.length + galleries.length === 1 ? 'item' : 'items'}</span>
      </div>

      {videos.length > 0 && (
        <div className="route-map-detail-media-group">
          <p>Videos</p>
          <div className="route-map-detail-rail">
            {videos.map((video) => (
              <article className="route-map-video-preview" key={video.id}>
                <VideoPlayer
                  playbackUrl={video.playback_url}
                  thumbnailUrl={video.thumbnail_url || video.thumbnailUrl}
                  title={video.title || 'Video'}
                  className="entity-detail-video"
                />
                <div className="route-map-video-copy">
                  <strong>{video.title || 'Video'}</strong>
                  {video.duration && <span>{video.duration}</span>}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {galleries.length > 0 && (
        <div className="route-map-detail-media-group">
          <p>Galleries</p>
          <div className="route-map-detail-rail">
            {galleries.map((gallery, index) => {
              const cover = collectionPreview(gallery)
              const imageCount = collectionCount(gallery)
              const galleryId = gallery.id ? String(gallery.id) : ''
              const isLoading = galleryId && loadingGalleryId === galleryId
              const errorMessage = galleryId ? galleryErrorByCollectionId?.[galleryId] : null

              return (
                <article className="route-map-gallery-preview" key={galleryId || gallery.title || index}>
                  <span className="route-map-gallery-cover">{cover ? <img src={cover} alt="" loading="lazy" /> : <span aria-hidden="true">▧</span>}</span>
                  <span className="route-map-gallery-copy">
                    <strong>{gallery.title || 'Gallery'}</strong>
                    {imageCount > 0 && <span>{imageCount} {imageCount === 1 ? 'photo' : 'photos'}</span>}
                    <button type="button" className="route-map-gallery-action" onClick={() => onOpenGallery(gallery)} disabled={isLoading} aria-label={`View gallery ${gallery.title || ''}`.trim()}>
                      {isLoading ? 'Loading…' : 'View'}
                    </button>
                    {errorMessage && <span className="route-map-gallery-error" role="alert">{errorMessage}</span>}
                  </span>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

export default EntityMediaSection
