import { useEffect, useMemo, useRef, useState } from 'react'
import { errorMessage } from './imageCollectionUtils.js'

function mergeRecords(current, incoming) {
  const records = new Map(current.map((item) => [String(item.id), item]))
  incoming.forEach((item) => records.set(String(item.id), item))
  return [...records.values()]
}

export default function useManagementCatalog(api, selectedIds = []) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ api: null, attempt: -1, items: [], next: null, page: 0, count: 0, loading: true, error: '', loadingMore: false })
  const [selected, setSelected] = useState({ key: '', items: [], errors: [] })
  const generation = useRef(0)
  const busy = useRef(false)
  const selectedKey = JSON.stringify([...new Set(selectedIds.filter(Boolean).map(String))])
  const current = result.api === api && result.attempt === attempt

  useEffect(() => {
    const request = ++generation.current
    busy.current = false
    api.listPage().then((page) => {
      if (generation.current === request) {
        setResult((value) => ({ api, attempt, items: value.api === api && value.attempt === attempt ? mergeRecords(page.results, value.items) : page.results, next: page.next, count: page.count, page: 1, loading: false, error: '', loadingMore: false }))
      }
    }, (error) => {
      if (generation.current === request) {
        setResult((value) => ({ api, attempt, items: value.api === api && value.attempt === attempt ? value.items : [], next: null, count: 0, page: 0, loading: false, error: errorMessage(error, 'Unable to load catalog.'), loadingMore: false }))
      }
    })
    return () => { generation.current += 1 }
  }, [api, attempt])

  useEffect(() => {
    let active = true
    const ids = JSON.parse(selectedKey)
    Promise.all(ids.map(async (id) => {
      try {
        return { item: await api.getById(id) }
      } catch (error) {
        return { error: `${id}: ${errorMessage(error, 'Unable to resolve selected record.')}` }
      }
    })).then((records) => {
      if (active) setSelected({ key: selectedKey, api, attempt, items: records.flatMap((record) => record.item ? [record.item] : []), errors: records.flatMap((record) => record.error ? [record.error] : []) })
    })
    return () => { active = false }
  }, [api, selectedKey, attempt])

  const items = useMemo(() => mergeRecords(
    current ? result.items : [],
    selected.key === selectedKey && selected.api === api && selected.attempt === attempt ? selected.items : [],
  ), [current, result.items, selected, selectedKey, api, attempt])

  async function loadMore() {
    if (!current || !result.next || busy.current) return
    const request = generation.current
    busy.current = true
    setResult((value) => ({ ...value, loadingMore: true, error: '' }))
    try {
      const page = await api.listPage({ page: result.page + 1 })
      if (generation.current === request) {
        setResult((value) => ({ ...value, items: mergeRecords(value.items, page.results), next: page.next, count: page.count, page: value.page + 1, loadingMore: false }))
      }
    } catch (error) {
      if (generation.current === request) setResult((value) => ({ ...value, loadingMore: false, error: errorMessage(error, 'Unable to load more records.') }))
    } finally {
      if (generation.current === request) busy.current = false
    }
  }

  function addItem(item) {
    setResult((value) => ({ ...value, api, attempt, items: mergeRecords(value.api === api && value.attempt === attempt ? value.items : [], [item]) }))
  }

  return {
    items,
    loading: !current || result.loading,
    next: current ? result.next : null,
    count: current ? result.count : 0,
    error: current ? result.error : '',
    loadingMore: current && result.loadingMore,
    unresolvedErrors: selected.key === selectedKey && selected.api === api && selected.attempt === attempt ? selected.errors : [],
    resolving: selected.key !== selectedKey || selected.api !== api || selected.attempt !== attempt,
    loadMore,
    retry: () => setAttempt((value) => value + 1),
    addItem,
  }
}
