import { useEffect, useRef, useState } from 'react'
import { getCountries } from '../../services/countriesApi.js'
import { getPublicRoutes } from '../../services/routesApi.js'
import { getPublicPlaces } from '../../services/placesApi.js'

const PAGE_SIZE = 12

function getPage({ mode, country, activity, includeGeometry, page }) {
  return mode === 'routes'
    ? getPublicRoutes({
      country: country || undefined,
      activityType: activity || undefined,
      status: 'active',
      includeGeometry,
      page,
      pageSize: PAGE_SIZE,
    })
    : getPublicPlaces({ country: country || undefined, page, pageSize: PAGE_SIZE })
}

function appendUniqueItems(existingItems, newItems) {
  const seen = new Set(existingItems.map((item) => String(item.id)))
  return [...existingItems, ...newItems.filter((item) => {
    const id = String(item.id)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })]
}

export default function useExploreData({ mode, country, activity, mapMode }) {
  const [countryResult, setCountryResult] = useState({ status: 'loading', items: [] })
  const [result, setResult] = useState({
    key: null,
    status: 'loading',
    items: [],
    count: 0,
    next: null,
    previous: null,
    page: 1,
    loadingMore: false,
    moreError: false,
  })
  const [attempt, setAttempt] = useState(0)
  const requestIdRef = useRef(0)
  const loadingMoreRef = useRef(false)
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
    const requestId = ++requestIdRef.current
    loadingMoreRef.current = false

    getPage({ mode, country, activity, includeGeometry, page: 1 }).then(
      (pageResult) => {
        if (requestId === requestIdRef.current) {
          setResult({
            key,
            status: 'success',
            ...pageResult,
            items: pageResult.results,
            page: 1,
            loadingMore: false,
            moreError: false,
          })
        }
      },
      () => {
        if (requestId === requestIdRef.current) {
          setResult({
            key,
            status: 'error',
            items: [],
            count: 0,
            next: null,
            previous: null,
            page: 1,
            loadingMore: false,
            moreError: false,
          })
        }
      },
    )
    return () => {
      if (requestId === requestIdRef.current) {
        requestIdRef.current += 1
      }
    }
  }, [mode, country, activity, includeGeometry, key])

  async function loadMore() {
    const current = result
    if (current.key !== key || current.next === null || current.loadingMore || loadingMoreRef.current) return

    const requestId = requestIdRef.current
    const nextPage = current.page + 1
    loadingMoreRef.current = true
    setResult((previous) => ({ ...previous, loadingMore: true, moreError: false }))

    try {
      const pageResult = await getPage({ mode, country, activity, includeGeometry, page: nextPage })
      if (requestId !== requestIdRef.current) return
      setResult((previous) => previous.key === key ? {
        ...previous,
        ...pageResult,
        items: appendUniqueItems(previous.items, pageResult.results),
        page: nextPage,
        loadingMore: false,
        moreError: false,
      } : previous)
    } catch {
      if (requestId === requestIdRef.current) {
        setResult((previous) => previous.key === key
          ? { ...previous, loadingMore: false, moreError: true }
          : previous)
      }
    } finally {
      if (requestId === requestIdRef.current) {
        loadingMoreRef.current = false
      }
    }
  }

  return {
    countries: countryResult.items,
    countriesStatus: countryResult.status,
    items: result.key === key ? result.items : [],
    count: result.key === key ? result.count : 0,
    next: result.key === key ? result.next : null,
    loadingMore: result.key === key && result.loadingMore,
    moreError: result.key === key && result.moreError,
    loadMore,
    status: result.key === key ? result.status : 'loading',
    retry: () => setAttempt((value) => value + 1),
  }
}