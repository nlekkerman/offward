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

test('shared Food relationship manager retains attached UUIDs and exposes management selection', async () => {
  const { default: Manager } = await server.ssrLoadModule('/src/features/management/FoodRelationshipManager.jsx')
  const html = renderToStaticMarkup(createElement(Manager, { ownerId: 'owner-id', field: 'route_ids', attachedIds: ['saved-food'], onAttachedIdsChange() {} }))
  assert.match(html, /saved-food/)
  assert.match(html, /\+ Add food/)
  assert.match(html, /Loading Food/)
})

test('Food relationship write reads current ids and PATCHes only the requested relationship', async () => {
  const { updateFoodRelationship } = await server.ssrLoadModule('/src/features/management/foodRelationshipWrites.js')
  const calls = []
  const api = {
    getById: async (id) => { calls.push(['get', id]); return { id, title: 'Keep this content', route_ids: [{ id: 'existing-route' }] } },
    update: async (id, payload) => { calls.push(['patch', id, payload]) },
  }
  assert.deepEqual(await updateFoodRelationship(api, 'food-id', 'route_ids', 'new-route', true), ['existing-route', 'new-route'])
  assert.deepEqual(calls, [
    ['get', 'food-id'],
    ['patch', 'food-id', { route_ids: ['existing-route', 'new-route'] }],
  ])
  calls.length = 0
  assert.deepEqual(await updateFoodRelationship(api, 'food-id', 'route_ids', 'existing-route', false), [])
  assert.deepEqual(calls, [
    ['get', 'food-id'],
    ['patch', 'food-id', { route_ids: [] }],
  ])
  await assert.rejects(updateFoodRelationship({
    getById: async () => ({ id: 'food-id', title: 'Keep this content' }),
    update: async () => assert.fail('Must not PATCH without the current relationship array'),
  }, 'food-id', 'route_ids', 'new-route', true), /no readable route_ids/)
})

test('Waypoint Food context is retained for display but excluded from map-save payloads', async () => {
  const { normalizeWaypoint, buildWaypointPayload } = await server.ssrLoadModule('/src/features/routes/routeMap/routeMapUtils.js')
  const waypoint = normalizeWaypoint({
    id: '44444444-4444-4444-4444-444444444444',
    coordinates: { lat: 1, lng: 2 },
    food_ids: [{ id: '55555555-5555-5555-5555-555555555555' }],
  })
  assert.deepEqual(waypoint.food_ids, ['55555555-5555-5555-5555-555555555555'])
  assert.equal(Object.hasOwn(buildWaypointPayload([waypoint])[0], 'food_ids'), false)
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

test('management gallery list preserves preview_image from its existing list request', async () => {
  const { apiClient } = await server.ssrLoadModule('/src/services/apiClient.js')
  const { imageCollectionsApi } = await server.ssrLoadModule('/src/services/management/imageCollectionsApi.js')
  const collection = { id: 'gallery-id', title: 'Skocaj', image_count: 3, preview_image: { id: 'asset-id', url: 'https://example.invalid/full.webp', thumbnail_url: 'https://example.invalid/thumb.webp', width: 1152, height: 2048 } }
  const originalGet = apiClient.get
  const calls = []
  apiClient.get = async (...args) => {
    calls.push(args)
    return { data: { count: 1, next: null, previous: null, results: [collection] } }
  }
  try {
    const { GalleryListCard } = await server.ssrLoadModule('/src/pages/manage/galleries/GalleryListPage.jsx')
    const page = await imageCollectionsApi.listPage()
    assert.deepEqual(page.results, [collection])
    const card = (record) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(GalleryListCard, { collection: record })))
    const html = card(page.results[0])
    assert.match(html, /src="https:\/\/example.invalid\/thumb.webp"/)
    assert.match(html, /gallery-list-preview/)
    assert.match(html, /Skocaj/)
    assert.match(html, /3 images/)
    assert.match(html, /href="\/manage\/galleries\/gallery-id\/edit"/)
    assert.doesNotMatch(html, /No preview/)
    assert.match(card({ ...collection, preview_image: { url: collection.preview_image.url } }), /src="https:\/\/example.invalid\/full.webp"/)
    const empty = card({ ...collection, image_count: 0, preview_image: null })
    assert.match(empty, /No preview/)
    assert.match(empty, /0 images/)
    assert.doesNotMatch(empty, /<img/)
    assert.deepEqual(calls, [['/api/offward/manage/image-collections/', { params: { page: 1, page_size: 24 } }]])
  } finally {
    apiClient.get = originalGet
  }
})

test('management gallery PUT sends only membership fields and normalizes authoritative nested previews', async () => {
  const { apiClient } = await server.ssrLoadModule('/src/services/apiClient.js')
  const { imageCollectionsApi } = await server.ssrLoadModule('/src/services/management/imageCollectionsApi.js')
  const { toMembershipRows, toImageMembershipPayload } = await server.ssrLoadModule('/src/features/management/imageCollectionUtils.js')
  const previous = [{ image_asset_id: 'asset-id', caption: 'Edited caption', url: 'upload.webp' }]
  const response = {
    id: 'gallery-id',
    images: [{ id: 'membership-id', image_asset_id: 'asset-id', order: 0, caption: 'Saved caption', image: { id: 'asset-id', url: 'full.webp', thumbnail_url: 'thumb.webp' } }],
  }
  const calls = []
  const originalPut = apiClient.put
  apiClient.put = async (...args) => { calls.push(args); return { data: response } }
  try {
    const saved = await imageCollectionsApi.replaceImages('gallery-id', toImageMembershipPayload(previous))
    assert.deepEqual(calls, [[
      '/api/offward/manage/image-collections/gallery-id/images/',
      { images: [{ image_asset_id: 'asset-id', order: 0, caption: 'Edited caption' }] },
    ]])
    assert.deepEqual(toMembershipRows(saved.images, previous), [
      { image_asset_id: 'asset-id', caption: 'Saved caption', url: 'thumb.webp' },
    ])
  } finally {
    apiClient.put = originalPut
  }
})

test('Food cards and public gallery cards share thumbnail-first list previews and URL fallback', async () => {
  const { default: FoodCard } = await server.ssrLoadModule('/src/features/food/FoodCard.jsx')
  const { default: EntityMediaSection } = await server.ssrLoadModule('/src/features/routes/components/EntityMediaSection.jsx')
  const preview_image = { url: 'https://example.invalid/full.webp', thumbnail_url: 'https://example.invalid/thumb.webp', width: 1152, height: 2048 }
  const foodCard = (food) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(FoodCard, { food: { slug: 'food', title: 'Food', ...food } })))
  const galleryCard = (preview, showAllImages = false) => renderToStaticMarkup(createElement(EntityMediaSection, {
    galleries: [{ id: 'gallery', title: 'Skocaj', image_count: 3, preview_image: preview }],
    onOpenGallery() {},
    showAllImages,
  }))
  for (const preview of [preview_image, { url: preview_image.url }]) {
    const expected = preview.thumbnail_url || preview.url
    assert.ok(foodCard({ preview_image: preview }).includes(`src="${expected}"`))
    assert.ok(foodCard({ image_collections: [{ preview_image: preview }] }).includes(`src="${expected}"`))
    for (const showAllImages of [false, true]) {
      const html = galleryCard(preview, showAllImages)
      assert.ok(html.includes(`src="${expected}"`))
      assert.match(html, /Skocaj/)
      assert.match(html, /3 photos/)
    }
  }
  assert.doesNotMatch(galleryCard(null), /<img/)
})
