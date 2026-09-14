import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../../services/apiClient.js'
import { managementApis } from '../../services/management/index.js'
import { getEntityConfig, slugify } from './entityConfig.js'
import PlaceCoordinatePicker from '../map/components/PlaceCoordinatePicker.jsx'
import { isValidLatitude, isValidLongitude } from '../map/mapGeometry.js'

const relationshipFields = {
  country: 'country',
  countries: 'countries',
  places: 'places',
  routes: 'routes',
  tours: 'tours',
  events: 'events',
  partners: 'partners',
  videos: 'videos',
}

function fieldLabel(name) {
  return name.replace(/_/g, ' ')
}

function getInitialValues(resourceKey, data = {}) {
  const config = getEntityConfig(resourceKey)
  const base = { ...config.defaultValues }

  Object.keys(base).forEach((key) => {
    if (data[key] !== undefined) {
      base[key] = data[key]
    }
  })

  if (resourceKey === 'routes' && Array.isArray(data.places)) {
    base.places = data.places.map((place) => ({
      place_id: place.place_id || place.placeId || place.id || '',
      position: place.position || 1,
    }))
  }

  if (resourceKey === 'routes') {
    const countryValue = data.country && typeof data.country === 'object'
      ? data.country.id
      : data.country || data.country_id || ''
    base.country = countryValue || ''
  }

  return base
}

