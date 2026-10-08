import assert from 'node:assert/strict'
import test from 'node:test'
import { createPublicFoodCache, createPublicRelationshipCatalog, getNextPage } from './publicFoodCacheState.js'
import { nextRouteContextBatch, publicRelationshipIds, resolvePublicFoodIds, resolvePublicRouteChildren } from './publicFoodResolution.js'
import { normalizePaginatedResponse } from '../../services/pagination.js'

const food = (id) => ({ id, slug: `food-${id}`, title: `Food ${id}` })
const page = (results, next = null) => ({ results, count: results.length, next, previous: null })

test('public Food pagination is strict and next cursors must advance', () => {
  assert.deepEqual(normalizePaginatedResponse(page([food('a')]), 'Food'), page([food('a')]))
  assert.throws(() => normalizePaginatedResponse([food('a')], 'Food'), /paginated object/)
  assert.throws(() => normalizePaginatedResponse({ results: [] }, 'Food'), /paginated object/)
  assert.equal(getNextPage(null, 1), null)
  assert.equal(getNextPage('/api/offward/food/?page=2', 1), 2)
  assert.equal(getNextPage('https://api.example/api/offward/food/?page=3', 2), 3)
  for (const next of ['?page=1', '?page=0', '?page=no', '?page=2.5', '?cursor=anything']) {
    assert.throws(() => getNextPage(next, 1), /invalid next/)
  }
})

test('Food cache deduplicates concurrent requests, loads one bounded page and reuses it', async () => {
  let release
  const wait = new Promise((resolve) => { release = resolve })
  const calls = []
  const cache = createPublicFoodCache(async (options) => {
    calls.push(options)
    await wait
    return page([food('a')], '?page=2')
  })
  const first = cache.loadPage()
  assert.equal(cache.loadNext(), first)
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], { page: 1, page_size: 12, country: '', food_type: '' })
  assert.equal(cache.getSnapshot().status, 'loading')
  release()
  await first
  assert.equal(cache.getSnapshot().page, 1)
  assert.equal(cache.getSnapshot().next, '?page=2')
  assert.equal(calls.length, 1)
  await cache.loadPage()
  assert.equal(calls.length, 1)
  assert.equal(cache.getSnapshot().records.get('a').slug, 'food-a')
})

test('Food pagination appends only on explicit load and retains records on error/retry', async () => {
  let fail = true
  const calls = []
  const cache = createPublicFoodCache(async (options) => {
    calls.push(options.page)
    if (options.page === 1) return page([food('a')], '?page=2')
    if (fail) throw new Error('offline')
    return page([food('a'), food('b')])
  })
  await cache.loadNext()
  assert.deepEqual(calls, [1])
  await assert.rejects(cache.loadNext(), /offline/)
  assert.equal(cache.getSnapshot().page, 1)
  assert.equal(cache.getSnapshot().status, 'error')
  assert.equal(cache.getSnapshot().records.size, 1)
  fail = false
  await cache.loadNext()
  assert.deepEqual(calls, [1, 2, 2])
  assert.equal(cache.getSnapshot().status, 'success')
  assert.deepEqual([...cache.getSnapshot().records.keys()], ['a', 'b'])
  await cache.loadNext()
  assert.deepEqual(calls, [1, 2, 2])
})

test('filtered pages are independently cached and seed IDs without exhausting the resolver', async () => {
  const calls = []
  const cache = createPublicFoodCache(async (options) => {
    calls.push(options)
    return options.country ? page([food('filtered')]) : page([food('general')], '?page=2')
  })
  await cache.loadPage({ country: 'italy', food_type: 'dish' })
  assert.equal(cache.getSnapshot().page, 0)
  assert.equal(cache.getSnapshot().status, 'idle')
  assert.equal(cache.getSnapshot().records.has('filtered'), true)
  await cache.loadNext()
  assert.equal(cache.getSnapshot().page, 1)
  assert.equal(cache.getSnapshot().next, '?page=2')
  await cache.loadPage({ country: 'italy', food_type: 'dish' })
  assert.equal(calls.length, 2)
  assert.equal(calls[1].page, 1)
  assert.equal(calls[1].country, '')
})

test('invalid Food next cursors are not cached and can be retried', async () => {
  let next = '?page=1'
  const cache = createPublicFoodCache(async () => page([food('a')], next))
  await assert.rejects(cache.loadNext(), /invalid next/)
  assert.equal(cache.getSnapshot().records.size, 0)
  assert.equal(cache.getSnapshot().status, 'error')
  next = null
  await cache.loadNext()
  assert.equal(cache.getSnapshot().page, 1)
})

test('Food resolver deduplicates owner IDs and exposes missing/slugless records as unresolved', () => {
  const records = new Map([['a', food('a')], ['no-slug', { id: 'no-slug', title: 'Unavailable' }]])
  const result = resolvePublicFoodIds(['a', 'a', 'missing', 'no-slug', null], records)
  assert.deepEqual(result.foods, [food('a')])
  assert.deepEqual(result.unresolved, ['missing', 'no-slug'])
  assert.deepEqual(publicRelationshipIds(undefined), [])
  assert.deepEqual(publicRelationshipIds(['a', 'a', null]), ['a'])
})

