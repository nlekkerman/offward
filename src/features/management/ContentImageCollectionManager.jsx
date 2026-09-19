import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { imageCollectionsApi } from '../../services/management/imageCollectionsApi.js'
import { collectionCount, collectionPreview, errorMessage, imageId, imageUrl } from './imageCollectionUtils.js'

function ContentImageCollectionManager({ attachedCollectionIds = [], heroImageId = null, onAttachmentsChange, onHeroImageChange, disabled = false }) {
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attachedImages, setAttachedImages] = useState([])
  const selectedIds = useMemo(() => new Set((Array.isArray(attachedCollectionIds) ? attachedCollectionIds : []).map(String)), [attachedCollectionIds])
  const collectionById = useMemo(() => new Map(collections.map((collection) => [String(collection.id), collection])), [collections])

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      try {
        const nextCollections = await imageCollectionsApi.list()
        if (active) {
          setCollections(nextCollections)
          setError('')
        }
      } catch (errorValue) {
        if (active) setError(errorMessage(errorValue, 'Image galleries are unavailable right now.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    const ids = (Array.isArray(attachedCollectionIds) ? attachedCollectionIds : []).filter(Boolean)
    if (ids.length === 0) {
      Promise.resolve().then(() => {
        if (active) setAttachedImages([])
      })
      return undefined
    }

    Promise.all(ids.map((id) => imageCollectionsApi.getById(id).catch(() => null)))
      .then((details) => {
        if (!active) return
        setAttachedImages(details.flatMap((collection) => Array.isArray(collection?.images) ? collection.images : []))
      })
    return () => { active = false }
  }, [attachedCollectionIds])

  const toggleCollection = (id) => {
    const current = Array.isArray(attachedCollectionIds) ? attachedCollectionIds.map(String) : []
    const next = selectedIds.has(String(id)) ? current.filter((value) => value !== String(id)) : [...current, String(id)]
    onAttachmentsChange(next)
  }

  const moveAttachment = (index, direction) => {
    const current = Array.isArray(attachedCollectionIds) ? [...attachedCollectionIds] : []
    const target = index + direction
    if (target < 0 || target >= current.length) return
    const item = current.splice(index, 1)[0]
    current.splice(target, 0, item)
    onAttachmentsChange(current)
  }

  return (
    <section className="content-image-collection-manager">
      <div className="content-image-manager-header">
        <div><p className="eyebrow">Media</p><h3>Image galleries</h3></div>
        <Link to="/manage/galleries" className="secondary-button small-button">Manage galleries</Link>
      </div>
      {loading && <p className="content-image-status">Loading image galleries…</p>}
      {error && <p className="content-image-error" role="alert">{error}</p>}
      {!loading && <div className="content-image-picker" aria-label="Image galleries">
        {collections.length === 0 && !error && <p className="content-image-empty">No image galleries yet.</p>}
        {collections.map((collection) => {
          const selected = selectedIds.has(String(collection.id))
          return <button type="button" className={selected ? 'content-image-picker-card is-selected' : 'content-image-picker-card'} key={collection.id} onClick={() => toggleCollection(collection.id)} disabled={disabled} aria-pressed={selected}>
            <div className="content-image-picker-preview">{collectionPreview(collection) ? <img src={collectionPreview(collection)} alt="" /> : <span>No preview</span>}</div>
            <strong>{collection.title || 'Untitled gallery'}</strong><span>{collectionCount(collection)} {collectionCount(collection) === 1 ? 'image' : 'images'}</span>
          </button>
        })}
      </div>}
      <div className="content-image-attached"><p className="eyebrow">Attached image galleries</p>{(attachedCollectionIds || []).length === 0 ? <p className="content-image-empty">None attached</p> : <ol>{attachedCollectionIds.map((id, index) => { const collection = collectionById.get(String(id)); return <li key={id}><span>{collection?.title || `Gallery ${index + 1}`}</span><button type="button" className="secondary-button small-button" onClick={() => moveAttachment(index, -1)} disabled={index === 0 || disabled}>Up</button><button type="button" className="secondary-button small-button" onClick={() => moveAttachment(index, 1)} disabled={index === attachedCollectionIds.length - 1 || disabled}>Down</button><button type="button" className="danger-button small-button" onClick={() => onAttachmentsChange(attachedCollectionIds.filter((_, itemIndex) => itemIndex !== index))} disabled={disabled}>Detach</button></li> })}</ol>}</div>
      {onHeroImageChange && <div className="content-image-hero"><p className="eyebrow">Hero image</p><label className="checkbox-item"><input type="radio" name="story-hero-image" checked={!heroImageId} onChange={() => onHeroImageChange(null)} />Automatic — using last attached image</label><div className="content-image-hero-picker">{attachedImages.map((image, index) => <button type="button" className={String(heroImageId) === imageId(image) ? 'content-image-hero-item is-selected' : 'content-image-hero-item'} key={`${imageId(image)}-${index}`} onClick={() => onHeroImageChange(imageId(image))}><span className="content-image-picker-preview">{imageUrl(image) ? <img src={imageUrl(image)} alt="" /> : <span>Image</span>}</span><span>Image {index + 1}</span></button>)}</div></div>}
    </section>
  )
}

export default ContentImageCollectionManager