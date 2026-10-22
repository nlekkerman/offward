import { useEffect } from 'react'
import { FALLBACK_SOCIAL_IMAGE, getPublicImageUrl, getPublicUrl } from '../utils/publicUrls.js'

const DEFAULT_METADATA = {
  title: 'Offward — Away from the expected path',
  description: 'Discover routes, places, stories and food worth finding along the way.',
  canonical: getPublicUrl('/'),
  image: FALLBACK_SOCIAL_IMAGE,
  type: 'website',
}
const NOT_FOUND_TITLE = '404 — Not lost. Just Offward. | Offward'
const NOT_FOUND_METADATA_SELECTORS = [
  'meta[name="description"]',
  'link[rel="canonical"]',
  'meta[property^="og:"]',
  'meta[name^="twitter:"]',
]

function clearNotFoundMetadata() {
  NOT_FOUND_METADATA_SELECTORS.forEach((selector) => {
    document.head.querySelectorAll(selector).forEach((element) => element.remove())
  })
}

function setMeta(selector, attribute, key, content) {
  const matches = document.head.querySelectorAll(selector)
  let element = matches[0]
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  matches.forEach((duplicate) => {
    if (duplicate !== element) duplicate.remove()
  })
  element.content = content
}

function setCanonical(href) {
  const matches = document.head.querySelectorAll('link[rel="canonical"]')
  let element = matches[0]
  if (!element) {
    element = document.createElement('link')
    element.rel = 'canonical'
    document.head.appendChild(element)
  }
  matches.forEach((duplicate) => {
    if (duplicate !== element) duplicate.remove()
  })
  element.href = href
}

function applyMetadata({ title, browserTitle = title, description, canonical, image, type }) {
  document.title = browserTitle
  setMeta('meta[name="description"]', 'name', 'description', description)
  setCanonical(canonical)
  setMeta('meta[property="og:title"]', 'property', 'og:title', title)
  setMeta('meta[property="og:description"]', 'property', 'og:description', description)
  setMeta('meta[property="og:url"]', 'property', 'og:url', canonical)
  setMeta('meta[property="og:type"]', 'property', 'og:type', type)
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)
  if (image) {
    setMeta('meta[property="og:image"]', 'property', 'og:image', image)
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image')
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image)
  } else {
    document.head.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach((element) => element.remove())
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary')
  }
}

function PageMetadata({
  title,
  description,
  path,
  image,
  type = 'website',
  noindex = false,
  noImage = false,
  noindexTitle = NOT_FOUND_TITLE,
}) {
  const canonical = noindex ? null : getPublicUrl(path)
  const socialImage = noindex || noImage ? null : getPublicImageUrl(image) || FALLBACK_SOCIAL_IMAGE

  useEffect(() => {
    if (noindex) {
      document.title = noindexTitle
      clearNotFoundMetadata()
      setMeta('meta[name="robots"]', 'name', 'robots', 'noindex,follow')

      return () => {
        document.head.querySelectorAll('meta[name="robots"]').forEach((element) => element.remove())
        applyMetadata(DEFAULT_METADATA)
      }
    }

    document.head.querySelectorAll('meta[name="robots"]').forEach((element) => element.remove())
    applyMetadata({
      title,
      browserTitle: `${title} | Offward`,
      description,
      canonical,
      image: socialImage,
      type,
    })

    return () => applyMetadata(DEFAULT_METADATA)
  }, [title, description, canonical, socialImage, type, noindex, noindexTitle])

  return null
}

export default PageMetadata
