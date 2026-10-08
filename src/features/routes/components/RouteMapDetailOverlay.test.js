import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

let server
let RouteMapDetailOverlay
let invalidatePublicFoods
let rememberPublicFoods

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  const overlayModule = await server.ssrLoadModule('/src/features/routes/components/RouteMapDetailOverlay.jsx')
  const cacheModule = await server.ssrLoadModule('/src/features/food/publicFoodCache.js')
  RouteMapDetailOverlay = overlayModule.default
  invalidatePublicFoods = cacheModule.invalidatePublicFoods
  rememberPublicFoods = cacheModule.rememberPublicFoods
})

after(async () => {
  await server?.close()
})

function renderOverlay(foodIds) {
  return renderToStaticMarkup(createElement(
    MemoryRouter,
    null,
    createElement(RouteMapDetailOverlay, {
      detail: {
        id: 'child',
        type: 'waypoint',
        eyebrow: 'Waypoint 2',
        title: 'Market',
        subtitle: 'VIA',
        foodIds,
        videos: [],
        imageCollections: [],
      },
      onClose() {},
      onShowFullRoute() {},
      onViewDetails() {},
    }),
  ))
}

test('map detail overlay renders only resolved Food and uses its public slug link', () => {
  const missingFoodId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  invalidatePublicFoods()
  rememberPublicFoods([
    { id: 'food-1', slug: 'peka / dish', title: 'Peka ispod Saca' },
    { id: 'food-2', slug: 'second-food', title: 'Second Food' },
  ])

  const html = renderOverlay(['food-1', 'food-2', missingFoodId])

  assert.match(html, /FOOD · 2 of 3/)
  assert.match(html, /href="\/food\/peka%20%2F%20dish"/)
  assert.match(html, /Peka ispod Saca/)
  assert.match(html, /\+1 more/)
  assert.match(html, /1 more Food item is not resolved yet/)
  assert.doesNotMatch(html, new RegExp(missingFoodId))
  invalidatePublicFoods()
})

test('map detail overlay keeps an unresolved Food lookup compact and paginated', () => {
  invalidatePublicFoods()

  const html = renderOverlay(['unresolved'])

  assert.match(html, /Food was not found in the loaded public pages/)
  assert.match(html, /Check next page/)
  assert.doesNotMatch(html, /href="\/food\/unresolved"/)
  invalidatePublicFoods()
})
