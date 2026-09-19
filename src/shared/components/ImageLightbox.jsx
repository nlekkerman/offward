import { useEffect, useRef, useState } from 'react'
import './ImageLightbox.css'

function imageUrl(image) {
  return image?.url || image?.thumbnail_url || ''
}

function imageCaption(image) {
  return image?.caption || ''
}

/**
 * Reusable full-viewport lightbox for a single public image collection sequence.
 * Consumes the existing public Story image shape (id/url/thumbnail_url/width/height/caption/order)
 * so no second image data shape is introduced.
 */
function ImageLightbox({ images, activeIndex, isOpen, onClose, onPrevious, onNext }) {
  const list = Array.isArray(images) ? images : []
  const activeImage = list[activeIndex] || null
  const hasMultiple = list.length > 1

  // Reset load state whenever the displayed image changes, without a setState-in-effect cascade.
  const [loadState, setLoadState] = useState('loading')
  const [trackedSrc, setTrackedSrc] = useState(imageUrl(activeImage))
  const currentSrc = imageUrl(activeImage)
  if (currentSrc !== trackedSrc) {
    setTrackedSrc(currentSrc)
    setLoadState('loading')
  }

  const dialogRef = useRef(null)
  const previouslyFocusedRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    previouslyFocusedRef.current = document.activeElement
    dialogRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'ArrowLeft' && hasMultiple) {
        onPrevious()
      } else if (event.key === 'ArrowRight' && hasMultiple) {
        onNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocusedRef.current instanceof HTMLElement) {
        previouslyFocusedRef.current.focus()
      }
    }
  }, [isOpen, hasMultiple, onClose, onPrevious, onNext])

  if (!isOpen || !activeImage) {
    return null
  }

  const src = imageUrl(activeImage)
  const caption = imageCaption(activeImage)

  return (
    <div className="image-lightbox-backdrop" onClick={onClose}>
      <div
        className="image-lightbox-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={caption || 'Image viewer'}
        ref={dialogRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="image-lightbox-close" onClick={onClose} aria-label="Close image viewer">
          ×
        </button>

        {hasMultiple && (
          <button type="button" className="image-lightbox-nav image-lightbox-prev" onClick={onPrevious} aria-label="Previous image">
            ‹
          </button>
        )}

        <div className="image-lightbox-media">
          {loadState !== 'error' && src && (
            <img
              key={src}
              src={src}
              alt={caption || 'Enlarged gallery image'}
              className="image-lightbox-image"
              style={{ visibility: loadState === 'loading' ? 'hidden' : 'visible' }}
              onLoad={() => setLoadState('loaded')}
              onError={() => setLoadState('error')}
            />
          )}
          {loadState === 'loading' && src && <p className="image-lightbox-status" role="status">Loading image…</p>}
          {(loadState === 'error' || !src) && <p className="image-lightbox-status">Image unavailable</p>}
        </div>

        {hasMultiple && (
          <button type="button" className="image-lightbox-nav image-lightbox-next" onClick={onNext} aria-label="Next image">
            ›
          </button>
        )}

        <div className="image-lightbox-footer">
          {caption && <p className="image-lightbox-caption">{caption}</p>}
          {hasMultiple && (
            <p className="image-lightbox-index">{activeIndex + 1} / {list.length}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImageLightbox
