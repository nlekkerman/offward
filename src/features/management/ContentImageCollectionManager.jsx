import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { imageCollectionsApi } from '../../services/management/imageCollectionsApi.js'
import { collectionCount, collectionPreview, imageId, imageUrl } from './imageCollectionUtils.js'
import useManagementCatalog from './useManagementCatalog.js'
import CatalogStatus from './CatalogStatus.jsx'

function ContentImageCollectionManager({ attachedCollectionIds = [], heroImageId = null, onAttachmentsChange, onHeroImageChange, disabled = false }) {
  const catalog = useManagementCatalog(imageCollectionsApi, attachedCollectionIds)
  const collections = catalog.items
  const loading = catalog.loading
  const selectedIds = useMemo(() => new Set((Array.isArray(attachedCollectionIds) ? attachedCollectionIds : []).map(String)), [attachedCollectionIds])
  const collectionById = useMemo(() => new Map(collections.map((collection) => [String(collection.id), collection])), [collections])

  const attachedImages = attachedCollectionIds.flatMap((id) => {
    const collection = collectionById.get(String(id))
    return Array.isArray(collection?.images) ? collection.images : []
  })

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
      <CatalogStatus catalog={catalog} label="galleries" disabled={disabled} />
      {!loading && <div className="content-image-picker" aria-label="Image galleries">
        {collections.length === 0 && !catalog.error && <p className="content-image-empty">No image galleries yet.</p>}
        {collections.map((collection) => {
          const selected = selectedIds.has(String(collection.id))
          return <button type="button" className={selected ? 'content-image-picker-card is-selected' : 'content-image-picker-card'} key={collection.id} onClick={() => toggleCollection(collection.id)} disabled={disabled} aria-pressed={selected}>
            <div className="content-image-picker-preview">{collectionPreview(collection) ? <img src={collectionPreview(collection)} alt="" /> : <span>No preview</span>}</div>
            <strong>{collection.title || 'Untitled gallery'}</strong><span>{collectionCount(collection)} {collectionCount(collection) === 1 ? 'image' : 'images'}</span>
          </button>
        })}
      </div>}
      <div className="content-image-attached">
        <p className="eyebrow">Attached image galleries</p>
        {!attachedCollectionIds.length ? <p className="content-image-empty">None attached</p> : <ol>
          {attachedCollectionIds.map((id, index) => {
            const collection = collectionById.get(String(id))
            const title = collection?.title || `${id} (unresolved gallery)`
            return <li key={id}>
              <span>{title}</span>
              <button type="button" className="secondary-button small-button" onClick={() => moveAttachment(index, -1)} disabled={index === 0 || disabled} aria-label={`Move gallery ${title} up`}>Up</button>
              <button type="button" className="secondary-button small-button" onClick={() => moveAttachment(index, 1)} disabled={index === attachedCollectionIds.length - 1 || disabled} aria-label={`Move gallery ${title} down`}>Down</button>
              <button type="button" className="danger-button small-button" onClick={() => onAttachmentsChange(attachedCollectionIds.filter((_, itemIndex) => itemIndex !== index))} disabled={disabled} aria-label={`Detach gallery ${title}`}>Detach</button>
            </li>
          })}
        </ol>}
      </div>
      {onHeroImageChange && <div className="content-image-hero">
        <p className="eyebrow">Hero image</p>
        <label className="checkbox-item"><input type="radio" name="story-hero-image" checked={!heroImageId} onChange={() => onHeroImageChange(null)} disabled={disabled} />Automatic — using last attached image</label>
        <div className="content-image-hero-picker">{attachedImages.map((image, index) => <button type="button" className={String(heroImageId) === imageId(image) ? 'content-image-hero-item is-selected' : 'content-image-hero-item'} key={`${imageId(image)}-${index}`} onClick={() => onHeroImageChange(imageId(image))} disabled={disabled}><span className="content-image-picker-preview">{imageUrl(image) ? <img src={imageUrl(image)} alt="" /> : <span>Image</span>}</span><span>Image {index + 1}</span></button>)}</div>
      </div>}
    </section>
  )
}

export default ContentImageCollectionManager