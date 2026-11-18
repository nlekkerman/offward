import { useState } from 'react'

function ImageSlideshow({ images, onOpenImage, className = '', label = 'Images' }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const imageList = Array.isArray(images) ? images : []

  if (imageList.length === 0) {
    return null
  }

  const activeIndex = selectedIndex % imageList.length
  const activeImage = imageList[activeIndex]
  const hasMultipleImages = imageList.length > 1
  const activeImageUrl = activeImage.url || activeImage.image_url || activeImage.image?.url || activeImage.image?.image_url || activeImage.thumbnail_url || ''

  const showImage = (index) => {
    setSelectedIndex(index)
  }

  const showPrevious = () => {
    setSelectedIndex((current) => (current - 1 + imageList.length) % imageList.length)
  }

  const showNext = () => {
    setSelectedIndex((current) => (current + 1) % imageList.length)
  }

  return (
    <section className={`image-slideshow ${className}`.trim()} aria-label={label} aria-roledescription="carousel">
      <button
        type="button"
        className="image-slideshow-image"
        onClick={() => onOpenImage(activeIndex)}
        aria-label={`Open image ${activeIndex + 1} of ${imageList.length} in fullscreen`}
      >
        <img src={activeImageUrl} alt={activeImage.alt_text || activeImage.caption || `Image ${activeIndex + 1}`} />
      </button>

      {hasMultipleImages && (
        <>
          <button type="button" className="image-slideshow-nav is-previous" onClick={showPrevious} aria-label="Previous image">
            ‹
          </button>
          <button type="button" className="image-slideshow-nav is-next" onClick={showNext} aria-label="Next image">
            ›
          </button>
          <div className="image-slideshow-indicators" role="group" aria-label="Choose image">
            {imageList.map((image, index) => (
              <button
                type="button"
                key={image.id || image.image_id || index}
                className={`image-slideshow-indicator${index === activeIndex ? ' is-active' : ''}`}
                onClick={() => showImage(index)}
                aria-label={`Show image ${index + 1} of ${imageList.length}`}
                aria-pressed={index === activeIndex}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

export default ImageSlideshow
