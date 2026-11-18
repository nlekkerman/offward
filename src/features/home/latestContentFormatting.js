export function formatCountryLabel(country) {
  if (!country) {
    return null
  }

  if (typeof country === 'string') {
    return country.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  }

  if (typeof country === 'object' && typeof country.name === 'string') {
    return country.name
  }

  return null
}

export function formatActivityLabel(value) {
  if (!value || typeof value !== 'string') {
    return null
  }

  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

// All route activities: derived segment activity_types, falling back to the legacy scalar.
export function getRouteActivityLabels(route) {
  const derived = Array.isArray(route?.activity_types)
    ? route.activity_types.filter((value) => typeof value === 'string' && value)
    : []
  const values = derived.length ? derived : [route?.activity_type]
  return [...new Set(values.map(formatActivityLabel).filter(Boolean))]
}

export function formatPublishedDate(value) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}
