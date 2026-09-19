import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { imageCollectionsApi, uploadImage } from '../../../services/management/imageCollectionsApi.js'
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  errorMessage,
  imageCaption,
  imageId,
  imageUrl,
  toImageMembershipPayload,
} from '../../../features/management/imageCollectionUtils.js'

function GalleryEditPage() {
  const { id } = useParams()
  const inputRef = useRef(null)
  const [collection, setCollection] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true

    async function loadCollection() {
      setLoading(true)
      try {
        const data = await imageCollectionsApi.getById(id)
        if (!active) return
        setCollection(data)
        setTitle(data.title || '')
        setDescription(data.description || '')
        setImages(Array.isArray(data.images) ? data.images : [])
        setError('')
      } catch (errorValue) {
        if (active) setError(errorMessage(errorValue, 'Unable to load this gallery.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    loadCollection()
    return () => { active = false }
  }, [id])

  const persistImages = async (nextImages, successMessage = '') => {
    setStatus('saving')
    setError('')
    setNotice('')
    try {
      const saved = await imageCollectionsApi.replaceImages(id, toImageMembershipPayload(nextImages))
      const savedImages = Array.isArray(saved?.images) ? saved.images : nextImages
      setImages(savedImages)
      setCollection((current) => ({ ...current, ...saved, images: savedImages }))
      if (successMessage) setNotice(successMessage)
      return true
    } catch (errorValue) {
      setError(errorMessage(errorValue, 'Unable to save gallery images.'))
      return false
    } finally {
      setStatus('idle')
    }
  }

  const saveMetadata = async (event) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Enter a gallery title.')
      return
    }

    setStatus('saving')
    setError('')
    setNotice('')
    try {
      const saved = await imageCollectionsApi.update(id, { title: trimmedTitle, description })
      setCollection((current) => ({ ...current, ...saved, images }))
      setNotice('Gallery details saved.')
    } catch (errorValue) {
      setError(errorMessage(errorValue, 'Unable to save this gallery.'))
    } finally {
      setStatus('idle')
    }
  }

  const uploadFiles = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return

    const invalid = files.find((file) => !ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES)
    if (invalid) {
      setError(`${invalid.name} must be a JPEG, PNG, or WebP image no larger than 10 MiB.`)
      return
    }

    setStatus('uploading')
    setError('')
    setNotice('')
    const successfulImages = []
    const failures = []

    for (const file of files) {
      try {
        const asset = await uploadImage(file)
        successfulImages.push({ ...asset, image_id: asset.id, caption: '' })
      } catch (errorValue) {
        failures.push(`${file.name}: ${errorMessage(errorValue, 'upload failed')}`)
      }
    }

    if (successfulImages.length) {
      const nextImages = [...images, ...successfulImages]
      const saved = await persistImages(nextImages, `${successfulImages.length} ${successfulImages.length === 1 ? 'image' : 'images'} uploaded.`)
      if (!saved) return
    } else {
      setStatus('idle')
    }

    if (failures.length) {
      setError(`Some uploads failed. ${failures.join(' ')}`)
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
    persistImages(next, 'Image order saved.')
  }

  const removeImage = (index) => {
    const next = images.filter((_, imageIndex) => imageIndex !== index)
    setImages(next)
    persistImages(next, 'Image removed from gallery.')
  }

  if (loading) {
    return <section className="management-page"><h1>Edit Gallery</h1><div className="management-empty">Loading gallery...</div></section>
  }

  if (error && !collection) {
    return <section className="management-page"><h1>Edit Gallery</h1><div className="management-error">{error}</div></section>
  }

  return (
    <section className="management-page gallery-edit-page">
      <div className="management-page-header">
        <div>
          <p className="eyebrow">Galleries</p>
          <h1>{collection?.title || 'Untitled gallery'}</h1>
        </div>
        <Link to="/manage/galleries" className="secondary-button">Back to Galleries</Link>
      </div>

      <form className="management-form gallery-form" onSubmit={saveMetadata}>
        <div className="gallery-edit-summary">
          <strong>{images.length}</strong>
          <span>{images.length === 1 ? 'image' : 'images'} in this Gallery</span>
        </div>
        <label className="form-field" htmlFor="gallery-title">
          Title
          <input id="gallery-title" className="form-input" required value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="form-field" htmlFor="gallery-description">
          Description
          <textarea id="gallery-description" className="form-input" rows="5" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <div className="management-form-actions">
          <button type="submit" className="primary-button" disabled={status !== 'idle'}>{status === 'saving' ? 'Saving...' : 'Save details'}</button>
        </div>
      </form>

      <section className="gallery-image-panel">
        <div className="gallery-image-panel-header">
          <div>
            <p className="eyebrow">Images</p>
            <h2>Gallery images</h2>
          </div>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadFiles} hidden />
          <button type="button" className="primary-button" onClick={() => inputRef.current?.click()} disabled={status !== 'idle'}>
            {status === 'uploading' ? 'Uploading...' : '+ Upload images'}
          </button>
        </div>

        {error && <div className="management-error" role="alert">{error}</div>}
        {notice && <p className="gallery-notice" role="status">{notice}</p>}

        {!images.length ? (
          <div className="gallery-image-empty">No images in this Gallery yet.</div>
        ) : (
          <div className="gallery-image-grid">
            {images.map((image, index) => (
              <article className="gallery-image-card" key={`${imageId(image)}-${index}`}>
                <div className="gallery-image-preview">
                  {imageUrl(image) ? <img src={imageUrl(image)} alt="" /> : <span>Image</span>}
                </div>
                <label className="form-field">
                  Caption
                  <input className="form-input" value={imageCaption(image)} onChange={(event) => updateCaption(index, event.target.value)} onBlur={() => persistImages(images, 'Caption saved.')} />
                </label>
                <div className="gallery-image-actions">
                  <button type="button" className="secondary-button small-button" onClick={() => moveImage(index, -1)} disabled={index === 0 || status !== 'idle'}>Move left</button>
                  <button type="button" className="secondary-button small-button" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1 || status !== 'idle'}>Move right</button>
                  <button type="button" className="danger-button small-button" onClick={() => removeImage(index)} disabled={status !== 'idle'}>Remove from Gallery</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}

export default GalleryEditPage