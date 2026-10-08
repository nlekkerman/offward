import { useRef, useState } from 'react'
import { foodsApi } from '../../services/management/index.js'
import CatalogStatus from './CatalogStatus.jsx'
import RelationshipAttachmentManager from './RelationshipAttachmentManager.jsx'
import useManagementCatalog from './useManagementCatalog.js'
import { updateFoodRelationship } from './foodRelationshipWrites.js'

function foodCountryLabel(country) {
  if (country && typeof country === 'object') return country.name || country.title || country.code || country.id || ''
  return country || ''
}

function FoodRelationshipManager({ ownerId, field, attachedIds = [], onAttachedIdsChange, disabled = false }) {
  const catalog = useManagementCatalog(foodsApi, attachedIds)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)

  const update = async (foodId, attach) => {
    if (busy.current || disabled) return
    busy.current = true
    setSaving(true)
    setError('')
    try {
      await updateFoodRelationship(foodsApi, foodId, field, ownerId, attach)
      const stringId = String(foodId)
      const nextAttachedIds = attach
        ? [...new Set([...attachedIds.map(String), stringId])]
        : attachedIds.filter((id) => String(id) !== stringId)
      onAttachedIdsChange(nextAttachedIds)
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || requestError?.message || 'Unable to update Food relationship.')
    } finally {
      busy.current = false
      setSaving(false)
    }
  }

  const getLabel = (food) => food.title || food.slug || String(food.id)
  const getSecondaryLabel = (food) => [
    food.food_type,
    foodCountryLabel(food.country),
  ].filter(Boolean).join(' · ')

  return (
    <section className="food-relationship-manager" aria-label="Food relationships">
      <RelationshipAttachmentManager
        title="Food"
        attachedIds={attachedIds}
        availableItems={catalog.items}
        getLabel={getLabel}
        getSecondaryLabel={getSecondaryLabel}
        getSearchText={(food) => `${getLabel(food)} ${getSecondaryLabel(food)}`.toLowerCase()}
        searchPlaceholder="Search loaded Food by title, type, or Country"
        emptyText="No Food attached."
        onAttach={(foodId) => update(foodId, true)}
        onDetach={(foodId) => update(foodId, false)}
        disabled={disabled || saving || catalog.resolving}
      />
      {saving && <p role="status">Updating Food relationship…</p>}
      {error && <p className="management-error" role="alert">{error}</p>}
      <CatalogStatus catalog={catalog} label="Food" disabled={disabled || saving} />
    </section>
  )
}

export default FoodRelationshipManager
