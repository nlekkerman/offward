import assert from 'node:assert/strict'
import { test } from 'node:test'
import { collectionCount, collectionPreview, imageId, imagePreviewUrl, imageUrl, membershipPreviewUrl, toImageMembershipPayload, toMembershipRows } from './imageCollectionUtils.js'

test('collection list previews prefer the supplied thumbnail without needing embedded images', () => {
  const collection = {
    id: '31c5d167-0502-4ad6-9838-5abd593b347b',
    title: 'Skocaj',
    image_count: 3,
    preview_image: {
      id: '41127eca-782d-42e7-b52f-e5bc1944f520',
      url: 'https://example.invalid/full.webp',
      thumbnail_url: 'https://example.invalid/thumb.webp',
      width: 1152,
      height: 2048,
    },
    preview_image_url: 'https://example.invalid/legacy.webp',
  }
  assert.equal(collectionPreview(collection), collection.preview_image.thumbnail_url)
  assert.equal(imagePreviewUrl(collection.preview_image), collection.preview_image.thumbnail_url)
  assert.equal(collectionCount(collection), 3)

  for (const thumbnail_url of [null, undefined, '']) {
    assert.equal(collectionPreview({
      ...collection,
      preview_image: { ...collection.preview_image, thumbnail_url },
    }), collection.preview_image.url)
  }
})

test('collection previews retain legacy fallbacks and empty collections have no invented preview', () => {
  assert.equal(collectionPreview({ preview_image: null, preview_image_url: 'legacy.webp' }), 'legacy.webp')
  assert.equal(collectionPreview({ images: [{ url: 'first.webp' }] }), 'first.webp')
  assert.equal(collectionPreview({ preview_image: null, image_count: 0 }), '')
  assert.equal(collectionPreview(undefined), '')
})

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

test('management detail and authoritative PUT rows prefer nested thumbnails and preserve asset identity', () => {
  const detail = [
    { id: 'membership-b', image_asset_id: 'asset-b', order: 1, caption: 'B', image: { id: 'asset-b', url: 'b-full.webp', thumbnail_url: null } },
    { id: 'membership-a', image_asset_id: 'asset-a', order: 0, caption: 'A', url: 'stale-flat.webp', image: { id: 'asset-a', url: 'a-full.webp', thumbnail_url: 'a-thumb.webp', width: 1152, height: 2048 } },
    { id: 'membership-c', image_asset_id: 'asset-c', order: 2, caption: 'C', image: { id: 'asset-c', thumbnail_url: 'c-thumb.webp' } },
  ]
  const loaded = toMembershipRows(detail)
  assert.deepEqual(loaded, [
    { image_asset_id: 'asset-a', caption: 'A', url: 'a-thumb.webp' },
    { image_asset_id: 'asset-b', caption: 'B', url: 'b-full.webp' },
    { image_asset_id: 'asset-c', caption: 'C', url: 'c-thumb.webp' },
  ])
  const previous = loaded.map((row) => ({ ...row, url: 'same-session.webp' }))
  assert.deepEqual(toMembershipRows(detail, previous), loaded)
  assert.deepEqual(toMembershipRows(detail), loaded)
  for (const thumbnail_url of [null, undefined, '']) {
    assert.equal(membershipPreviewUrl({ image: { thumbnail_url, url: 'full.webp' } }), 'full.webp')
  }

  const saved = toMembershipRows([
    { ...detail[0], order: 0, caption: 'Saved caption' },
    { ...detail[1], order: 1, image: { id: 'asset-a', url: 'new-full.webp', thumbnail_url: 'new-thumb.webp' } },
  ], previous)
  assert.deepEqual(saved, [
    { image_asset_id: 'asset-b', caption: 'Saved caption', url: 'b-full.webp' },
    { image_asset_id: 'asset-a', caption: 'A', url: 'new-thumb.webp' },
  ])
  assert.deepEqual(toImageMembershipPayload(saved), [
    { image_asset_id: 'asset-b', order: 0, caption: 'Saved caption' },
    { image_asset_id: 'asset-a', order: 1, caption: 'A' },
  ])
  assert.deepEqual(toImageMembershipPayload(detail), detail.map((row, index) => ({
    image_asset_id: row.image_asset_id, order: index, caption: row.caption,
  })))
})

test('image identity never falls back to membership UUIDs while raw Story assets still work', () => {
  assert.equal(imageId({ id: 'membership', image_asset_id: 'asset', image: { id: 'different-asset' } }), 'asset')
  assert.equal(imageId({ id: 'membership', order: 0, image: { id: 'asset' } }), 'asset')
  assert.equal(imageId({ id: 'membership', image_asset_id: null }), '')
  assert.equal(imageId({ id: 'membership', order: 0 }), '')
  assert.deepEqual(toMembershipRows([{ id: 'membership', order: 0 }]), [])
  assert.equal(imageId({ id: 'story-asset', url: 'story.webp' }), 'story-asset')
  assert.equal(imageUrl({ id: 'membership', image_asset_id: 'asset', image: { url: 'story.webp' } }), 'story.webp')
})

test('fresh uploads retain flat presentation URLs as same-session fallbacks', () => {
  for (const asset of [
    { id: 'asset', thumbnail_url: 'upload-thumb.webp' },
    { id: 'asset', url: 'upload-full.webp' },
    { id: 'asset', public_url: 'upload-public.webp' },
  ]) {
    const uploaded = toMembershipRows([asset])
    const saved = toMembershipRows([{ id: 'membership', image_asset_id: 'asset', order: 0, caption: 'Uploaded' }], uploaded)
    assert.equal(saved[0].url, membershipPreviewUrl(asset))
    assert.equal(saved[0].image_asset_id, 'asset')
    assert.equal(saved[0].caption, 'Uploaded')
  }
})
