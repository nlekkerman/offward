export function getNextPage(next, currentPage) {
  if (!next) return null
  const value = Number(new URL(next, 'https://offward.invalid').searchParams.get('page'))
  if (!Number.isInteger(value) || value <= currentPage) {
    throw new Error('The public catalog returned an invalid next page.')
  }
  return value
}

export function createPublicFoodCache(fetchPage) {
  const records = new Map()
  const pages = new Map()
  const pending = new Map()
  const listeners = new Set()
  let generation = 0
  let snapshot = { records: new Map(), page: 0, next: null, status: 'idle', error: null }

  function publish(update = {}) {
    snapshot = { ...snapshot, ...update, records: new Map(records) }
    listeners.forEach((listener) => listener())
  }

  function remember(foods) {
    for (const food of foods) {
      if (food?.id && food?.slug) records.set(String(food.id), food)
    }
    publish()
  }

  function loadPage(options = {}) {
    const params = {
      page: options.page ?? 1,
      page_size: options.page_size ?? 12,
      country: options.country || '',
      food_type: options.food_type || '',
    }
    const key = JSON.stringify(params)
    if (pages.has(key)) return Promise.resolve(pages.get(key))
    if (pending.has(key)) return pending.get(key)
    const isResolverPage = !params.country && !params.food_type && params.page_size === 12
    const requestGeneration = generation
    if (isResolverPage) publish({ status: 'loading', error: null })
    const request = fetchPage(params).then((data) => {
      if (requestGeneration !== generation) return data
      // Validate before caching so a malformed cursor remains retryable.
      if (data.next) getNextPage(data.next, params.page)
      pages.set(key, data)
      remember(data.results)
      if (isResolverPage) {
        let page = 0
        let next = null
        for (;;) {
          const loaded = pages.get(JSON.stringify({ ...params, page: page + 1 }))
          if (!loaded) break
          page += 1
          next = loaded.next
        }
        publish({ page, next, status: 'success', error: null })
      }
      return data
    }).catch((error) => {
      if (isResolverPage && requestGeneration === generation) publish({ status: 'error', error })
      throw error
    }).finally(() => { if (pending.get(key) === request) pending.delete(key) })
    pending.set(key, request)
    return request
  }

  return {
    invalidate: () => {
      generation += 1
      records.clear()
      pages.clear()
      pending.clear()
      publish({ page: 0, next: null, status: 'idle', error: null })
    },
    remember,
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    loadPage,
    // One bounded request per action, never an automatic catalog crawl.
    loadNext: () => {
      if (snapshot.page > 0 && !snapshot.next) return Promise.resolve()
      return loadPage({ page: snapshot.page === 0 ? 1 : getNextPage(snapshot.next, snapshot.page) })
    },
  }
}

export function createPublicRelationshipCatalog(fetchPage, bounded = false) {
  let snapshot = { records: [], page: 0, next: null, status: 'idle', bounded }
  let pending
  const listeners = new Set()
  const publish = (update) => {
    snapshot = { ...snapshot, ...update }
    listeners.forEach((listener) => listener())
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    loadNext: () => {
      if (pending) return pending
      if (snapshot.page && !snapshot.next) return Promise.resolve()
      const page = snapshot.page ? getNextPage(snapshot.next, snapshot.page) : 1
      publish({ status: 'loading' })
      pending = fetchPage(page).then((data) => {
        if (data.next) getNextPage(data.next, page)
        const records = new Map(snapshot.records.map((record) => [String(record.id), record]))
        data.results.forEach((record) => { if (record?.id) records.set(String(record.id), record) })
        publish({ records: [...records.values()], page, next: data.next, status: 'success' })
      }).catch((error) => {
        publish({ status: 'error' })
        throw error
      }).finally(() => { pending = null })
      return pending
    },
  }
}
