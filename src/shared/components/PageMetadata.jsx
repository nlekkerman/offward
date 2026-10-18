import { useEffect } from 'react'
import { FALLBACK_SOCIAL_IMAGE, getPublicImageUrl, getPublicUrl } from '../utils/publicUrls.js'

const DEFAULT_METADATA = {
  title: 'Offward — Away from the expected path',
  description: 'Discover routes, places, stories and food worth finding along the way.',
  canonical: getPublicUrl('/'),
  image: FALLBACK_SOCIAL_IMAGE,
  type: 'website',
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
  setMeta('meta[property="og:image"]', 'property', 'og:image', image)
  setMeta('meta[property="og:type"]', 'property', 'og:type', type)
  setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image')
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)
  setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image)
}

function PageMetadata({ title, description, path, image, type = 'website' }) {
  const canonical = getPublicUrl(path)
  const socialImage = getPublicImageUrl(image) || FALLBACK_SOCIAL_IMAGE

  useEffect(() => {
    applyMetadata({
      title,
      browserTitle: `${title} | Offward`,
      description,
      canonical,
      image: socialImage,
      type,
    })

    return () => applyMetadata(DEFAULT_METADATA)
  }, [title, description, canonical, socialImage, type])

  return null
}

export default PageMetadata
