import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

let server

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
})

after(async () => {
  await server?.close()
})

test('management Food helper uses plural UUID paths and page metadata without changing list()', async () => {
  const { apiClient } = await server.ssrLoadModule('/src/services/apiClient.js')
  const { createManagementEntityApi } = await server.ssrLoadModule('/src/services/management/entityApi.js')
  const page = { count: 30, next: '?page=2', previous: null, results: [{ id: 'record' }] }
  const calls = []
  const originalGet = apiClient.get
  const originalPatch = apiClient.patch
  apiClient.get = async (...args) => { calls.push(['get', ...args]); return { data: page } }
  apiClient.patch = async (...args) => { calls.push(['patch', ...args]); return { data: args[1] } }
  try {
    const api = createManagementEntityApi('foods')
    assert.deepEqual(await api.listPage({ page: 2, pageSize: 12 }), page)
    assert.deepEqual(calls[0], ['get', '/api/offward/manage/foods/', { params: { page: 2, page_size: 12 } }])
    assert.deepEqual(await api.list(), page.results)
    await api.update('saved-uuid', { video_ids: [] })
    assert.deepEqual(calls[2], ['patch', '/api/offward/manage/foods/saved-uuid/', { video_ids: [] }])
  } finally {
    apiClient.get = originalGet
    apiClient.patch = originalPatch
  }
})

test('recipe presentation preserves text quantity, required fields and boundary/disabled controls', async () => {
  const { default: FoodRecipeEditor } = await server.ssrLoadModule('/src/features/food/FoodRecipeEditor.jsx')
  const html = renderToStaticMarkup(createElement(FoodRecipeEditor, {
    ingredients: [{ order: 1, name: 'Salt', quantity: 'to taste', note: '' }],
    steps: [{ order: 1, text: 'Mix.' }],
    onChange() {},
    disabled: true,
    errors: { 'ingredients.0.name': 'Validation message' },
  }))
  assert.match(html, /value="to taste"/)
  assert.match(html, /name="|id="food-ingredients-0-name"/)
  assert.match(html, /required=""/)
  assert.match(html, /Move ingredient 1 up/)
  assert.match(html, /Move step 1 down/)
  assert.match(html, /Validation message/)
  assert.match(html, /fieldset[^>]*disabled=""/)
})

test('Food gallery UI keeps selected UUID/order controls and omits Story hero without callback', async () => {
  const { default: Manager } = await server.ssrLoadModule('/src/features/management/ContentImageCollectionManager.jsx')
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Manager, {
    attachedCollectionIds: ['off-page-gallery'],
    onAttachmentsChange() {},
  })))
  assert.match(html, /off-page-gallery/)
  assert.match(html, /unresolved gallery/)
  assert.match(html, /Move gallery .* up/)
  assert.doesNotMatch(html, /Hero image|story-hero-image/)
})

test('relationship manager retains unknown selected IDs and labels removal accessibly', async () => {
  const { default: Manager } = await server.ssrLoadModule('/src/features/management/RelationshipAttachmentManager.jsx')
  const html = renderToStaticMarkup(createElement(Manager, { title: 'Places', attachedIds: ['off-page-place'], availableItems: [], onDetach() {} }))
  assert.match(html, /off-page-place/)
  assert.match(html, /aria-label="Remove off-page-place from places"/)
})

test('route child composition keeps cross-route UUID selections without guessed links', async () => {
  const { default: Children } = await server.ssrLoadModule('/src/features/management/RouteChildRelationships.jsx')
  const html = renderToStaticMarkup(createElement(Children, { routes: [], values: { waypoint_ids: ['saved-waypoint'], segment_ids: ['saved-segment'] }, onChange() {} }))
  assert.match(html, /saved-waypoint/)
  assert.match(html, /saved-segment/)
  assert.match(html, /does not attach or modify the Route/)
  assert.doesNotMatch(html, /href=/)
})

test('video create surface is hidden until owner has an ID; saved owner exposes unresolved UUIDs', async () => {
  const { default: Manager } = await server.ssrLoadModule('/src/features/video/ContentVideoManager.jsx')
  assert.equal(renderToStaticMarkup(createElement(Manager, { resourceKey: 'foods' })), '')
  const html = renderToStaticMarkup(createElement(Manager, { resourceKey: 'foods', resourceId: 'saved-food', attachedVideoIds: ['off-page-video'], disabled: true }))
  assert.match(html, /off-page-video/)
  assert.match(html, /fieldset[^>]*disabled=""/)
  assert.match(html, /unresolved Video/)
})

test('public Food helper sends only supported pagination/filters and distinguishes 404', async () => {
  const { apiClient } = await server.ssrLoadModule('/src/services/apiClient.js')
  const { getPublicFoods, getPublicFoodBySlug } = await server.ssrLoadModule('/src/services/foodsApi.js')
  const original = apiClient.get
  const calls = []
  apiClient.get = async (...args) => {
    calls.push(args)
    return { data: { count: 0, next: null, previous: null, results: [] } }
  }
  try {
    await getPublicFoods({ page: 2, page_size: 12, country: 'italy', food_type: 'recipe', status: 'inactive' })
    assert.deepEqual(calls[0], ['/api/offward/food/', { params: { page: 2, page_size: 12, country: 'italy', food_type: 'recipe' } }])
    apiClient.get = async (url) => { calls.push([url]); return { data: { id: 'food', slug: 'slug' } } }
    await getPublicFoodBySlug('slug with space')
    assert.equal(calls[1][0], '/api/offward/food/slug%20with%20space/')
    apiClient.get = async () => { throw Object.assign(new Error('Not found'), { response: { status: 404 } }) }
    assert.equal(await getPublicFoodBySlug('missing'), null)
    apiClient.get = async () => { throw Object.assign(new Error('Unavailable'), { response: { status: 500 } }) }
    await assert.rejects(getPublicFoodBySlug('unavailable'), /Unavailable/)
    apiClient.get = async () => ({ data: [] })
    await assert.rejects(getPublicFoodBySlug('invalid'), /must be an object/)
  } finally {
    apiClient.get = original
  }
})

test('public Country page helper retains pagination and preserves complete array support', async () => {
  const { apiClient } = await server.ssrLoadModule('/src/services/apiClient.js')
  const { getPublicCountriesPage, getCountries } = await server.ssrLoadModule('/src/services/countriesApi.js')
  const original = apiClient.get
  const page = { count: 30, next: '?page=2', previous: null, results: [{ id: 'country' }] }
  apiClient.get = async () => ({ data: page })
  try {
    assert.deepEqual(await getPublicCountriesPage(), page)
    assert.deepEqual(await getCountries(), page.results)
    apiClient.get = async () => ({ data: page.results })
    assert.deepEqual(await getPublicCountriesPage(), { count: 1, next: null, previous: null, results: page.results })
  } finally {
    apiClient.get = original
  }
})

test('public Food cards use real slug links/type/summary and do not guess UUID links', async () => {
  const { default: FoodCard } = await server.ssrLoadModule('/src/features/food/FoodCard.jsx')
  const card = (food) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(FoodCard, { food })))
  const html = card({ id: 'food-uuid', slug: 'food-slug', title: 'Food title', food_type: 'guide', summary: 'Food summary', preview_image: { url: 'https://example.invalid/preview.webp' } })
  assert.match(html, /href="\/food\/food-slug"/)
  assert.match(html, /Food summary/)
  assert.match(html, /Guide/)
  assert.match(html, /preview.webp/)
  assert.equal(card({ id: 'no-slug', title: 'Unavailable' }), '')
})
