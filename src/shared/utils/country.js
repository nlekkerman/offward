export function findCountry(countries, value) {
  if (value && typeof value === 'object') {
    return value
  }

  const normalizedValue = String(value || '').toLowerCase()
  if (!normalizedValue) {
    return null
  }

  return (countries || []).find((country) => (
    [country.id, country.slug, country.code]
      .filter(Boolean)
      .some((candidate) => String(candidate).toLowerCase() === normalizedValue)
  )) || null
}

export function countryName(country, fallback = '') {
  return country?.name || country?.title || fallback
}