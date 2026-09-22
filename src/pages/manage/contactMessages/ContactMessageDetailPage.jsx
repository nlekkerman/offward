import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatManagementDate } from '../../../features/management/imageCollectionUtils.js'
import { normalizeDisplayValue } from '../../../features/management/entityConfig.js'
import { contactMessagesApi } from '../../../services/management/contactMessagesApi.js'

function errorMessage(error, fallback) {
  return error?.response?.data?.detail || error?.message || fallback
}

function MessageField({ label, children }) {
  return (
    <div className="message-detail-field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function ContactMessageDetailPage() {
  const { id } = useParams()
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true

    async function loadMessage() {
      setLoading(true)
      try {
        const data = await contactMessagesApi.getById(id)
        if (!active) return
        setMessage(data)
        setError('')
      } catch (errorValue) {
        if (active) setError(errorMessage(errorValue, 'Unable to load this message.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    loadMessage()
    return () => { active = false }
  }, [id])

  const markRead = async () => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const data = await contactMessagesApi.updateStatus(id, 'read')
      setMessage((current) => ({ ...current, ...data, status: data?.status || 'read' }))
      setNotice('Message status updated to read.')
    } catch (errorValue) {
      setError(errorMessage(errorValue, 'Unable to update this message.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <section className="management-page"><h1>Message</h1><div className="management-empty">Loading message...</div></section>
  }

  if (error && !message) {
    return <section className="management-page"><h1>Message</h1><div className="management-error">{error}</div></section>
  }

  return (
    <section className="management-page message-detail-page">
      <div className="management-page-header">
        <div>
          <p className="eyebrow">Messages</p>
          <h1>{message?.subject || 'Contact message'}</h1>
        </div>
        <Link to="/manage/contact-messages" className="secondary-button">Back to Messages</Link>
      </div>

      {error && <div className="management-error" role="alert">{error}</div>}
      {notice && <p className="management-notice" role="status">{notice}</p>}

      <div className="message-detail-panel">
        <dl className="message-detail-grid">
          <MessageField label="Name">{normalizeDisplayValue(message?.name)}</MessageField>
          <MessageField label="Email">{normalizeDisplayValue(message?.email)}</MessageField>
          <MessageField label="Subject">{normalizeDisplayValue(message?.subject)}</MessageField>
          <MessageField label="Category">{normalizeDisplayValue(message?.category)}</MessageField>
          <MessageField label="Status">{normalizeDisplayValue(message?.status)}</MessageField>
          <MessageField label="Created at">{formatManagementDate(message?.created_at)}</MessageField>
          {message?.updated_at && <MessageField label="Updated at">{formatManagementDate(message.updated_at)}</MessageField>}
        </dl>

        <section className="message-detail-message" aria-label="Full message">
          <p className="eyebrow">Message</p>
          <p>{normalizeDisplayValue(message?.message)}</p>
        </section>

        <div className="management-form-actions">
          <button type="button" className="primary-button" onClick={markRead} disabled={saving || message?.status === 'read'}>
            {saving ? 'Updating...' : 'Mark as read'}
          </button>
        </div>
      </div>
    </section>
  )
}

export default ContactMessageDetailPage