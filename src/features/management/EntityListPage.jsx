import { Link } from 'react-router-dom'
import { managementApis } from '../../services/management/index.js'
import CountryFlag from '../../shared/components/CountryFlag.jsx'
import { findCountry } from '../../shared/utils/country.js'
import { getEntityConfig, normalizeDisplayValue } from './entityConfig.js'
import useManagementCatalog from './useManagementCatalog.js'
import CatalogStatus from './CatalogStatus.jsx'
import { invalidatePublicFoods } from '../food/publicFoodCache.js'

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
  const catalog = useManagementCatalog(api)
  const { items, loading, error } = catalog
  const countryIds = config.listFields.includes('country')
    ? items.map((item) => typeof item.country === 'object' ? item.country?.id : item.country || item.country_id).filter(Boolean)
    : []
  const countries = useManagementCatalog(managementApis.countries, countryIds)
  const countryRecords = countries.items

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
      if (resourceKey === 'foods') invalidatePublicFoods()
      catalog.retry()
    } catch (err) {
      const message = err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0] || 'Unable to delete this record.'
      window.alert(message)
    }
  }

  const tableHeaders = config.listFields

  if (loading) {
    return <section className="management-page"><h1>{title}</h1><div className="management-empty">Loading...</div></section>
  }

  if (error && !items.length) {
    return <section className="management-page"><h1>{title}</h1><CatalogStatus catalog={catalog} label="records" /></section>
  }

  return (
    <section className={resourceKey === 'foods' ? 'management-page food-management-page' : 'management-page'}>
      <div className="management-page-header">
        <div>
          <p className="eyebrow">Management</p>
          <h1>{title}</h1>
        </div>
        <Link to={`/manage/${resourceKey}/new`} className="primary-button">
          Create {config.label}
        </Link>
      </div>

      {config.listFields.includes('country') && (countries.error || countries.unresolvedErrors.length > 0) && <p className="management-error" role="alert">Some Country labels could not be loaded. <button type="button" className="secondary-button small-button" onClick={countries.retry}>Retry Country labels</button></p>}
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
      <CatalogStatus catalog={catalog} label={title.toLowerCase()} />
    </section>
  )
}

export default EntityListPage
