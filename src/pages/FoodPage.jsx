import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import FoodRelatedContent from '../features/food/FoodRelatedContent.jsx'
import { rememberPublicFoods } from '../features/food/publicFoodCache.js'
import usePublicCountries from '../features/food/usePublicCountries.js'
import { formatActivityLabel, formatCountryLabel, formatPublishedDate } from '../features/home/latestContentFormatting.js'
import EntityMediaSection from '../features/routes/components/EntityMediaSection.jsx'
import { resolveAttachedVideos, resolveImageCollections } from '../features/routes/components/routeMediaUtils.js'
import { getPublicFoodBySlug } from '../services/foodsApi.js'
import { getPublicImageCollection } from '../services/imageCollectionsApi.js'
import CountryFlag from '../shared/components/CountryFlag.jsx'
import ImageLightbox from '../shared/components/ImageLightbox.jsx'
import { findCountry } from '../shared/utils/country.js'
import '../features/food/food.css'

function orderedRows(rows) {
  return Array.isArray(rows) ? rows.filter((row) => row && typeof row === 'object').slice().sort((a, b) => Number(a.order) - Number(b.order)) : []
}

function FoodPage() {
  const { slug } = useParams()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ slug: null, status: 'loading', food: null })
  const { countries } = usePublicCountries()
  const [lightbox, setLightbox] = useState({ slug: null, gallery: null, index: -1 })
  const [galleryStatus, setGalleryStatus] = useState({ loading: null, errors: {} })
  const galleryCache = useRef(new Map())
  const galleryPending = useRef(new Set())
  const currentSlug = useRef(slug)

  useEffect(() => {
    let current = true
    currentSlug.current = slug
    getPublicFoodBySlug(slug).then((food) => {
      if (food) rememberPublicFoods([food])
      if (current) setResult({ slug, status: food ? 'success' : 'not-found', food })
    }).catch(() => {
      if (current) setResult({ slug, status: 'error', food: null })
    })
    return () => { current = false }
  }, [slug, attempt])

  const status = result.slug === slug ? result.status : 'loading'
  const food = result.slug === slug ? result.food : null
  const openGallery = async (preview) => {
    const id = String(preview.id || '')
    if (!id || galleryPending.current.has(id)) return
    const requestSlug = slug
    galleryPending.current.add(id)
    setGalleryStatus((value) => ({ loading: id, errors: { ...value.errors, [id]: null } }))
    try {
      let collection = galleryCache.current.get(id)
      if (!collection) {
        collection = await getPublicImageCollection(id)
      }
      if (!Array.isArray(collection?.images) || !collection.images.length) {
        throw new Error('No public images are available in this gallery.')
      }
      galleryCache.current.set(id, collection)
      if (currentSlug.current === requestSlug) setLightbox({ slug: requestSlug, gallery: collection, index: 0 })
    } catch {
      if (currentSlug.current === requestSlug) setGalleryStatus((value) => ({ ...value, errors: { ...value.errors, [id]: 'Unable to load gallery images. Try again.' } }))
    } finally {
      galleryPending.current.delete(id)
      setGalleryStatus((value) => ({ ...value, loading: value.loading === id ? null : value.loading }))
    }
  }

  if (status === 'loading') return <section className="food-page"><p role="status">Loading Food…</p></section>
  if (status === 'not-found') return <section className="food-page"><Link className="route-detail-back" to="/food">Back to Food</Link><p className="eyebrow">FOOD NOT FOUND</p><h1>This Food could not be found</h1><p>It may have been removed or is no longer published.</p></section>
  if (status === 'error') return <section className="food-page"><Link className="route-detail-back" to="/food">Back to Food</Link><h1>Unable to load this Food</h1><p role="alert">There was a network or server problem.</p><button className="food-button" onClick={() => { setResult({ slug: null, status: 'loading', food: null }); setAttempt((value) => value + 1) }}>Retry</button></section>

  const country = findCountry(countries, food.country)
  const countryLabel = country?.name || formatCountryLabel(food.country)
  const published = formatPublishedDate(food.published_at)
  const ingredients = orderedRows(food.ingredients)
  const steps = orderedRows(food.steps)
  const images = lightbox.slug === slug ? lightbox.gallery?.images || [] : []
  const videos = resolveAttachedVideos(food)
  const galleries = resolveImageCollections(food)
  const invalidVideos = Array.isArray(food.videos) ? food.videos.length - videos.length : 0

  return (
    <section className="food-page food-detail-page">
      <Link className="route-detail-back" to="/food">Back to Food</Link>
      <header className="food-detail-header">
        <p className="eyebrow">{formatActivityLabel(food.food_type) || 'Food'}</p>
        <h1>{food.title}</h1>
        <div className="food-card-meta">{countryLabel && <span className="country-identity-inline"><CountryFlag code={country?.code} decorative />{countryLabel}</span>}{published && <span>{published}</span>}</div>
        {food.summary && <p className="route-detail-summary">{food.summary}</p>}
      </header>
      {food.body && <article className="food-body">{food.body}</article>}
      <dl className="food-recipe-meta">
        {food.prep_time_minutes != null && food.prep_time_minutes !== '' && <div><dt>Prep time</dt><dd>{food.prep_time_minutes} minutes</dd></div>}
        {food.cook_time_minutes != null && food.cook_time_minutes !== '' && <div><dt>Cook time</dt><dd>{food.cook_time_minutes} minutes</dd></div>}
        {food.servings != null && food.servings !== '' && <div><dt>Servings</dt><dd>{food.servings}</dd></div>}
      </dl>
      {(ingredients.length > 0 || steps.length > 0) && <div className="food-recipe">
        {ingredients.length > 0 && <section><h2>Ingredients</h2><ul className="food-ingredients">{ingredients.map((row, index) => <li key={row.id || index}>{row.quantity && <strong>{row.quantity} </strong>}{row.name}{row.note && <span className="food-ingredient-note"> — {row.note}</span>}</li>)}</ul></section>}
        {steps.length > 0 && <section><h2>Steps</h2><ol className="food-steps">{steps.map((row, index) => <li key={row.id || index}>{row.text}</li>)}</ol></section>}
      </div>}
      <EntityMediaSection videos={videos} galleries={galleries} onOpenGallery={openGallery} loadingGalleryId={galleryStatus.loading} galleryErrorByCollectionId={galleryStatus.errors} />
      {invalidVideos > 0 && <p role="status">{invalidVideos} attached video {invalidVideos === 1 ? 'is' : 'items are'} not publicly playable.</p>}
      <FoodRelatedContent food={food} />
      <ImageLightbox images={images} activeIndex={lightbox.index} isOpen={lightbox.slug === slug && lightbox.index >= 0} onClose={() => setLightbox({ slug: null, gallery: null, index: -1 })} onPrevious={() => setLightbox((value) => ({ ...value, index: (value.index - 1 + images.length) % images.length }))} onNext={() => setLightbox((value) => ({ ...value, index: (value.index + 1) % images.length }))} />
    </section>
  )
}

export default FoodPage
