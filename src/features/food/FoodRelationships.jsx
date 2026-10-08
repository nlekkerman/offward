import { managementApis } from '../../services/management/index.js'
import RelationshipAttachmentManager from '../management/RelationshipAttachmentManager.jsx'
import RouteChildRelationships from '../management/RouteChildRelationships.jsx'
import useManagementCatalog from '../management/useManagementCatalog.js'
import CatalogStatus from '../management/CatalogStatus.jsx'

function FoodRelationships({ values, onChange, errors = {}, disabled = false }) {
  const countries = useManagementCatalog(managementApis.countries, values.country ? [values.country] : [])
  const places = useManagementCatalog(managementApis.places, values.place_ids || [])
  const routes = useManagementCatalog(managementApis.routes, values.route_ids || [])
  const stories = useManagementCatalog(managementApis.stories, values.story_ids || [])
  const catalogs = { place_ids: places, route_ids: routes, story_ids: stories }
  const labels = { place_ids: 'Places', route_ids: 'Routes', story_ids: 'Stories' }
  const countryKnown = countries.items.some((item) => String(item.id) === String(values.country))

  return <section className="food-relationships">
    <div className="form-field"><label htmlFor="country">Country</label><select id="country" name="country" className={errors.country ? 'form-input field-error' : 'form-input'} value={values.country || ''} onChange={(event) => onChange('country', event.target.value)} disabled={disabled}><option value="">No Country</option>{values.country && !countryKnown && <option value={values.country}>{values.country} (unresolved)</option>}{countries.items.map((country) => <option key={country.id} value={country.id}>{country.name || country.id}</option>)}</select>{errors.country && <span className="field-error-text">{errors.country}</span>}<CatalogStatus catalog={countries} label="countries" disabled={disabled} /></div>
    {Object.entries(catalogs).map(([field, catalog]) => <section key={field}>
      <RelationshipAttachmentManager title={labels[field]} attachedIds={values[field] || []} availableItems={catalog.items} onAttach={(id) => onChange(field, [...new Set([...(values[field] || []), String(id)])])} onDetach={(id) => onChange(field, (values[field] || []).filter((value) => String(value) !== String(id)))} disabled={disabled} searchPlaceholder={`Search loaded ${labels[field].toLowerCase()}`} />
      {errors[field] && <p className="field-error-text" role="alert">{errors[field]}</p>}
      <CatalogStatus catalog={catalog} label={labels[field].toLowerCase()} disabled={disabled} />
    </section>)}
    <RouteChildRelationships routes={routes.items} values={values} onChange={onChange} disabled={disabled} errors={errors} />
  </section>
}

export default FoodRelationships