test('Food cache subscriptions retain stable snapshots until public data changes', async () => {
  const cache = createPublicFoodCache(async () => page([food('a')]))
  const initial = cache.getSnapshot()
  assert.equal(initial, cache.getSnapshot())
  let notifications = 0
  const stop = cache.subscribe(() => { notifications += 1 })
  cache.remember([food('detail'), { id: 'no-slug' }])
  assert.notEqual(initial, cache.getSnapshot())
  assert.equal(cache.getSnapshot().records.has('detail'), true)
  assert.equal(cache.getSnapshot().records.has('no-slug'), false)
  assert.equal(notifications, 1)
  stop()
  await cache.loadNext()
  assert.equal(notifications, 1)
})

test('Place/Route catalog lookup preserves paging/errors and does not crawl', async () => {
  const calls = []
  let fail = true
  const catalog = createPublicRelationshipCatalog(async (number) => {
    calls.push(number)
    if (number === 1) return page([{ id: 'a', slug: 'a' }], '?page=2')
    if (fail) throw new Error('offline')
    return page([{ id: 'b', slug: 'b' }])
  })
  const initial = catalog.loadNext()
  assert.equal(initial, catalog.loadNext())
  await initial
  assert.deepEqual(calls, [1])
  await assert.rejects(catalog.loadNext(), /offline/)
  assert.equal(catalog.getSnapshot().records.length, 1)
  assert.equal(catalog.getSnapshot().status, 'error')
  fail = false
  await catalog.loadNext()
  assert.deepEqual(calls, [1, 2, 2])
  assert.deepEqual(catalog.getSnapshot().records.map((record) => record.id), ['a', 'b'])
  await catalog.loadNext()
  assert.deepEqual(calls, [1, 2, 2])
})

test('first-response Story lookup carries an explicit bounded limitation', async () => {
  let calls = 0
  const catalog = createPublicRelationshipCatalog(async () => {
    calls += 1
    return { results: [{ id: 'story', slug: 'story' }], next: null }
  }, true)
  await catalog.loadNext()
  await catalog.loadNext()
  assert.equal(catalog.getSnapshot().bounded, true)
  assert.equal(calls, 1)
})

test('child Route context batches are explicitly bounded to four real public slugs', () => {
  const records = Array.from({ length: 20 }, (_, index) => ({ id: String(index), slug: `route-${index}` }))
  const checked = new Map([['0', null], ['1', { id: '1' }]])
  assert.deepEqual(nextRouteContextBatch([{ id: 'no-slug' }, ...records], checked).map((route) => route.id), ['2', '3', '4', '5'])
  assert.deepEqual(nextRouteContextBatch([{ slug: 'no-id' }], checked), [])
})

test('child links require a resolved parent Route and exclude other owners/missing slugs', () => {
  const contexts = new Map([
    ['r', { id: 'r', slug: 'coast trail', title: 'Coast', waypoints: [{ id: 'w', route_id: 'r', name: 'Market' }, { id: 'wrong-owner', route_id: 'other' }], segments: [{ id: 's/1', route_id: 'r', order: 2 }] }],
    ['unpublished', null],
    ['no-slug', { id: 'no-slug', waypoints: [{ id: 'unresolved' }] }],
  ])
  assert.deepEqual(resolvePublicRouteChildren(new Map(), ['w'], ['s/1']), [])
  const links = resolvePublicRouteChildren(contexts, ['w', 'wrong-owner', 'unresolved'], ['s/1'])
  assert.deepEqual(links.map((link) => link.to), ['/routes/coast%20trail/waypoints/w', '/routes/coast%20trail/segments/s%2F1'])
  assert.deepEqual(links.map((link) => link.title), ['Market', 'Segment 2'])
  assert.deepEqual(links.map((link) => link.routeTitle), ['Coast', 'Coast'])
})
test('invalidation drops cached public records and ignores an older pending response', async () => {
  let resolveOld
  let requests = 0
  const cache = createPublicFoodCache(() => {
    requests += 1
    if (requests === 1) return new Promise((resolve) => { resolveOld = resolve })
    return Promise.resolve({ results: [{ id: 'new', slug: 'new' }], count: 1, next: null, previous: null })
  })
  const old = cache.loadNext()
  cache.invalidate()
  await cache.loadNext()
  resolveOld({ results: [{ id: 'old', slug: 'old' }], count: 1, next: null, previous: null })
  await old
  assert.equal(cache.getSnapshot().records.has('old'), false)
  assert.equal(cache.getSnapshot().records.has('new'), true)
  cache.invalidate()
  assert.equal(cache.getSnapshot().records.size, 0)
  assert.equal(cache.getSnapshot().status, 'idle')
})
