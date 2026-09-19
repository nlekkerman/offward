import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { imageCollectionsApi } from '../../../services/management/imageCollectionsApi.js'
import { errorMessage } from '../../../features/management/imageCollectionUtils.js'

function GalleryCreatePage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Enter a gallery title.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const created = await imageCollectionsApi.create({ title: trimmedTitle, description })
      navigate(`/manage/galleries/${created.id}/edit`)
    } catch (errorValue) {
      setError(errorMessage(errorValue, 'Unable to create this gallery.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="management-page">
      <div className="management-page-header">
        <div>
          <p className="eyebrow">Galleries</p>
          <h1>Create Gallery</h1>
        </div>
        <Link to="/manage/galleries" className="secondary-button">Back to Galleries</Link>
      </div>

      <form className="management-form gallery-form" onSubmit={handleSubmit}>
        {error && <div className="management-error" role="alert">{error}</div>}
        <label className="form-field" htmlFor="gallery-title">
          Title
          <input id="gallery-title" className="form-input" required value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="form-field" htmlFor="gallery-description">
          Description
          <textarea id="gallery-description" className="form-input" rows="6" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <div className="management-form-actions">
          <Link to="/manage/galleries" className="secondary-button">Cancel</Link>
          <button type="submit" className="primary-button" disabled={submitting}>{submitting ? 'Creating...' : 'Create Gallery'}</button>
        </div>
      </form>
    </section>
  )
}

export default GalleryCreatePage