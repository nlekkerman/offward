import { useEffect, useState } from 'react'
import offwardLogo from '../../assets/images/home/logo_offward.webp'

function DetailHero({ imageUrl, children }) {
  const [failedImageUrl, setFailedImageUrl] = useState(null)

  useEffect(() => {
    setFailedImageUrl(null)
  }, [imageUrl])

  const showImage = Boolean(imageUrl && imageUrl !== failedImageUrl)

  return (
    <section className={`detail-hero${showImage ? '' : ' detail-hero-fallback'}`}>
      {showImage ? (
        <img
          className="detail-hero-image"
          src={imageUrl}
          alt=""
          aria-hidden="true"
          onError={() => setFailedImageUrl(imageUrl)}
        />
      ) : (
        <img className="detail-hero-logo" src={offwardLogo} alt="" aria-hidden="true" />
      )}
      <div className="detail-hero-content">{children}</div>
    </section>
  )
}

export default DetailHero
