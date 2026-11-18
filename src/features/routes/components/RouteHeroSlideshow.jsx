import { useState } from 'react'

function RouteHeroSlideshow({ images, onOpenImage }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const imageList = Array.isArray(images) ? images : []

  if (imageList.length === 0) {
    return null
  }

  const activeIndex = selectedIndex % imageList.length
  const activeImage = imageList[activeIndex]
  const hasMultipleImages = imageList.length > 1
  const activeImageUrl = activeImage.url || activeImage.thumbnail_url

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
    <section className="route-hero-slideshow" aria-label="Route photos" aria-roledescription="carousel">
      <button
        type="button"
        className="route-hero-slide-image"
        onClick={() => onOpenImage(activeIndex)}
        aria-label={`Open image ${activeIndex + 1} of ${imageList.length} in fullscreen`}
      >
        <img src={activeImageUrl} alt={activeImage.caption || `Route image ${activeIndex + 1}`} />
      </button>

      {hasMultipleImages && (
        <>
          <button type="button" className="route-hero-slide-nav is-previous" onClick={showPrevious} aria-label="Previous route image">
            ‹
          </button>
          <button type="button" className="route-hero-slide-nav is-next" onClick={showNext} aria-label="Next route image">
            ›
          </button>
          <div className="route-hero-slide-indicators" role="group" aria-label="Choose route image">
            {imageList.map((image, index) => (
              <button
                type="button"
                key={image.id || image.image_id || index}
                className={`route-hero-slide-indicator${index === activeIndex ? ' is-active' : ''}`}
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

export default RouteHeroSlideshow
