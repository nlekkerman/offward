import { Link } from 'react-router-dom'
import { imageCollectionsApi } from '../../../services/management/imageCollectionsApi.js'
import { collectionCount, collectionPreview, formatManagementDate } from '../../../features/management/imageCollectionUtils.js'
import useManagementCatalog from '../../../features/management/useManagementCatalog.js'
import CatalogStatus from '../../../features/management/CatalogStatus.jsx'

export function GalleryListCard({ collection }) {
  const preview = collectionPreview(collection)
  const count = collectionCount(collection)
  return (
    <article className="gallery-list-card">
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
}

function GalleryListPage() {
  const catalog = useManagementCatalog(imageCollectionsApi)
  const { items: collections, loading, error } = catalog

  if (loading) {
    return <section className="management-page"><h1>Galleries</h1><div className="management-empty">Loading galleries...</div></section>
  }

  if (error && !collections.length) {
    return <section className="management-page"><h1>Galleries</h1><CatalogStatus catalog={catalog} label="galleries" /></section>
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
          {collections.map((collection) => <GalleryListCard key={collection.id} collection={collection} />)}
        </div>
      )}
      <CatalogStatus catalog={catalog} label="galleries" />
    </section>
  )
}

export default GalleryListPage