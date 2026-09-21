import { useEffect, useMemo, useState } from 'react'
import ImageLightbox from '../../shared/components/ImageLightbox.jsx'
import { imageCollectionsApi } from '../../services/management/imageCollectionsApi.js'
import { collectionCount, collectionPreview, errorMessage } from './imageCollectionUtils.js'

function normalizeIds(ids) {
  return (Array.isArray(ids) ? ids : []).filter(Boolean).map(String)
}

function GalleryAttachmentManager({ ownerType, ownerId, attachedCollectionIds = [], onAttach, onDetach, onPreview, disabled = false, persistImmediately = false }) {
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [persistenceStatus, setPersistenceStatus] = useState('idle')
  const [persistenceError, setPersistenceError] = useState('')
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [previewCollection, setPreviewCollection] = useState(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const selectedIds = useMemo(() => normalizeIds(attachedCollectionIds), [attachedCollectionIds])
  const collectionById = useMemo(() => new Map(collections.map((collection) => [String(collection.id), collection])), [collections])
  const attachedCollections = selectedIds.map((id) => collectionById.get(id)).filter(Boolean)

  useEffect(() => {
    let active = true
    imageCollectionsApi.list()
      .then((nextCollections) => {
        if (active) setCollections(nextCollections)
      })
      .catch((errorValue) => {
        if (active) setError(errorMessage(errorValue, 'Image galleries are unavailable right now.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const openPreview = async (collection) => {
    onPreview?.(collection)
    try {
      const detail = await imageCollectionsApi.getById(collection.id)
      setPreviewCollection(detail)
    } catch {
      setPreviewCollection(collection)
    }
    setPreviewIndex(0)
  }

  const persistChange = async (callback, collection) => {
    if (!callback || persistenceStatus === 'saving') return
    if (!persistImmediately) {
      callback(collection)
      return
    }

    setPersistenceStatus('saving')
    setPersistenceError('')
    try {
      await callback(collection)
      setPersistenceStatus('saved')
    } catch (errorValue) {
      setPersistenceStatus('idle')
      setPersistenceError(errorMessage(errorValue, 'Unable to save gallery attachments.'))
    }
  }

  const handleAttach = (collection) => {
    if (!selectedIds.includes(String(collection.id))) persistChange(onAttach, collection)
  }

  const isSaving = persistenceStatus === 'saving'

  return (
    <section className="gallery-attachment-manager" aria-label={`Galleries for ${ownerType || 'content'} ${ownerId || ''}`}>
      <div className="gallery-attachment-header">
        <div><p className="eyebrow">Galleries</p><h3>Attached galleries</h3></div>
        <button type="button" className="secondary-button small-button" onClick={() => setIsPickerOpen((open) => !open)} disabled={disabled || isSaving} aria-expanded={isPickerOpen}>
          {isPickerOpen ? 'Close picker' : '+ Add gallery'}
        </button>
      </div>

      {error && <p className="content-image-error" role="alert">{error}</p>}
      {persistenceError && <p className="content-image-error" role="alert">{persistenceError}</p>}
      {persistImmediately && persistenceStatus !== 'idle' && (
        <p className="content-image-status" role="status">{isSaving ? 'Saving...' : 'Saved'}</p>
      )}
      {!attachedCollections.length && <p className="content-image-empty">No galleries attached yet.</p>}
      {attachedCollections.length > 0 && (
        <div className="gallery-attachment-grid">
          {attachedCollections.map((collection) => (
            <article className="gallery-attachment-card" key={collection.id}>
              <div className="gallery-attachment-thumb">
                {collectionPreview(collection) ? <img src={collectionPreview(collection)} alt="" /> : <span>No preview</span>}
              </div>
              <div className="gallery-attachment-details">
                <strong>{collection.title || 'Untitled gallery'}</strong>
                <span>{collectionCount(collection)} {collectionCount(collection) === 1 ? 'photo' : 'photos'}</span>
              </div>
              <div className="gallery-attachment-actions">
                <button type="button" className="secondary-button small-button" onClick={() => openPreview(collection)}>Preview</button>
                <button type="button" className="danger-button small-button" onClick={() => persistChange(onDetach, collection)} disabled={disabled || isSaving}>Remove</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {isPickerOpen && (
        <div className="gallery-attachment-picker">
          <div className="gallery-attachment-picker-header"><strong>Choose an existing gallery</strong><span>Create and edit galleries in Gallery management.</span></div>
          {loading && <p className="content-image-status">Loading image galleries…</p>}
          {!loading && !collections.length && <p className="content-image-empty">No image galleries yet.</p>}
          {!loading && collections.length > 0 && (
            <div className="gallery-attachment-picker-grid">
              {collections.map((collection) => {
                const attached = selectedIds.includes(String(collection.id))
                return (
                  <button type="button" className={attached ? 'content-image-picker-card is-selected' : 'content-image-picker-card'} key={collection.id} onClick={() => handleAttach(collection)} disabled={disabled || isSaving || attached} aria-pressed={attached}>
                    <div className="content-image-picker-preview">{collectionPreview(collection) ? <img src={collectionPreview(collection)} alt="" /> : <span>No preview</span>}</div>
                    <strong>{collection.title || 'Untitled gallery'}</strong>
                    <span>{collectionCount(collection)} {collectionCount(collection) === 1 ? 'photo' : 'photos'}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <ImageLightbox
        images={previewCollection?.images || []}
        activeIndex={previewIndex}
        isOpen={Boolean(previewCollection)}
        onClose={() => setPreviewCollection(null)}
        onPrevious={() => setPreviewIndex((index) => Math.max(0, index - 1))}
        onNext={() => setPreviewIndex((index) => Math.min((previewCollection?.images?.length || 1) - 1, index + 1))}
      />
    </section>
  )
}

export default GalleryAttachmentManager
