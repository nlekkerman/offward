import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toImageMembershipPayload, toMembershipRows } from './imageCollectionUtils.js'

test('saved membership rows hydrate previews from existing ImageAsset URL fields', () => {
  const rows = toMembershipRows([
    { id: 'row-2', image_asset_id: 'asset-b', order: 1, caption: 'B', public_url: 'https://example.invalid/b.webp' },
    { id: 'row-1', image_asset_id: 'asset-a', order: 0, caption: 'A', thumbnail_url: 'https://example.invalid/a-thumb.webp' },
    { id: 'row-3', image_asset_id: 'asset-c', order: 2, image_asset: { id: 'asset-c', thumbnail_url: 'https://example.invalid/c-thumb.webp' } },
  ])

  assert.deepEqual(rows, [
    { image_asset_id: 'asset-a', caption: 'A', url: 'https://example.invalid/a-thumb.webp' },
    { image_asset_id: 'asset-b', caption: 'B', url: 'https://example.invalid/b.webp' },
    { image_asset_id: 'asset-c', caption: '', url: 'https://example.invalid/c-thumb.webp' },
  ])
  assert.deepEqual(toImageMembershipPayload(rows), [
    { image_asset_id: 'asset-a', order: 0, caption: 'A' },
    { image_asset_id: 'asset-b', order: 1, caption: 'B' },
    { image_asset_id: 'asset-c', order: 2, caption: '' },
  ])
})

test('rows without a URL fall back to previously known previews and never invent one', () => {
  const previous = [{ image_asset_id: 'asset-a', url: 'https://example.invalid/uploaded.webp' }]
  const rows = toMembershipRows([
    { id: 'row-1', image_asset_id: 'asset-a', order: 0 },
    { id: 'row-2', image_asset_id: 'asset-b', order: 1 },
  ], previous)

  assert.equal(rows[0].url, 'https://example.invalid/uploaded.webp')
  assert.equal(rows[1].url, '')
})
