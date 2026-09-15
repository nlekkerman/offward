import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../../services/apiClient.js'
import { managementApis } from '../../services/management/index.js'
import { routeMapApi } from '../../services/management/routeMapApi.js'
import { getEntityConfig, slugify } from './entityConfig.js'
import VideoUploadField from './VideoUploadField.jsx'
import ContentVideoManager from '../video/ContentVideoManager.jsx'
import VideoPlayer from '../video/VideoPlayer.jsx'
import PlaceCoordinatePicker from '../map/components/PlaceCoordinatePicker.jsx'
import { isValidLatitude, isValidLongitude } from '../map/mapGeometry.js'

const EMPTY_VIDEO_LOCATION = {
  latitude: '',
  longitude: '',
  place_id: '',
  route_id: '',
  segment_id: '',
  captured_at: '',
}

const VIDEO_ATTACHMENT_FIELDS = ['place_ids', 'route_ids', 'segment_ids', 'story_ids', 'tour_ids', 'event_ids']

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

function toDateTimeLocalValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toBackendDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

function formatPublishedAtDisplay(value) {
  if (!value) return 'Not yet published'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function hasVideoLocationValue(location) {
  return Object.values(location || {}).some((value) => value !== '' && value !== null && value !== undefined)
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

  if (Object.prototype.hasOwnProperty.call(base, 'country')) {
    const countryValue = data.country && typeof data.country === 'object'
      ? data.country.id
      : data.country || data.country_id || ''
    base.country = countryValue || ''
  }

  if (resourceKey === 'videos') {
    base.location = data.location && typeof data.location === 'object'
      ? { ...EMPTY_VIDEO_LOCATION, ...data.location, captured_at: toDateTimeLocalValue(data.location.captured_at) }
      : { ...EMPTY_VIDEO_LOCATION }
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
  const [videoLocationIntent, setVideoLocationIntent] = useState('omit')
  const [videoAttachments, setVideoAttachments] = useState({})
  const [videoSegments, setVideoSegments] = useState([])
  const [videoSegmentsLoading, setVideoSegmentsLoading] = useState(false)
  const [videoUploadStatus, setVideoUploadStatus] = useState('idle')

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
          if (resourceKey === 'videos') {
            setVideoAttachments(item)
            setVideoLocationIntent('omit')
            setVideoSegmentsLoading(Boolean(item.location?.route_id))
          }
          if (item.slug) {
            setSlugLocked(Boolean(item.slug))
          }
        } else {
          setFormData(config.defaultValues)
          if (resourceKey === 'videos') {
            setVideoAttachments({})
            setVideoLocationIntent('omit')
          }
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

  const videoRouteId = resourceKey === 'videos' ? formData.location?.route_id : ''

  useEffect(() => {
    if (resourceKey !== 'videos' || !videoRouteId) {
      return undefined
    }

    let active = true

    routeMapApi.getSegments(videoRouteId)
      .then((segments) => {
        if (!active) return
        setVideoSegments(segments)
        setFormData((current) => {
          const segmentId = current.location?.segment_id
          if (!segmentId || segments.some((segment) => String(segment.id) === String(segmentId))) {
            return current
          }
          return { ...current, location: { ...current.location, segment_id: '' } }
        })
      })
      .catch(() => {
        if (active) {
          setVideoSegments([])
          setFormData((current) => ({ ...current, location: { ...current.location, segment_id: '' } }))
        }
      })
      .finally(() => {
        if (active) setVideoSegmentsLoading(false)
      })

    return () => {
      active = false
    }
  }, [resourceKey, videoRouteId])

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

  const handleVideoLocationChange = (field, value) => {
    setVideoLocationIntent('set')
    setFormData((current) => ({
      ...current,
      location: { ...EMPTY_VIDEO_LOCATION, ...(current.location || {}), [field]: value },
    }))
  }

  const handleVideoRouteChange = (event) => {
    const { value } = event.target
    setVideoLocationIntent('set')
    setVideoSegmentsLoading(Boolean(value))
    setFormData((current) => ({
      ...current,
      location: { ...EMPTY_VIDEO_LOCATION, ...(current.location || {}), route_id: value, segment_id: '' },
    }))
  }

  const handleVideoCoordinatesChange = ({ latitude, longitude }) => {
    setVideoLocationIntent('set')
    setFormData((current) => ({
      ...current,
      location: { ...EMPTY_VIDEO_LOCATION, ...(current.location || {}), latitude: latitude ?? '', longitude: longitude ?? '' },
    }))
  }

  const handleVideoUploadSuccess = (session) => {
    if (!session) {
      setFormData((current) => ({ ...current, provider: 'cloudflare', provider_id: '' }))
      return
    }

    setFormData((current) => ({
      ...current,
      provider: session.provider,
      provider_id: session.provider_id,
    }))
  }

  const getVideoSubmitBlockReason = () => {
    if (isEdit || resourceKey !== 'videos') return ''
    if (videoUploadStatus === 'requesting') return 'Preparing the video upload. Please wait.'
    if (videoUploadStatus === 'uploading') return 'The video is still uploading. Please wait for it to finish.'
    if (videoUploadStatus === 'error') return 'The video upload failed. Retry the upload before creating this Video.'
    if (videoUploadStatus !== 'success') return 'Upload the video first.'
    if (formData.provider !== 'cloudflare') return 'The uploaded video provider must be Cloudflare.'
    if (!formData.provider_id) return 'Provider ID is missing. Upload the video again.'
    if (!formData.title?.trim()) return 'Title is required.'
    return ''
  }

  const clearVideoLocation = () => {
    setVideoLocationIntent('clear')
    setFormData((current) => ({ ...current, location: { ...EMPTY_VIDEO_LOCATION } }))
    setFieldErrors((current) => {
      const next = { ...current }
      delete next['location.latitude']
      delete next['location.longitude']
      return next
    })
  }

  const buildVideoLocation = () => {
    const location = formData.location || EMPTY_VIDEO_LOCATION
    const payload = {}

    if (location.latitude !== '' && location.latitude !== null && location.latitude !== undefined) {
      payload.latitude = Number(location.latitude)
    }
    if (location.longitude !== '' && location.longitude !== null && location.longitude !== undefined) {
      payload.longitude = Number(location.longitude)
    }
    if (location.place_id) payload.place_id = location.place_id
    if (location.route_id) payload.route_id = location.route_id
    if (location.segment_id) payload.segment_id = location.segment_id
    if (location.captured_at) payload.captured_at = toBackendDateTime(location.captured_at)

    return payload
  }

  const buildPayload = () => {
    const payload = { ...formData }

    // The backend owns first-publish timestamp assignment; never submit a frontend value.
    if (Object.prototype.hasOwnProperty.call(payload, 'published_at')) {
      delete payload.published_at
    }

    if (resourceKey === 'videos') {
      delete payload.location
      delete payload.playback_url
      delete payload.thumbnail_url
      VIDEO_ATTACHMENT_FIELDS.forEach((field) => delete payload[field])
    }

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

    if (resourceKey === 'videos') {
      if (videoLocationIntent === 'clear') {
        payload.location = null
      } else if (videoLocationIntent === 'set') {
        const location = buildVideoLocation()
        if (hasVideoLocationValue(location)) {
          payload.location = location
        } else if (!isEdit) {
          delete payload.location
        }
      }
    }

    return payload
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const videoSubmitBlockReason = getVideoSubmitBlockReason()
    if (videoSubmitBlockReason) {
      setError(videoSubmitBlockReason)
      return
    }

    if (resourceKey === 'places' || resourceKey === 'videos') {
      const nextErrors = {}
      const location = resourceKey === 'videos' ? formData.location || EMPTY_VIDEO_LOCATION : formData
      if (location.latitude !== '' && location.latitude !== null && location.latitude !== undefined) {
        const lat = Number(location.latitude)
        if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
          nextErrors[resourceKey === 'videos' ? 'location.latitude' : 'latitude'] = 'Latitude must be a valid number between -90 and 90.'
        }
      }
      if (location.longitude !== '' && location.longitude !== null && location.longitude !== undefined) {
        const lng = Number(location.longitude)
        if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
          nextErrors[resourceKey === 'videos' ? 'location.longitude' : 'longitude'] = 'Longitude must be a valid number between -180 and 180.'
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
      const responseMessage = typeof responseData === 'string' ? responseData : responseData.detail
      setError(responseMessage || err?.message || 'Unable to save this record.')

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

  const renderVideoLocation = () => {
    const location = formData.location || EMPTY_VIDEO_LOCATION
    const latitudeError = fieldErrors['location.latitude']
    const longitudeError = fieldErrors['location.longitude']
    const selectClass = (field) => fieldErrors[`location.${field}`] ? 'form-input field-error' : 'form-input'
    const renderLocationSelect = (field, label, options, onChange = (event) => handleVideoLocationChange(field, event.target.value), disabled = false) => (
      <div key={field} className="form-field">
        <label htmlFor={`video-location-${field}`}>{label}</label>
        <select
          id={`video-location-${field}`}
          value={location[field] || ''}
          onChange={onChange}
          className={selectClass(field)}
          disabled={disabled}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((item) => (
            <option key={item.id} value={item.id}>{item.name || item.title || item.slug || item.id}</option>
          ))}
        </select>
        {fieldErrors[`location.${field}`] && <span className="field-error-text">{fieldErrors[`location.${field}`]}</span>}
      </div>
    )

    return (
      <div key="video-location" className="management-related-actions video-location-section">
        <div>
          <p className="eyebrow">Location</p>
          <strong>Optional capture location</strong>
        </div>
        <PlaceCoordinatePicker
          latitude={location.latitude}
          longitude={location.longitude}
          onChange={handleVideoCoordinatesChange}
          disabled={submitting}
        />
        <div className="video-location-fields">
          <div className="form-field">
            <label htmlFor="video-location-latitude">Latitude</label>
            <input
              id="video-location-latitude"
              type="number"
              step="any"
              value={location.latitude}
              onChange={(event) => handleVideoLocationChange('latitude', event.target.value)}
              className={latitudeError ? 'form-input field-error' : 'form-input'}
            />
            {latitudeError && <span className="field-error-text">{latitudeError}</span>}
          </div>
          <div className="form-field">
            <label htmlFor="video-location-longitude">Longitude</label>
            <input
              id="video-location-longitude"
              type="number"
              step="any"
              value={location.longitude}
              onChange={(event) => handleVideoLocationChange('longitude', event.target.value)}
              className={longitudeError ? 'form-input field-error' : 'form-input'}
            />
            {longitudeError && <span className="field-error-text">{longitudeError}</span>}
          </div>
          {renderLocationSelect('place_id', 'Place', relationshipOptions.places || [])}
          {renderLocationSelect('route_id', 'Route', relationshipOptions.routes || [], handleVideoRouteChange)}
          {renderLocationSelect('segment_id', 'Segment', videoSegments, (event) => handleVideoLocationChange('segment_id', event.target.value), !location.route_id || videoSegmentsLoading)}
          <div className="form-field">
            <label htmlFor="video-location-captured-at">Captured at</label>
            <input
              id="video-location-captured-at"
              type="datetime-local"
              value={location.captured_at || ''}
              onChange={(event) => handleVideoLocationChange('captured_at', event.target.value)}
              className={selectClass('captured_at')}
            />
            {fieldErrors['location.captured_at'] && <span className="field-error-text">{fieldErrors['location.captured_at']}</span>}
          </div>
          <button type="button" className="danger-button small-button video-location-clear" onClick={clearVideoLocation} disabled={submitting}>
            Clear location
          </button>
        </div>
      </div>
    )
  }

  const renderVideoAttachments = () => {
    if (resourceKey !== 'videos' || !isEdit) {
      return null
    }

    return (
      <div className="management-related-actions">
        <div>
          <p className="eyebrow">Attachments</p>
          <strong>Read-only relationship context</strong>
        </div>
        {VIDEO_ATTACHMENT_FIELDS.map((field) => (
          <div key={field} className="form-field">
            <label>{fieldLabel(field)}</label>
            <div className="form-input">{Array.isArray(videoAttachments[field]) && videoAttachments[field].length ? videoAttachments[field].join(', ') : 'None'}</div>
          </div>
        ))}
      </div>
    )
  }

  const renderVideoPreview = () => {
    if (resourceKey !== 'videos') {
      return null
    }

    const playbackUrl = videoAttachments.playback_url || ''
    const thumbnailUrl = videoAttachments.thumbnail_url || ''
    const hasProviderId = Boolean(formData.provider_id)

    let body
    if (playbackUrl) {
      body = <VideoPlayer playbackUrl={playbackUrl} thumbnailUrl={thumbnailUrl} title={formData.title} />
    } else if (hasProviderId) {
      body = <p className="video-preview-state">Video uploaded. Cloudflare is processing the video.</p>
    } else {
      body = <p className="video-preview-state">No video uploaded</p>
    }

    return (
      <div key="video-preview" className="video-preview-section">
        <div>
          <p className="eyebrow">Preview</p>
          <strong>Video preview</strong>
        </div>
        {body}
      </div>
    )
  }

  const renderPublishedAt = () => (
    <div key="published_at" className="form-field">
      <label>Published</label>
      <p className="form-static-value">{formatPublishedAtDisplay(formData.published_at)}</p>
    </div>
  )

  const renderVideoProviderFields = () => {
    if (isEdit) {
      return [renderField('provider'), renderField('provider_id')]
    }

    return [
      <div key="video-provider-fields" className="video-provider-fields">
        <div className="form-field">
          <label htmlFor="video-provider">Provider</label>
          <input id="video-provider" className="form-input" value={formData.provider || 'cloudflare'} readOnly />
        </div>
        <div className="form-field">
          <label htmlFor="video-provider-id">Provider ID</label>
          <input
            id="video-provider-id"
            className="form-input"
            value={formData.provider_id || ''}
            placeholder="Populated after upload"
            readOnly
          />
        </div>
      </div>,
    ]
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
          <ContentVideoManager
            key="place-video-manager"
            resourceKey="place"
            resourceId={id}
            attachedVideoIds={formData.video_ids || []}
            onAttachmentsChange={(nextIds) => setFormData((current) => ({ ...current, video_ids: nextIds }))}
          />,
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
          <ContentVideoManager
            key="route-video-manager"
            resourceKey="route"
            resourceId={id}
            attachedVideoIds={formData.video_ids || []}
            onAttachmentsChange={(nextIds) => setFormData((current) => ({ ...current, video_ids: nextIds }))}
          />,
        ]
      case 'stories':
        return [
          renderField('country', 'select'),
          renderField('title'),
          renderField('slug'),
          renderField('excerpt', 'textarea'),
          renderField('body', 'textarea'),
          renderPublishedAt(),
          renderField('status', 'select'),
          renderField('places', 'multi-select'),
          renderField('routes', 'multi-select'),
          renderField('events', 'multi-select'),
          renderField('tours', 'multi-select'),
          renderField('videos', 'multi-select'),
          <ContentVideoManager
            key="story-video-manager"
            resourceKey="story"
            resourceId={id}
            attachedVideoIds={formData.video_ids || []}
            onAttachmentsChange={(nextIds) => setFormData((current) => ({ ...current, video_ids: nextIds }))}
          />,
        ]
      case 'videos':
        return [
          renderVideoPreview(),
          !isEdit && (
            <VideoUploadField
              key="video-upload"
              onUploadSuccess={handleVideoUploadSuccess}
              onUploadStateChange={setVideoUploadStatus}
            />
          ),
          renderField('title'),
          renderField('slug'),
          ...renderVideoProviderFields(),
          renderField('thumbnail'),
          renderField('duration'),
          renderPublishedAt(),
          renderField('status', 'select'),
          renderVideoLocation(),
          renderVideoAttachments(),
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
          <ContentVideoManager
            key="tour-video-manager"
            resourceKey="tour"
            resourceId={id}
            attachedVideoIds={formData.video_ids || []}
            onAttachmentsChange={(nextIds) => setFormData((current) => ({ ...current, video_ids: nextIds }))}
          />,
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
          <ContentVideoManager
            key="event-video-manager"
            resourceKey="event"
            resourceId={id}
            attachedVideoIds={formData.video_ids || []}
            onAttachmentsChange={(nextIds) => setFormData((current) => ({ ...current, video_ids: nextIds }))}
          />,
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
        <div className="management-page-actions">
          <Link to={`/manage/${resourceKey}`} className="secondary-button">
            Back to list
          </Link>
          <Link to="/manage" className="secondary-button">
            Management
          </Link>
        </div>
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
        {!submitting && getVideoSubmitBlockReason() && (
          <div className="management-error" role="status">{getVideoSubmitBlockReason()}</div>
        )}
      </form>
    </section>
  )
}

export default EntityFormPage
