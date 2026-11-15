import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatManagementDate } from '../../../features/management/imageCollectionUtils.js'
import { normalizeDisplayValue } from '../../../features/management/entityConfig.js'
import { contactMessagesApi } from '../../../services/management/contactMessagesApi.js'

const categories = [
  'general',
  'route',
  'story',
  'partnership',
  'sponsor',
  'tour',
  'technical',
]

const statusFilters = ['new', 'read']

function errorMessage(error, fallback) {
  return error?.response?.data?.detail || error?.message || fallback
}

function ContactMessagesListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') || ''
  const category = searchParams.get('category') || ''
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadMessages() {
      setLoading(true)
      try {
        const data = await contactMessagesApi.list({ status, category })
        if (!active) return
        setMessages(data)
        setError('')
      } catch (errorValue) {
        if (active) setError(errorMessage(errorValue, 'Unable to load contact messages.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    loadMessages()
    return () => { active = false }
  }, [status, category])

  const updateFilter = (name, value) => {
    const nextParams = new URLSearchParams(searchParams)
    if (value) {
      nextParams.set(name, value)
    } else {
      nextParams.delete(name)
    }
    setSearchParams(nextParams)
  }

  return (
    <section className="management-page management-list-page">
      <div className="management-page-header">
        <div>
          <p className="eyebrow">Management</p>
          <h1>Messages</h1>
        </div>
      </div>

      <div className="management-filter-bar" aria-label="Message filters">
        <label className="form-field" htmlFor="message-status-filter">
          Status
          <select id="message-status-filter" className="form-input" value={status} onChange={(event) => updateFilter('status', event.target.value)}>
            <option value="">All statuses</option>
            {statusFilters.map((value) => <option key={value} value={value}>{normalizeDisplayValue(value)}</option>)}
          </select>
        </label>
        <label className="form-field" htmlFor="message-category-filter">
          Category
          <select id="message-category-filter" className="form-input" value={category} onChange={(event) => updateFilter('category', event.target.value)}>
            <option value="">All categories</option>
            {categories.map((value) => <option key={value} value={value}>{normalizeDisplayValue(value)}</option>)}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="management-empty">Loading messages...</div>
      ) : error ? (
        <div className="management-error">{error}</div>
      ) : !messages.length ? (
        <div className="management-empty">No contact messages found.</div>
      ) : (
        <div className="management-table-wrap">
          <table className="management-table" role="table">
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col" role="columnheader">sender name</th>
                <th scope="col" role="columnheader">sender email</th>
                <th scope="col" role="columnheader">subject</th>
                <th scope="col" role="columnheader">category</th>
                <th scope="col" role="columnheader">status</th>
                <th scope="col" role="columnheader">created at</th>
                <th scope="col" role="columnheader">Actions</th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {messages.map((message) => (
                <tr key={message.id} role="row">
                  <td role="cell"><span className="management-cell-label" aria-hidden="true">Sender name</span>{normalizeDisplayValue(message.name)}</td>
                  <td role="cell"><span className="management-cell-label" aria-hidden="true">Sender email</span>{normalizeDisplayValue(message.email)}</td>
                  <td role="cell"><span className="management-cell-label" aria-hidden="true">Subject</span>{normalizeDisplayValue(message.subject)}</td>
                  <td role="cell"><span className="management-cell-label" aria-hidden="true">Category</span>{normalizeDisplayValue(message.category)}</td>
                  <td role="cell"><span className="management-cell-label" aria-hidden="true">Status</span>{normalizeDisplayValue(message.status)}</td>
                  <td role="cell"><span className="management-cell-label" aria-hidden="true">Created at</span>{formatManagementDate(message.created_at)}</td>
                  <td role="cell">
                    <span className="management-cell-label" aria-hidden="true">Actions</span>
                    <Link to={`/manage/contact-messages/${message.id}`} className="secondary-button small-button">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default ContactMessagesListPage