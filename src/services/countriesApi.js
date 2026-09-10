import countries from '../data/countries.js'

export function getCountries() {
  return countries
}

export function getCountryBySlug(slug) {
  return countries.find((country) => country.slug === slug)
}