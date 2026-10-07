import { useEffect, useState } from 'react'
import { getCountries } from '../../services/countriesApi.js'
import { getPublicRoutes } from '../../services/routesApi.js'
import { getPublicPlaces } from '../../services/placesApi.js'

export default function useExploreData({ mode, country, activity, mapMode }) {
  const [countryResult, setCountryResult] = useState({ status: 'loading', items: [] })
  const [result, setResult] = useState({ key: null, status: 'loading', items: [] })
  const [attempt, setAttempt] = useState(0)
  const includeGeometry = mapMode && Boolean(country) && mode === 'routes'
  const key = JSON.stringify([mode, country, activity, includeGeometry, attempt])

  useEffect(() => {
    let current = true
    getCountries().then(
      (items) => { if (current) setCountryResult({ status: 'success', items }) },
      () => { if (current) setCountryResult({ status: 'error', items: [] }) },
    )
    return () => { current = false }
  }, [attempt])

  useEffect(() => {
    let current = true
    const request = mode === 'routes'
      ? getPublicRoutes({ country: country || undefined, activityType: activity || undefined, status: 'active', includeGeometry })
      : getPublicPlaces({ country: country || undefined })
    request.then(
      (items) => { if (current) setResult({ key, status: 'success', items }) },
      () => { if (current) setResult({ key, status: 'error', items: [] }) },
    )
    return () => { current = false }
  }, [mode, country, activity, includeGeometry, key])

  return {
    countries: countryResult.items,
    countriesStatus: countryResult.status,
    items: result.key === key ? result.items : [],
    status: result.key === key ? result.status : 'loading',
    retry: () => setAttempt((value) => value + 1),
  }
}