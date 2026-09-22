import { useState } from 'react'
import { submitContactMessage } from '../services/contactApi.js'

const CONTACT_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'route', label: 'Route' },
  { value: 'story', label: 'Story' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'tour', label: 'Tour' },
  { value: 'technical', label: 'Technical' },
]

const EMPTY_FORM = {
  name: '',
  email: '',
  category: 'general',
  subject: '',
  message: '',
  honeypot: '',
}

const FIELD_NAMES = ['name', 'email', 'category', 'subject', 'message', 'honeypot']
const GENERIC_ERROR = 'Unable to send your message right now. Please try again.'
const RATE_LIMIT_ERROR = 'Too many messages have been sent. Please try again later.'

function normalizeMessages(value) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.flatMap(normalizeMessages)
  }
  if (typeof value === 'string') {
    return [value]
  }
  if (typeof value === 'object') {
    return Object.values(value).flatMap(normalizeMessages)
  }
  return [String(value)]
}

function normalizeValidationErrors(payload) {
  const fieldErrors = {}
  const formErrors = []

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { fieldErrors, formErrors: normalizeMessages(payload) }
  }

  FIELD_NAMES.forEach((fieldName) => {
    const messages = normalizeMessages(payload[fieldName])
    if (messages.length > 0) {
      fieldErrors[fieldName] = messages.join(' ')
      if (fieldName === 'honeypot') {
        formErrors.push(...messages)
      }
    }
  })

  formErrors.push(...normalizeMessages(payload.non_field_errors))
  formErrors.push(...normalizeMessages(payload.detail))
  formErrors.push(...normalizeMessages(payload.error))

  return { fieldErrors, formErrors }
}

function ContactPage() {
  const [formValues, setFormValues] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateField = (fieldName, value) => {
    setFormValues((current) => ({ ...current, [fieldName]: value }))
    setFieldErrors((current) => {
      if (!current[fieldName]) return current
      const next = { ...current }
      delete next[fieldName]
      return next
    })
    setFormError('')
    setSuccessMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setFieldErrors({})
    setFormError('')
    setSuccessMessage('')

    const payload = {
      name: formValues.name.trim(),
      email: formValues.email.trim(),
      subject: formValues.subject.trim(),
      category: formValues.category,
      message: formValues.message.trim(),
      honeypot: formValues.honeypot,
    }

    try {
      await submitContactMessage(payload)
      setFormValues(EMPTY_FORM)
      setSuccessMessage('Thanks for reaching out. Your message has been sent.')
    } catch (error) {
      const status = error?.response?.status

      if (status === 400) {
        const validationErrors = normalizeValidationErrors(error.response?.data)
        setFieldErrors(validationErrors.fieldErrors)
        setFormError(validationErrors.formErrors[0] || 'Please review the highlighted fields and try again.')
      } else if (status === 429) {
        setFormError(RATE_LIMIT_ERROR)
      } else {
        setFormError(GENERIC_ERROR)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="contact-page">
      <div className="contact-intro">
        <p className="eyebrow">CONTACT OFFWARD</p>
        <h1>Send a note from the road.</h1>
        <p>
          Questions, route notes, story leads, tour ideas, sponsor conversations, and technical issues all land here.
        </p>
      </div>

      <form className="contact-form" onSubmit={handleSubmit} noValidate>
        {successMessage && <div className="contact-alert contact-alert-success" role="status">{successMessage}</div>}
        {formError && <div className="contact-alert contact-alert-error" role="alert">{formError}</div>}

        <div className="contact-form-grid">
          <label className="contact-field" htmlFor="contact-name">
            <span>Name</span>
            <input
              id="contact-name"
              className={fieldErrors.name ? 'form-input field-error' : 'form-input'}
              type="text"
              value={formValues.name}
              onChange={(event) => updateField('name', event.target.value)}
              autoComplete="name"
              aria-invalid={fieldErrors.name ? 'true' : undefined}
              aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
            />
            {fieldErrors.name && <span id="contact-name-error" className="field-error-text">{fieldErrors.name}</span>}
          </label>

          <label className="contact-field" htmlFor="contact-email">
            <span>Email</span>
            <input
              id="contact-email"
              className={fieldErrors.email ? 'form-input field-error' : 'form-input'}
              type="email"
              value={formValues.email}
              onChange={(event) => updateField('email', event.target.value)}
              autoComplete="email"
              aria-invalid={fieldErrors.email ? 'true' : undefined}
              aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
            />
            {fieldErrors.email && <span id="contact-email-error" className="field-error-text">{fieldErrors.email}</span>}
          </label>
        </div>

        <div className="contact-form-grid">
          <label className="contact-field" htmlFor="contact-category">
            <span>Category</span>
            <select
              id="contact-category"
              className={fieldErrors.category ? 'form-input field-error' : 'form-input'}
              value={formValues.category}
              onChange={(event) => updateField('category', event.target.value)}
              aria-invalid={fieldErrors.category ? 'true' : undefined}
              aria-describedby={fieldErrors.category ? 'contact-category-error' : undefined}
            >
              {CONTACT_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
            {fieldErrors.category && <span id="contact-category-error" className="field-error-text">{fieldErrors.category}</span>}
          </label>

          <label className="contact-field" htmlFor="contact-subject">
            <span>Subject</span>
            <input
              id="contact-subject"
              className={fieldErrors.subject ? 'form-input field-error' : 'form-input'}
              type="text"
              value={formValues.subject}
              onChange={(event) => updateField('subject', event.target.value)}
              autoComplete="off"
              aria-invalid={fieldErrors.subject ? 'true' : undefined}
              aria-describedby={fieldErrors.subject ? 'contact-subject-error' : undefined}
            />
            {fieldErrors.subject && <span id="contact-subject-error" className="field-error-text">{fieldErrors.subject}</span>}
          </label>
        </div>

        <label className="contact-field" htmlFor="contact-message">
          <span>Message</span>
          <textarea
            id="contact-message"
            className={fieldErrors.message ? 'form-input field-error contact-message-input' : 'form-input contact-message-input'}
            value={formValues.message}
            onChange={(event) => updateField('message', event.target.value)}
            rows="8"
            aria-invalid={fieldErrors.message ? 'true' : undefined}
            aria-describedby={fieldErrors.message ? 'contact-message-error' : undefined}
          />
          {fieldErrors.message && <span id="contact-message-error" className="field-error-text">{fieldErrors.message}</span>}
        </label>

        <div className="contact-honeypot" aria-hidden="true">
          <label htmlFor="contact-honeypot">Leave this field blank</label>
          <input
            id="contact-honeypot"
            type="text"
            name="honeypot"
            value={formValues.honeypot}
            onChange={(event) => updateField('honeypot', event.target.value)}
            autoComplete="off"
            tabIndex="-1"
          />
        </div>

        <div className="contact-actions">
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send message'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default ContactPage