function EntityFormPage({ resourceKey, title }) {
  const config = getEntityConfig(resourceKey)
  const api = managementApis[resourceKey]
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [relationshipOptions, setRelationshipOptions] = useState({})
  const [formData, setFormData] = useState(config.defaultValues)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [slugLocked, setSlugLocked] = useState(false)

  const relationshipNames = useMemo(() => {
    const names = []
    Object.keys(relationshipFields).forEach((key) => {
      names.push(key)
    })
    return names
  }, [])

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)

        const values = {}

        for (const key of relationshipNames) {
          try {
            const target = relationshipFields[key]
            if (!target) continue

            if (target === 'country' || target === 'countries') {
              const { data } = await apiClient.get('/api/offward/manage/countries/')
              values.country = Array.isArray(data) ? data : data.results || []
              values.countries = values.country
            }

            if (target === 'places') {
              const { data } = await apiClient.get('/api/offward/manage/places/')
              values.places = Array.isArray(data) ? data : data.results || []
            }

            if (target === 'routes') {
              const { data } = await apiClient.get('/api/offward/manage/routes/')
              values.routes = Array.isArray(data) ? data : data.results || []
            }

            if (target === 'events') {
              const { data } = await apiClient.get('/api/offward/manage/events/')
              values.events = Array.isArray(data) ? data : data.results || []
            }

            if (target === 'partners') {
              const { data } = await apiClient.get('/api/offward/manage/partners/')
              values.partners = Array.isArray(data) ? data : data.results || []
            }

            if (target === 'tours') {
              const { data } = await apiClient.get('/api/offward/manage/tours/')
              values.tours = Array.isArray(data) ? data : data.results || []
            }

            if (target === 'videos') {
              const { data } = await apiClient.get('/api/offward/manage/videos/')
              values.videos = Array.isArray(data) ? data : data.results || []
            }
          } catch {
            values[key] = []
          }
        }

        if (!active) return
        setRelationshipOptions(values)

        if (isEdit) {
          const item = await api.getById(id)
          if (!active) return
          setFormData(getInitialValues(resourceKey, item))
          if (item.slug) {
            setSlugLocked(Boolean(item.slug))
          }
        } else {
          setFormData(config.defaultValues)
        }
      } catch (err) {
        if (!active) return
        setError(err?.response?.data?.detail || 'Unable to load form data.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [api, config.defaultValues, id, isEdit, relationshipNames, resourceKey])

  const handleTextChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => {
      const next = { ...current, [name]: value }

      if (!slugLocked && !isEdit && (name === 'name' || name === 'title')) {
        next.slug = slugify(value)
      }

      return next
    })
  }

  const handleSlugInput = (event) => {
    const { value } = event.target
    setSlugLocked(true)
    setFormData((current) => ({ ...current, slug: value }))
  }

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target
    setFormData((current) => ({ ...current, [name]: checked }))
  }

  const handleArraySelection = (event, fieldName) => {
    const { value, checked } = event.target
    setFormData((current) => {
      const currentValue = Array.isArray(current[fieldName]) ? current[fieldName] : []
      const next = checked ? [...currentValue, value] : currentValue.filter((item) => item !== value)
      return { ...current, [fieldName]: next }
    })
  }

  const handleRouteStopChange = (index, field, value) => {
    setFormData((current) => {
      const nextStops = [...(current.places || [])]
      nextStops[index] = { ...nextStops[index], [field]: value }
      return { ...current, places: nextStops }
    })
  }

  const addRouteStop = () => {
    setFormData((current) => ({
      ...current,
      places: [...(current.places || []), { place_id: '', position: (current.places || []).length + 1 }],
    }))
  }

  const removeRouteStop = (index) => {
    setFormData((current) => ({
      ...current,
      places: (current.places || []).filter((_, currentIndex) => currentIndex !== index).map((place, placeIndex) => ({
        ...place,
        position: placeIndex + 1,
      })),
    }))
  }

  const moveRouteStop = (index, direction) => {
    setFormData((current) => {
      const stops = [...(current.places || [])]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= stops.length) {
        return current
      }
      const currentItem = stops[index]
      stops[index] = stops[targetIndex]
      stops[targetIndex] = currentItem
      return { ...current, places: stops.map((item, itemIndex) => ({ ...item, position: itemIndex + 1 })) }
    })
  }

  const handleCoordinatesChange = ({ latitude, longitude }) => {
    setFormData((current) => ({
      ...current,
      latitude: latitude ?? '',
      longitude: longitude ?? '',
    }))

    setFieldErrors((current) => {
      if (!current.latitude && !current.longitude) return current
      const next = { ...current }
      if (isValidLatitude(latitude)) delete next.latitude
      if (isValidLongitude(longitude)) delete next.longitude
      return next
    })
  }

  const buildPayload = () => {
    const payload = { ...formData }

    if (resourceKey === 'countries') {
      if (!payload.hero_media_id) delete payload.hero_media_id
    }

    if (resourceKey === 'places') {
      if (payload.latitude !== '' && payload.latitude !== null && payload.latitude !== undefined) {
        const latNum = Number(payload.latitude)
        if (Number.isFinite(latNum)) {
          payload.latitude = latNum
        } else {
          delete payload.latitude
        }
      }
      if (payload.longitude !== '' && payload.longitude !== null && payload.longitude !== undefined) {
        const lngNum = Number(payload.longitude)
        if (Number.isFinite(lngNum)) {
          payload.longitude = lngNum
        } else {
          delete payload.longitude
        }
      }
      if (!payload.visited_at) delete payload.visited_at
      if (!payload.country) delete payload.country
    }

    if (resourceKey === 'routes') {
      const places = (payload.places || [])
        .filter((item) => item && item.place_id)
        .map((item, index) => ({
          place_id: item.place_id,
          position: Number(item.position || index + 1),
        }))
      payload.places = places
      if (payload.path && typeof payload.path === 'string' && payload.path.trim()) {
        try {
          payload.path = JSON.parse(payload.path)
        } catch {
          // Keep the raw path value if the backend expects a string fallback.
        }
      }
    }

    if (resourceKey === 'stories') {
      if (Array.isArray(payload.places)) {
        payload.places = payload.places.map((value) => value)
      }
      if (Array.isArray(payload.routes)) {
        payload.routes = payload.routes.map((value) => value)
      }
    }

    Object.keys(payload).forEach((key) => {
      if (Array.isArray(payload[key]) && !payload[key].length) {
        payload[key] = []
      }
      if (payload[key] === '' || payload[key] === null) {
        if (key !== 'slug' && key !== 'country' && key !== 'summary' && key !== 'body' && key !== 'excerpt') {
          delete payload[key]
        }
      }
    })

    if (!payload.slug) {
      delete payload.slug
    }

    return payload
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (resourceKey === 'places') {
      const nextErrors = {}
      if (formData.latitude !== '' && formData.latitude !== null && formData.latitude !== undefined) {
        const lat = Number(formData.latitude)
        if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
          nextErrors.latitude = 'Latitude must be a valid number between -90 and 90.'
        }
      }
      if (formData.longitude !== '' && formData.longitude !== null && formData.longitude !== undefined) {
        const lng = Number(formData.longitude)
        if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
          nextErrors.longitude = 'Longitude must be a valid number between -180 and 180.'
        }
      }
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors)
        setError('Please fix validation errors before saving.')
        return
      }
    }

    setSubmitting(true)
    setError('')
    setFieldErrors({})

    try {
      const payload = buildPayload()
      if (isEdit) {
        await api.update(id, payload)
      } else {
        await api.create(payload)
      }
      navigate(`/manage/${resourceKey}`)
    } catch (err) {
      const responseData = err?.response?.data || {}
      setError(responseData.detail || 'Unable to save this record.')

      if (responseData && typeof responseData === 'object') {
        const nextErrors = {}
        Object.entries(responseData).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            nextErrors[key] = value.join(' ')
          } else if (typeof value === 'string') {
            nextErrors[key] = value
          }
        })
        setFieldErrors(nextErrors)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <section className="management-page"><h1>{title}</h1><div className="management-empty">Loading form…</div></section>
  }

  const renderField = (key, fieldType = 'text') => {
    const value = formData[key] ?? ''
    const fieldError = fieldErrors[key]
    const commonProps = {
      id: key,
      name: key,
      value,
      onChange: handleTextChange,
      className: fieldError ? 'form-input field-error' : 'form-input',
      placeholder: fieldLabel(key),
    }

    if (key === 'slug') {
      return (
        <div key={key} className="form-field">
          <label htmlFor={key}>Slug</label>
          <input
            {...commonProps}
            onChange={handleSlugInput}
          />
          {fieldError && <span className="field-error-text">{fieldError}</span>}
        </div>
      )
    }

    if (fieldType === 'textarea') {
      return (
        <div key={key} className="form-field">
          <label htmlFor={key}>{fieldLabel(key)}</label>
          <textarea {...commonProps} rows="6" />
          {fieldError && <span className="field-error-text">{fieldError}</span>}
        </div>
      )
    }

    if (fieldType === 'checkbox') {
      return (
        <div key={key} className="form-field checkbox-field">
          <label htmlFor={key}>
            <input
              id={key}
              name={key}
              type="checkbox"
              checked={Boolean(value)}
              onChange={handleCheckboxChange}
            />
            {fieldLabel(key)}
          </label>
          {fieldError && <span className="field-error-text">{fieldError}</span>}
        </div>
      )
    }

    if (fieldType === 'select' && relationshipOptions[key]) {
      return (
        <div key={key} className="form-field">
          <label htmlFor={key}>{fieldLabel(key)}</label>
          <select
            id={key}
            name={key}
            value={value}
            onChange={handleTextChange}
            className={fieldError ? 'form-input field-error' : 'form-input'}
          >
            <option value="">Select {fieldLabel(key)}</option>
            {relationshipOptions[key].map((item) => (
              <option key={item.id} value={item.id}>{item.name || item.title || item.slug || item.id}</option>
            ))}
          </select>
          {fieldError && <span className="field-error-text">{fieldError}</span>}
        </div>
      )
    }

    if (fieldType === 'select' && key === 'status') {
      const statusOptions = ['draft', 'active', 'upcoming', 'inactive', 'completed', 'archived']
      return (
        <div key={key} className="form-field">
          <label htmlFor={key}>{fieldLabel(key)}</label>
          <select id={key} name={key} value={value} onChange={handleTextChange} className={fieldError ? 'form-input field-error' : 'form-input'}>
            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          {fieldError && <span className="field-error-text">{fieldError}</span>}
        </div>
      )
    }

    if (fieldType === 'select' && key === 'lifecycle_status') {
      const statuses = ['upcoming', 'active', 'completed']
      return (
        <div key={key} className="form-field">
          <label htmlFor={key}>{fieldLabel(key)}</label>
          <select id={key} name={key} value={value} onChange={handleTextChange} className={fieldError ? 'form-input field-error' : 'form-input'}>
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          {fieldError && <span className="field-error-text">{fieldError}</span>}
        </div>
      )
    }

    if (fieldType === 'select' && key === 'activity_type') {
      const options = ['motorcycle', 'hiking', 'car', 'boat', 'cycling', 'walking']
      return (
        <div key={key} className="form-field">
          <label htmlFor={key}>{fieldLabel(key)}</label>
          <select id={key} name={key} value={value} onChange={handleTextChange} className={fieldError ? 'form-input field-error' : 'form-input'}>
            {options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          {fieldError && <span className="field-error-text">{fieldError}</span>}
        </div>
      )
    }

    if (fieldType === 'multi-select' && relationshipOptions[key]) {
      return (
        <div key={key} className="form-field">
          <label>{fieldLabel(key)}</label>
          <div className="checkbox-list">
            {relationshipOptions[key].map((item) => {
              const selectedValues = Array.isArray(formData[key]) ? formData[key] : []
              const isChecked = selectedValues.includes(item.id)
              return (
                <label key={item.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    value={item.id}
                    onChange={(event) => handleArraySelection(event, key)}
                  />
                  <span>{item.name || item.title || item.slug || item.id}</span>
                </label>
              )
            })}
          </div>
          {fieldError && <span className="field-error-text">{fieldError}</span>}
        </div>
      )
    }

    if (fieldType === 'number') {
      return (
        <div key={key} className="form-field">
          <label htmlFor={key}>{fieldLabel(key)}</label>
          <input {...commonProps} type="number" step="any" />
          {fieldError && <span className="field-error-text">{fieldError}</span>}
        </div>
      )
    }

    return (
      <div key={key} className="form-field">
        <label htmlFor={key}>{fieldLabel(key)}</label>
        <input {...commonProps} type="text" />
        {fieldError && <span className="field-error-text">{fieldError}</span>}
      </div>
    )
  }

  const renderFormFields = () => {
    switch (resourceKey) {
      case 'countries':
        return [
          renderField('name'),
          renderField('slug'),
          renderField('code'),
          renderField('summary', 'textarea'),
          renderField('status', 'select'),
          renderField('hero_media_id'),
        ]
      case 'places':
        return [
          renderField('country', 'select'),
          renderField('name'),
          renderField('slug'),
          renderField('summary', 'textarea'),
          renderField('body', 'textarea'),
          <PlaceCoordinatePicker
            key="place-coordinate-picker"
            latitude={formData.latitude}
            longitude={formData.longitude}
            onChange={handleCoordinatesChange}
            disabled={submitting}
          />,
          renderField('latitude', 'number'),
          renderField('longitude', 'number'),
          renderField('visited_at', 'text'),
          renderField('status', 'select'),
        ]
      case 'routes':
        return [
          renderField('country', 'select'),
          renderField('title'),
          renderField('slug'),
          renderField('summary', 'textarea'),
          renderField('activity_type', 'select'),
          renderField('status', 'select'),
          renderField('path', 'textarea'),
          <div key="route-stops" className="form-field">
            <label>Ordered stops</label>
            <div className="route-stops-list">
              {(formData.places || []).map((stop, index) => (
                <div key={`route-stop-${index}`} className="route-stop-row">
                  <label>Stop {index + 1}</label>
                  <select
                    value={stop.place_id || ''}
                    onChange={(event) => handleRouteStopChange(index, 'place_id', event.target.value)}
                    className="form-input"
                  >
                    <option value="">Select place</option>
                    {(relationshipOptions.places || []).map((place) => (
                      <option key={place.id} value={place.id}>{place.name || place.title || place.id}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={stop.position || index + 1}
                    onChange={(event) => handleRouteStopChange(index, 'position', Number(event.target.value))}
                    className="form-input small-number"
                  />
                  <div className="route-stop-actions">
                    <button type="button" className="secondary-button small-button" onClick={() => moveRouteStop(index, -1)}>Up</button>
                    <button type="button" className="secondary-button small-button" onClick={() => moveRouteStop(index, 1)}>Down</button>
                    <button type="button" className="danger-button small-button" onClick={() => removeRouteStop(index)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="secondary-button small-button" onClick={addRouteStop}>Add stop</button>
          </div>,
        ]
      case 'stories':
        return [
          renderField('country', 'select'),
          renderField('title'),
          renderField('slug'),
          renderField('excerpt', 'textarea'),
          renderField('body', 'textarea'),
          renderField('published_at', 'text'),
          renderField('status', 'select'),
          renderField('places', 'multi-select'),
          renderField('routes', 'multi-select'),
          renderField('events', 'multi-select'),
          renderField('tours', 'multi-select'),
          renderField('videos', 'multi-select'),
        ]
      case 'videos':
        return [
          renderField('title'),
          renderField('slug'),
          renderField('provider'),
          renderField('provider_id'),
          renderField('thumbnail'),
          renderField('duration'),
          renderField('published_at', 'text'),
          renderField('status', 'select'),
        ]
      case 'tours':
        return [
          renderField('country', 'select'),
          renderField('title'),
          renderField('slug'),
          renderField('summary', 'textarea'),
          renderField('enquiry_open', 'checkbox'),
          renderField('status', 'select'),
          renderField('routes', 'multi-select'),
          renderField('places', 'multi-select'),
          renderField('videos', 'multi-select'),
        ]
      case 'events':
        return [
          renderField('country', 'select'),
          renderField('type'),
          renderField('title'),
          renderField('slug'),
          renderField('summary', 'textarea'),
          renderField('starts_at', 'text'),
          renderField('ends_at', 'text'),
          renderField('lifecycle_status', 'select'),
          renderField('status', 'select'),
          renderField('routes', 'multi-select'),
          renderField('places', 'multi-select'),
          renderField('partners', 'multi-select'),
          renderField('videos', 'multi-select'),
        ]
      case 'partners':
        return [
          renderField('name'),
          renderField('slug'),
          renderField('website'),
          renderField('logo_media_id'),
          renderField('summary', 'textarea'),
          renderField('status', 'select'),
        ]
      default:
        return []
    }
  }

  return (
    <section className="management-page">
      <div className="management-page-header">
        <div>
          <p className="eyebrow">Management</p>
          <h1>{title}</h1>
        </div>
        <Link to={`/manage/${resourceKey}`} className="secondary-button">
          Back to list
        </Link>
      </div>
      {resourceKey === 'routes' && isEdit && (
        <div className="management-related-actions">
          <div>
            <p className="eyebrow">Route map</p>
            <strong>Waypoints, candidate calculation and accepted geometry</strong>
          </div>
          <Link to={`/manage/routes/${id}/map`} className="secondary-button">
            Edit route map
          </Link>
        </div>
      )}

      {error && <div className="management-error">{error}</div>}

      <form className="management-form" onSubmit={handleSubmit}>
        {renderFormFields()}

        <div className="management-form-actions">
          <button type="button" className="secondary-button" onClick={() => navigate(`/manage/${resourceKey}`)}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default EntityFormPage
