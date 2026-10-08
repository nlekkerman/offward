import VideoPlayer from '../../video/VideoPlayer.jsx'
import { collectionCount, collectionPreview } from '../../management/imageCollectionUtils.js'
import { orderedCollectionImages } from './routeMediaUtils.js'

// showAllImages renders every embedded image of every collection (in order) instead of one cover per collection.
function EntityMediaSection({ videos = [], galleries = [], onOpenGallery, loadingGalleryId = null, galleryErrorByCollectionId = {}, showAllImages = false }) {
  const hasMedia = videos.length > 0 || galleries.length > 0

  if (!hasMedia) {
    return null
  }

  const galleryImages = galleries.map((gallery) => (showAllImages ? orderedCollectionImages(gallery) : []))
  const imageTotal = galleryImages.reduce((total, images) => total + images.length, 0)
  const itemCount = showAllImages
    ? videos.length + galleries.reduce((total, gallery, index) => total + (galleryImages[index].length || 1), 0)
    : videos.length + galleries.length

  const renderGalleryCard = (gallery, index) => {
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
  }

  return (
    <section className="route-map-detail-media entity-detail-media" aria-label="Media">
      <div className="entity-detail-section-heading">
        <p className="route-map-detail-section-label">Media</p>
        <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
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

      {galleries.length > 0 && !showAllImages && (
        <div className="route-map-detail-media-group">
          <p>Galleries</p>
          <div className="route-map-detail-rail">
            {galleries.map(renderGalleryCard)}
          </div>
        </div>
      )}

      {galleries.length > 0 && showAllImages && (
        <div className="route-map-detail-media-group">
          <p>Images{imageTotal > 0 && ` · ${imageTotal}`}</p>
          {galleries.map((gallery, galleryIndex) => {
            const images = galleryImages[galleryIndex]
            const galleryId = gallery.id ? String(gallery.id) : ''
            const errorMessage = galleryId ? galleryErrorByCollectionId?.[galleryId] : null

            if (!images.length) {
              return <div className="route-map-detail-rail" key={galleryId || galleryIndex}>{renderGalleryCard(gallery, galleryIndex)}</div>
            }

            return (
              <div className="entity-media-collection" key={galleryId || galleryIndex}>
                {(galleries.length > 1 || gallery.title) && <h3 className="entity-media-collection-title">{gallery.title || 'Gallery'}</h3>}
                <ul className="entity-media-image-grid">
                  {images.map((image, imageIndex) => (
                    <li key={image.id || imageIndex}>
                      <button type="button" className="entity-media-image" onClick={() => onOpenGallery(gallery, imageIndex)} aria-label={`Open image ${imageIndex + 1} of ${images.length}${image.caption ? `: ${image.caption}` : ''}`}>
                        <img src={image.thumbnail_url || image.url} alt={image.caption || ''} loading="lazy" />
                      </button>
                    </li>
                  ))}
                </ul>
                {errorMessage && <p className="route-map-gallery-error" role="alert">{errorMessage}</p>}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default EntityMediaSection
