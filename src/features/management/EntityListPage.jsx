import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { managementApis } from '../../services/management/index.js'
import CountryFlag from '../../shared/components/CountryFlag.jsx'
import { findCountry } from '../../shared/utils/country.js'
import { getEntityConfig, normalizeDisplayValue } from './entityConfig.js'

function getCountryLabel(item, countryRecords) {
  if (item?.country_name) {
    return item.country_name
  }

  if (item?.country && typeof item.country === 'object') {
    return item.country.name || item.country.title || '—'
  }

  const countryId = item?.country || item?.country_id
  if (countryId !== null && countryId !== undefined && countryId !== '') {
    const country = countryRecords.find((record) => String(record?.id) === String(countryId))
    return country?.name || '—'
  }

  return '—'
}

function getSummaryValue(item, fieldName, countryRecords = []) {
  const value = item?.[fieldName]

  if (fieldName === 'country') {
    return getCountryLabel(item, countryRecords)
  }

  if (fieldName === 'status' || fieldName === 'lifecycle_status' || fieldName === 'activity_type') {
    return normalizeDisplayValue(value)
  }

  if (fieldName === 'enquiry_open') {
    return normalizeDisplayValue(Boolean(value))
  }

  return normalizeDisplayValue(value)
}

function CountryIdentity({ country, fallback }) {
  const name = country?.name || country?.title || fallback || '—'

  return (
    <span className="management-country-identity">
      <CountryFlag code={country?.code} countryName={name !== '—' ? name : undefined} size="medium" />
      <span>{name}</span>
    </span>
  )
}

function EntityListPage({ resourceKey, title }) {
  const config = getEntityConfig(resourceKey)
  const api = managementApis[resourceKey]
  const [items, setItems] = useState([])
  const [countryRecords, setCountryRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadItems = async () => {
    try {
      setLoading(true)
      const data = await api.list()
      setItems(data)
      setError('')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to load records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function fetchItems() {
      try {
        setLoading(true)
        const data = await api.list()
        if (active) {
          setItems(data)
          setError('')
        }
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.detail || 'Unable to load records.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchItems()

    return () => {
      active = false
    }
  }, [api, resourceKey])

  useEffect(() => {
    if (!config.listFields.includes('country')) {
      return undefined
    }

    let active = true

    async function fetchCountries() {
      try {
        const data = await managementApis.countries.list()
        if (active) {
          setCountryRecords(data)
        }
      } catch {
        if (active) {
          setCountryRecords([])
        }
      }
    }

    fetchCountries()

    return () => {
      active = false
    }
  }, [config.listFields, resourceKey])

  const handleDelete = async (item) => {
    const id = item?.id
    if (!id) {
      return
    }

    const confirmed = window.confirm(`Delete this ${config.label.toLowerCase()}? This cannot be undone.`)
    if (!confirmed) {
      return
    }

    try {
      await api.remove(id)
      await loadItems()
    } catch (err) {
      const message = err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0] || 'Unable to delete this record.'
      window.alert(message)
    }
  }

  const tableHeaders = config.listFields

  if (loading) {
    return <section className="management-page"><h1>{title}</h1><div className="management-empty">Loading...</div></section>
  }

  if (error) {
    return <section className="management-page"><h1>{title}</h1><div className="management-error">{error}</div></section>
  }

  return (
    <section className="management-page">
      <div className="management-page-header">
        <div>
          <p className="eyebrow">Management</p>
          <h1>{title}</h1>
        </div>
        <Link to={`/manage/${resourceKey}/new`} className="primary-button">
          Create {config.label}
        </Link>
      </div>

      {!items.length ? (
        <div className="management-empty">
          <p>No {config.label.toLowerCase()} records found.</p>
          <Link to={`/manage/${resourceKey}/new`} className="primary-button">
            Add first {config.label.toLowerCase()}
          </Link>
        </div>
      ) : (
        <div className="management-table-wrap">
          <table className="management-table">
            <thead>
              <tr>
                {tableHeaders.map((field) => (
                  <th key={field}>{field.replace(/_/g, ' ')}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  {tableHeaders.map((field) => {
                    const isCountryName = resourceKey === 'countries' && field === 'name'
                    const relatedCountry = field === 'country' ? findCountry(countryRecords, item.country || item.country_id) : null

                    return (
                      <td key={`${item.id}-${field}`}>
                        {isCountryName
                          ? <CountryIdentity country={item} />
                          : field === 'country'
                            ? <CountryIdentity country={relatedCountry || (typeof item.country === 'object' ? item.country : null)} fallback={getCountryLabel(item, countryRecords)} />
                            : getSummaryValue(item, field, countryRecords)}
                      </td>
                    )
                  })}
                  <td>
                    <div className="table-actions">
                      <Link to={`/manage/${resourceKey}/${item.id}/edit`} className="secondary-button small-button">
                        Edit
                      </Link>
                      <button type="button" className="danger-button small-button" onClick={() => handleDelete(item)}>
                        Delete
                      </button>
                    </div>
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

export default EntityListPage
