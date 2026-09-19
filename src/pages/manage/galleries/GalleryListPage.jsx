import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { imageCollectionsApi } from '../../../services/management/imageCollectionsApi.js'
import { collectionCount, collectionPreview, errorMessage, formatManagementDate } from '../../../features/management/imageCollectionUtils.js'

function GalleryListPage() {
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadCollections() {
      setLoading(true)
      try {
        const data = await imageCollectionsApi.list()
        if (!active) return
        setCollections(data)
        setError('')
      } catch (errorValue) {
        if (active) setError(errorMessage(errorValue, 'Unable to load galleries.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    loadCollections()
    return () => { active = false }
  }, [])

  if (loading) {
    return <section className="management-page"><h1>Galleries</h1><div className="management-empty">Loading galleries...</div></section>
  }

  if (error) {
    return <section className="management-page"><h1>Galleries</h1><div className="management-error">{error}</div></section>
  }

  return (
    <section className="management-page">
      <div className="management-page-header">
        <div>
          <p className="eyebrow">Management</p>
          <h1>Galleries</h1>
        </div>
        <Link to="/manage/galleries/new" className="primary-button">Create Gallery</Link>
      </div>

      {!collections.length ? (
        <div className="management-empty">
          <p>No galleries found.</p>
          <Link to="/manage/galleries/new" className="primary-button">Create Gallery</Link>
        </div>
      ) : (
        <div className="gallery-list-grid">
          {collections.map((collection) => {
            const preview = collectionPreview(collection)
            const count = collectionCount(collection)
            return (
              <article className="gallery-list-card" key={collection.id}>
                <div className="gallery-list-preview">
                  {preview ? <img src={preview} alt="" /> : <span>No preview</span>}
                </div>
                <div className="gallery-list-copy">
                  <h2>{collection.title || 'Untitled gallery'}</h2>
                  <p>{count} {count === 1 ? 'image' : 'images'}</p>
                  <p>Created {formatManagementDate(collection.created_at || collection.created)}</p>
                </div>
                <Link to={`/manage/galleries/${collection.id}/edit`} className="secondary-button small-button">Edit</Link>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default GalleryListPage