function matchCountry(countries, value) {
  const normalizedValue = String(value || '').toLowerCase()
  if (!normalizedValue) {
    return null
  }

  return (countries || []).find((country) => (
    [country?.id, country?.slug, country?.code]
      .filter(Boolean)
      .some((candidate) => String(candidate).toLowerCase() === normalizedValue)
  )) || null
}

// Accepts a Country object (full or summary without `code`), UUID, slug, or ISO code.
// Summaries are enriched from the loaded Country records so the flag code is available.
export function findCountry(countries, value) {
  if (value && typeof value === 'object') {
    const match = matchCountry(countries, value.id) || matchCountry(countries, value.slug) || matchCountry(countries, value.code)
    return match ? { ...value, ...match } : value
  }

  return matchCountry(countries, value)
}

export function countryName(country, fallback = '') {
  return country?.name || country?.title || fallback
}