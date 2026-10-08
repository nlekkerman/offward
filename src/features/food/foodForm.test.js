import assert from 'node:assert/strict'
import test from 'node:test'
import { buildFoodPayload, foodFieldErrors, FOOD_LIST_FIELDS, hydrateFoodLists, orderedRows, validateFood } from './foodForm.js'
import { FOOD_STATUSES, FOOD_TYPES } from './foodConstants.js'
import { normalizeManagementPage } from '../../services/management/catalogPagination.js'

const core = { title: 'Food title', food_type: 'dish', status: 'inactive', country: 'country-id', summary: '', body: '' }

test('Food uses only specified enums', () => {
  assert.deepEqual(FOOD_TYPES, ['dish', 'recipe', 'story', 'guide', 'place_to_eat', 'ingredient', 'other'])
  assert.deepEqual(FOOD_STATUSES, ['active', 'upcoming', 'inactive'])
  assert.ok(validateFood({ ...core, status: 'draft' }).status)
})

test('omitted lists remain omitted; explicit [] clears every list', () => {
  const omitted = buildFoodPayload(core)
  FOOD_LIST_FIELDS.forEach((field) => assert.equal(Object.hasOwn(omitted, field), false))
  const empty = buildFoodPayload({ ...core, ...Object.fromEntries(FOOD_LIST_FIELDS.map((field) => [field, []])) })
  FOOD_LIST_FIELDS.forEach((field) => assert.deepEqual(empty[field], []))
  const authored = buildFoodPayload({ ...core, route_ids: ['route-id'], place_ids: ['place-id'], story_ids: ['story-id'], waypoint_ids: ['waypoint-id'], segment_ids: ['segment-id'] })
  for (const field of ['route_ids', 'place_ids', 'story_ids', 'waypoint_ids', 'segment_ids']) {
    assert.equal(Object.hasOwn(authored, field), false)
  }
})

test('recipe payload normalizes one-based order and preserves textual quantity', () => {
  const payload = buildFoodPayload({
    ...core,
    ingredients: [{ order: 8, name: ' Garlic ', quantity: '2 cloves', note: 'optional' }, { order: 0, name: 'Salt', quantity: 'to taste' }],
    steps: [{ order: 99, text: ' Mix. ' }],
    image_collection_ids: ['b', 'a'],
    published_at: '2026-10-08',
    hero_image_id: 'not-food',
  })
  assert.deepEqual(payload.ingredients, [{ order: 1, name: 'Garlic', quantity: '2 cloves', note: 'optional' }, { order: 2, name: 'Salt', quantity: 'to taste', note: '' }])
  assert.deepEqual(payload.steps, [{ order: 1, text: 'Mix.' }])
  assert.deepEqual(payload.image_collection_ids, ['b', 'a'])
  assert.equal(Object.hasOwn(payload, 'published_at'), false)
  assert.equal(Object.hasOwn(payload, 'hero_image_id'), false)
})

test('optional positive integer metadata allows explicit null clears on every Food type', () => {
  for (const food_type of FOOD_TYPES) {
    assert.deepEqual(validateFood({ ...core, food_type, prep_time_minutes: '', cook_time_minutes: null, servings: '2' }), {})
  }
  assert.equal(buildFoodPayload({ ...core, prep_time_minutes: '', cook_time_minutes: null, servings: '2' }).prep_time_minutes, null)
  assert.equal(buildFoodPayload({ ...core, servings: '2' }).servings, 2)
  for (const servings of [0, '-1', '1.5', 'no', Infinity]) assert.ok(validateFood({ ...core, servings }).servings)
})

test('hydrate sorts recipe records, normalizes IDs and does not default absent lists', () => {
  const values = hydrateFoodLists({ ingredients: [{ order: 2, name: 'B' }, { order: 1, name: 'A' }], steps: [] })
  assert.deepEqual(values.ingredients.map((row) => [row.order, row.name]), [[1, 'A'], [2, 'B']])
  assert.deepEqual(values.steps, [])
  assert.equal(Object.hasOwn(values, 'video_ids'), false)
  assert.deepEqual(hydrateFoodLists({ video_ids: [{ id: 'v' }, 'v'] }).video_ids, ['v'])
  assert.equal(Object.hasOwn(hydrateFoodLists({ route_ids: ['route-id'] }), 'route_ids'), false)
})

test('Food authoring requires its canonical Country', () => {
  assert.equal(validateFood({ ...core, country: '' }).country, 'Country is required.')
  assert.equal(Object.hasOwn(validateFood(core), 'country'), false)
})

test('structural changes are renumbered without mutating rows', () => {
  const original = [{ order: 2, name: 'B' }, { order: 1, name: 'A' }]
  assert.deepEqual(orderedRows(original).map((row) => row.order), [1, 2])
  assert.equal(original[0].order, 2)
  assert.deepEqual(orderedRows(original.slice(1)).map((row) => row.order), [1])
})

test('validation and backend nested row errors retain row/field paths', () => {
  assert.equal(validateFood({ ...core, ingredients: [{ name: ' ' }], steps: [{ text: '' }] })['ingredients.0.name'], 'Ingredient name is required.')
  assert.deepEqual(foodFieldErrors({ ingredients: [{ name: ['Required.'] }], steps: [{ text: ['Too long.'] }] }), { 'ingredients.0.name': 'Required.', 'steps.0.text': 'Too long.' })
})

test('management page adapter preserves metadata and handles complete bare arrays', () => {
  const page = { count: 50, next: '?page=2', previous: null, results: [{ id: 'a' }] }
  assert.deepEqual(normalizeManagementPage(page), page)
  assert.deepEqual(normalizeManagementPage([{ id: 'a' }]), { count: 1, next: null, previous: null, results: [{ id: 'a' }] })
  assert.throws(() => normalizeManagementPage({ results: [] }), /paginated object/)
})
