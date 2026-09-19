import { useEffect, useMemo, useRef, useState } from 'react'
import { imageCollectionsApi, uploadImage } from '../../services/management/imageCollectionsApi.js'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function errorMessage(error, fallback) {
  return error?.response?.data?.detail || error?.message || fallback
}

function imageId(image) {
  return String(image?.image_id || image?.asset_id || image?.image?.id || image?.id || '')
}

function imageUrl(image) {
  return image?.url || image?.image_url || image?.image?.url || image?.image?.image_url || image?.src || ''
}

function imageCaption(image) {
  return image?.caption || ''
}

function collectionPreview(collection) {
  return collection?.preview_image?.url || collection?.preview_image?.image_url || collection?.preview_image_url || imageUrl(collection?.images?.[0])
}

function collectionCount(collection) {
  return collection?.image_count ?? collection?.images_count ?? collection?.images?.length ?? 0
}

function CollectionEditor({ collection, onChange, onClose }) {
  const [title, setTitle] = useState(collection.title || '')
  const [description, setDescription] = useState(collection.description || '')
  const [images, setImages] = useState(Array.isArray(collection.images) ? collection.images : [])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const persistImages = async (nextImages) => {
    setStatus('saving')
    setError('')
    try {
      const saved = await imageCollectionsApi.replaceImages(collection.id, nextImages.map((image) => ({
        image_id: imageId(image),
        caption: imageCaption(image),
      })))
      const next = saved?.images ? saved : { ...collection, images: nextImages }
      setImages(next.images || nextImages)
      onChange(next)
    } catch (errorValue) {
      setError(errorMessage(errorValue, 'Unable to save collection images.'))
    } finally {
      setStatus('idle')
    }
  }

  const saveMetadata = async () => {
    setStatus('saving')
    setError('')
    try {
      const saved = await imageCollectionsApi.update(collection.id, { title, description })
      onChange({ ...collection, ...saved, images })
    } catch (errorValue) {
      setError(errorMessage(errorValue, 'Unable to save this gallery.'))
    } finally {
      setStatus('idle')
    }
  }

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Images must be 10 MiB or smaller.')
      return
    }
    setStatus('uploading')
    setError('')
    try {
      const asset = await uploadImage(file)
      const nextImages = [...images, { ...asset, image_id: asset.id, caption: '' }]
      await persistImages(nextImages)
    } catch (errorValue) {
      setError(errorMessage(errorValue, 'Unable to upload this image.'))
      setStatus('idle')
    }
  }

  const updateCaption = (index, caption) => {
    setImages((current) => current.map((image, imageIndex) => imageIndex === index ? { ...image, caption } : image))
  }

  const moveImage = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= images.length) return
    const next = [...images]
    const item = next.splice(index, 1)[0]
    next.splice(target, 0, item)
    setImages(next)
    persistImages(next)
  }

  const removeImage = (index) => {
    const next = images.filter((_, imageIndex) => imageIndex !== index)
    setImages(next)
    persistImages(next)
  }

  return (
    <div className="content-image-editor">
      <div className="content-image-editor-header">
        <div><p className="eyebrow">Image gallery</p><h3>{collection.title || 'Untitled gallery'}</h3></div>
        <button type="button" className="secondary-button small-button" onClick={onClose}>Close</button>
      </div>
      <div className="content-image-metadata">
        <label className="form-field">Title<input className="form-input" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="form-field">Description<textarea className="form-input" rows="3" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <button type="button" className="secondary-button small-button" onClick={saveMetadata} disabled={status !== 'idle'}>Save gallery details</button>
      </div>
      <div className="content-image-editor-toolbar">
        <strong>Images</strong>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} hidden />
        <button type="button" className="secondary-button small-button" onClick={() => inputRef.current?.click()} disabled={status !== 'idle'}>
          {status === 'uploading' ? 'Uploading…' : 'Upload image'}
        </button>
      </div>
      {error && <p className="content-image-error" role="alert">{error}</p>}
      <div className="content-image-list">
        {images.length === 0 && <p className="content-image-empty">No images in this gallery yet.</p>}
        {images.map((image, index) => (
          <div className="content-image-row" key={`${imageId(image)}-${index}`}>
            <div className="content-image-preview">{imageUrl(image) ? <img src={imageUrl(image)} alt="" /> : <span>Image</span>}</div>
            <label className="form-field">Caption<input className="form-input" value={imageCaption(image)} onChange={(event) => updateCaption(index, event.target.value)} onBlur={() => persistImages(images)} /></label>
            <div className="content-image-row-actions">
              <button type="button" className="secondary-button small-button" onClick={() => moveImage(index, -1)} disabled={index === 0 || status !== 'idle'}>Left</button>
              <button type="button" className="secondary-button small-button" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1 || status !== 'idle'}>Right</button>
              <button type="button" className="danger-button small-button" onClick={() => removeImage(index)} disabled={status !== 'idle'}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ContentImageCollectionManager({ attachedCollectionIds = [], heroImageId = null, onAttachmentsChange, onHeroImageChange, disabled = false }) {
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [createError, setCreateError] = useState('')
  const [attachedImages, setAttachedImages] = useState([])
  const selectedIds = useMemo(() => new Set((Array.isArray(attachedCollectionIds) ? attachedCollectionIds : []).map(String)), [attachedCollectionIds])

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

  const createCollection = async (event) => {
    event.preventDefault()
    setCreateError('')
    try {
      const created = await imageCollectionsApi.create({ title: newTitle, description: newDescription })
      setCollections((current) => [created, ...current])
      setCreating(false)
      setNewTitle('')
      setNewDescription('')
      setEditing(created)
    } catch (errorValue) {
      setCreateError(errorMessage(errorValue, 'Unable to create this gallery.'))
    }
  }

  const handleCollectionChange = (next) => {
    setCollections((current) => current.map((item) => item.id === next.id ? next : item))
    setEditing(next)
  }

  return (
    <section className="content-image-collection-manager">
      <div className="content-image-manager-header"><div><p className="eyebrow">Media</p><h3>Image galleries</h3></div><button type="button" className="secondary-button small-button" onClick={() => setCreating((current) => !current)} disabled={disabled}>Create image gallery</button></div>
      {creating && <form className="content-image-create" onSubmit={createCollection}><label className="form-field">Title<input className="form-input" required value={newTitle} onChange={(event) => setNewTitle(event.target.value)} /></label><label className="form-field">Description<textarea className="form-input" rows="3" value={newDescription} onChange={(event) => setNewDescription(event.target.value)} /></label><button type="submit" className="secondary-button small-button">Create gallery</button>{createError && <p className="content-image-error" role="alert">{createError}</p>}</form>}
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
      <div className="content-image-attached"><p className="eyebrow">Attached image galleries</p>{(attachedCollectionIds || []).length === 0 ? <p className="content-image-empty">None attached</p> : <ol>{attachedCollectionIds.map((id, index) => { const collection = collections.find((item) => String(item.id) === String(id)); return <li key={id}><span>{collection?.title || `Gallery ${index + 1}`}</span><button type="button" className="secondary-button small-button" onClick={() => setEditing(collection)} disabled={!collection}>Edit</button><button type="button" className="secondary-button small-button" onClick={() => moveAttachment(index, -1)} disabled={index === 0}>Up</button><button type="button" className="secondary-button small-button" onClick={() => moveAttachment(index, 1)} disabled={index === attachedCollectionIds.length - 1}>Down</button><button type="button" className="danger-button small-button" onClick={() => onAttachmentsChange(attachedCollectionIds.filter((_, itemIndex) => itemIndex !== index))}>Detach</button></li> })}</ol>}</div>
      {onHeroImageChange && <div className="content-image-hero"><p className="eyebrow">Hero image</p><label className="checkbox-item"><input type="radio" name="story-hero-image" checked={!heroImageId} onChange={() => onHeroImageChange(null)} />Automatic — using last attached image</label><div className="content-image-hero-picker">{attachedImages.map((image, index) => <button type="button" className={String(heroImageId) === imageId(image) ? 'content-image-hero-item is-selected' : 'content-image-hero-item'} key={`${imageId(image)}-${index}`} onClick={() => onHeroImageChange(imageId(image))}><span className="content-image-picker-preview">{imageUrl(image) ? <img src={imageUrl(image)} alt="" /> : <span>Image</span>}</span><span>Image {index + 1}</span></button>)}</div></div>}
      {editing && <CollectionEditor key={editing.id} collection={editing} onChange={handleCollectionChange} onClose={() => setEditing(null)} />}
    </section>
  )
}

export default ContentImageCollectionManager