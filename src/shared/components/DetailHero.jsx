import { useEffect, useState } from 'react'
import offwardLogo from '../../assets/images/home/logo_offward.webp'

function DetailHero({ imageUrl }) {
  const [failedImageUrl, setFailedImageUrl] = useState(null)

  useEffect(() => {
    setFailedImageUrl(null)
  }, [imageUrl])

  const showImage = Boolean(imageUrl && imageUrl !== failedImageUrl)

  return (
    <figure className={`detail-hero${showImage ? '' : ' detail-hero-fallback'}`}>
      {showImage ? (
        <img
          src={imageUrl}
          alt=""
          onError={() => setFailedImageUrl(imageUrl)}
        />
      ) : (
        <img src={offwardLogo} alt="" aria-hidden="true" />
      )}
    </figure>
  )
}

export default DetailHero
