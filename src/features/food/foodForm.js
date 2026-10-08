import { FOOD_STATUSES, FOOD_TYPES } from './foodConstants.js'

export const FOOD_LIST_FIELDS = ['place_ids', 'route_ids', 'story_ids', 'waypoint_ids', 'segment_ids', 'video_ids', 'image_collection_ids', 'ingredients', 'steps']
export const FOOD_INTEGER_FIELDS = ['prep_time_minutes', 'cook_time_minutes', 'servings']

export function orderedRows(rows = []) {
  return rows.map((row, index) => ({ ...row, order: index + 1 }))
}

export function hydrateFoodLists(data) {
  const values = {}
  FOOD_LIST_FIELDS.forEach((field) => {
    if (!Array.isArray(data[field])) return
    values[field] = field === 'ingredients' || field === 'steps'
      ? orderedRows([...data[field]].sort((a, b) => a.order - b.order))
      : [...new Set(data[field].map((item) => item && typeof item === 'object' ? item.id : item).filter(Boolean).map(String))]
  })
  return values
}

export function validateFood(values) {
  const errors = {}
  if (!values.title?.trim()) errors.title = 'Title is required.'
  if (!FOOD_TYPES.includes(values.food_type)) errors.food_type = 'Select a valid Food type.'
  if (!FOOD_STATUSES.includes(values.status)) errors.status = 'Select a valid Food status.'
  FOOD_INTEGER_FIELDS.forEach((field) => {
    const value = values[field]
    if (value !== '' && value !== null && value !== undefined && (!Number.isSafeInteger(Number(value)) || Number(value) <= 0)) {
      errors[field] = 'Enter a positive whole number or leave blank.'
    }
  })
  ;(values.ingredients || []).forEach((ingredient, index) => {
    if (!ingredient.name?.trim()) errors[`ingredients.${index}.name`] = 'Ingredient name is required.'
  })
  ;(values.steps || []).forEach((step, index) => {
    if (!step.text?.trim()) errors[`steps.${index}.text`] = 'Step text is required.'
  })
  return errors
}

export function buildFoodPayload(values) {
  const payload = {
    country: values.country || null,
    title: values.title.trim(),
    food_type: values.food_type,
    status: values.status,
    summary: values.summary || '',
    body: values.body || '',
  }
  if (values.slug?.trim()) payload.slug = values.slug.trim()
  FOOD_INTEGER_FIELDS.forEach((field) => {
    if (Object.hasOwn(values, field)) payload[field] = values[field] === '' || values[field] === null ? null : Number(values[field])
  })
  FOOD_LIST_FIELDS.forEach((field) => {
    if (!Array.isArray(values[field])) return
    if (field === 'ingredients') {
      payload[field] = values[field].map((row, index) => ({ order: index + 1, name: row.name.trim(), quantity: row.quantity || '', note: row.note || '' }))
    } else if (field === 'steps') {
      payload[field] = values[field].map((row, index) => ({ order: index + 1, text: row.text.trim() }))
    } else {
      payload[field] = [...new Set(values[field].map(String))]
    }
  })
  return payload
}

export function foodFieldErrors(data, prefix = '') {
  if (!data || typeof data !== 'object') return {}
  const errors = {}
  Object.entries(data).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') errors[path] = value
    else if (Array.isArray(value) && value.every((item) => typeof item === 'string')) errors[path] = value.join(' ')
    else if (value && typeof value === 'object') Object.assign(errors, foodFieldErrors(value, path))
  })
  return errors
}
