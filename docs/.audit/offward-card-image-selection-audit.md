# Offward — Manual Card Image Selection Audit

**Date:** 2026-11-08
**Scope:** Frontend audit only. No code was modified. Findings are based exclusively on executable source under `src/`.

Goal under audit: let administrators manually pick the image shown on cards / featured presentations, choosing only from images in galleries already attached to the entity, with a distinct selection possible per placement, while keeping the current automatic selection as the fallback.

---

## 1. Inventory of card / featured surfaces and how each obtains its image

All public card surfaces derive their image **automatically** from the entity payload. There is **no stored per-card or per-placement image selection anywhere** except the Story hero image (see §4).

| # | Surface (placement) | Component | Image resolution |
|---|---------------------|-----------|------------------|
| 1 | Homepage "Latest" rail — Story | `src/features/home/LatestStoryCard.jsx` (line 11) | `getDetailHeroImage(story, 'story')` → `story.hero_image` first, then first image of first attached collection (`src/shared/utils/detailHeroImage.js` lines 47–58) |
| 2 | Homepage "Latest" rail — Place | `src/features/home/LatestPlaceCard.jsx` (line 10) | `getExplorePreview(place)` → `hero_image` → `collectionPreview(image_collections[0])` → `preview_image` → `image` → `thumbnail` (`src/features/explore/exploreUtils.js` lines 10–14) |
| 3 | Homepage "Latest" rail — Route | `src/features/home/LatestRouteCard.jsx` (line 13) | Same `getExplorePreview` chain; falls back to `RouteMiniMap` when no image |
| 4 | Homepage "Latest" rail — Food | `src/features/home/LatestFoodCard.jsx` (lines 8–12) | `preview_image` → `preview_image_url` → `collectionPreview(image_collections[0])` → `image` → `thumbnail`. **Never reads `hero_image`.** |
| 5 | Homepage "Latest" rail — Video | `src/features/home/LatestVideoCard.jsx` (line 11) | Provider `thumbnail_url`/`thumbnail`; not gallery-based (out of scope for this feature) |
| 6 | Explore grid cards (routes & places), also reused as Country-page previews | `ExploreCard` in `src/features/explore/ExploreResults.jsx` (line 16); reused by `src/pages/CountryEntityPreview.jsx` (line 46) | Routes: `getExplorePreview`. Places: `getPlacePreview(place)` → **only** `firstCollectionPreview(place.image_collections)` (collection `preview_image`/`preview_image_url`; never `hero_image`, never `images[0]`) |
| 7 | Food listing & related-food grids | `src/features/food/FoodCard.jsx` (lines 10–13); used by `src/pages/FoodsListPage.jsx`, `src/features/food/RelatedFood.jsx`, `src/features/food/CountryFood.jsx` | Same chain as #4. **Never reads `hero_image`.** |
| 8 | Stories list cards | `getStoryPreviewUrl` in `src/pages/StoriesListPage.jsx` (lines 17–30) | `hero_image` → first collection `preview_image`/`images[0]` → `preview_image`/`image`/`thumbnail` |
| 9 | Related-content compact cards (Story page, Food page, places-along-route) | `src/shared/components/CompactRelatedEntityCard.jsx` (`getPreview`, lines 8–16); used by `src/pages/StoryPage.jsx` (lines 398, 420), `src/features/food/FoodRelatedContent.jsx` (line 36), `src/features/routes/components/RoutePlacesAlongRoute.jsx` (line 68) | `Place` branch: `firstCollectionPreview(image_collections)` only. Other types: `hero_image` → `collectionPreview(image_collections[0])` → `preview_image` → `image` → `thumbnail` |
| 10 | Route-map detail overlay card | `resolvePreviewImage` in `src/features/routes/components/RouteMapDetailOverlay.jsx` (lines 8–13) | First attached collection with a usable `collectionPreview`, else video thumbnail |
| 11 | Detail-page media section gallery covers | `src/features/routes/components/EntityMediaSection.jsx` (line 30) | `collectionPreview(gallery)` per gallery — this is a detail-page gallery listing, explicitly **out of scope** (must not change) |
| 12 | Social/meta image | `getContentSocialImage` in `src/shared/utils/publicUrls.js` (lines 78–99) | `hero_image` (when `preferHero`) → `preview_image`/`image`/`cover_image` → collection previews |

Homepage composition: `src/features/home/LatestContentRail.jsx` fetches one newest item per type from the public list endpoints (`storiesApi`, `routesApi`, `placesApi`, `foodsApi`, `videosApi`) and passes the **same raw entity record** to the card. There is no separate "featured" model, endpoint, or payload — "featured" on the homepage is just the newest public record per type.

### Shared automatic-resolution utilities (the "no manual choice" fallback to preserve)

- `src/shared/utils/detailHeroImage.js` — `getDetailHeroImage(content, entityType)`: story `hero_image` first, then scans `content.image_collections[].images[]` for a full URL, then thumbnails, then collection `preview_image`/`preview_image_url`.
- `src/features/explore/exploreUtils.js` — `getExplorePreview` (line 10), `getPlacePreview` (line 16).
- `src/features/management/imageCollectionUtils.js` — `collectionPreview` (collection `preview_image` → `preview_image_url` → `images[0]`), `firstCollectionPreview`, `imagePreviewUrl` (`thumbnail_url` → full URL), `imageUrl`, `imageId`.

All chains are null-safe: when a field is absent they simply fall through. This is the mechanism that preserves automatic selection — a manual field that is `null`/absent costs nothing.

---

## 2. Can different placements already store distinct image selections?

**No.** Every placement of a given entity (homepage rail, Explore grid, related-content card, social image, map overlay) renders from the **same entity payload** fetched from the same public endpoint. There is:

- no per-placement field on any entity,
- no placement-scoped API (no "featured" endpoint; homepage = newest record),
- no frontend state/store that could hold a placement→image mapping, and nothing persists client-side selections.

Therefore distinct images per placement is a **missing contract**: it cannot be achieved frontend-only. One manual selection **per entity** (shared by all its card placements) is achievable with the existing Story pattern; **per-placement** selections require new backend fields (see §6).

---

## 3. How attached galleries and image assets are represented

Two API families:

**Public** — `src/services/imageCollectionsApi.js`: `GET /api/offward/image-collections/:id/` (detail, request-deduplicated). Public entity payloads embed `image_collections: [{ id, title, preview_image, preview_image_url, image_count, images?: [...] }]`; cards read whatever subset the list serializer includes (resolvers tolerate both summary-only and full shapes).

**Management** — `src/services/management/imageCollectionsApi.js`:
- `GET/POST/PATCH/DELETE /api/offward/manage/image-collections/` (+ `/:id/`)
- `PUT /api/offward/manage/image-collections/:id/images/` — membership replacement (`replaceImages`)
- `POST /api/offward/manage/images/` — asset upload (`uploadImage`)

Image identity: a collection row is a **CollectionImage membership** (`image_asset_id`, `order`, `caption`) referencing an **ImageAsset** UUID. `imageId()` in `src/features/management/imageCollectionUtils.js` (lines 23–27) canonicalizes this: `image_asset_id` wins over `id`. Thumbnails come from `thumbnail_url`/`url`/nested asset fields via `membershipPreviewUrl`/`imagePreviewUrl` — **thumbnails already exist; nothing needs uploading or generating.**

Crucial enabler: `src/features/management/useManagementCatalog.js` (second effect, lines 34–48) fetches `getById` for every **attached** collection id, so editors always have the **full `images` array of attached galleries** available client-side. This is exactly what an image picker limited to attached galleries needs, and it is already how the Story hero picker gets its thumbnails.

Entity↔gallery attachment is persisted as `image_collection_ids` on the entity itself (saved by `PATCH /api/offward/manage/<resource>/:id/` via `src/services/management/entityApi.js`), except route waypoints/segments which persist immediately through the route-map editor (`GalleryAttachmentManager persistImmediately` in `src/features/routes/routeMap/components/WaypointList.jsx` lines 216–223). Selecting an image must **not** touch `replaceImages` (that is membership/ordering — forbidden by the constraints); it only needs to store an `image_asset_id` on the owning entity.

---

## 4. Existing manual image selection (the proven pattern)

**Stories already have the entire loop**, end to end:

1. **Field:** `hero_image_id: null` default — `src/features/management/entityConfig.js` line 89.
2. **Hydration:** `getInitialValues` in `src/features/management/EntityFormPage.jsx` (lines 73–81) copies any default-keyed field (including `hero_image_id`, `image_collection_ids`) straight from the management detail response.
3. **Editor UI:** `ContentImageCollectionManager` (`src/features/management/ContentImageCollectionManager.jsx` lines 8, 66–71) — when given `heroImageId`/`onHeroImageChange`, renders a thumbnail picker built by flattening `collection.images` of **attached** collections, plus a radio **"Automatic — using last attached image"** that sets the field back to `null`. Wired for stories at `EntityFormPage.jsx` lines 1178–1184.
4. **Payload:** story submit normalizes `hero_image_id` to `null` when unset (`EntityFormPage.jsx` lines 509–511; the generic empty-value pruning at lines 514–523 would otherwise drop it). Saved via generic `PATCH` (`entityApi.js`).
5. **Public read:** the public story serializer returns a resolved `hero_image` object; consumed by `getDetailHeroImage` (detail hero + `LatestStoryCard`), `getStoryPreviewUrl` (stories list), `CompactRelatedEntityCard`, `getExplorePreview`, and `getContentSocialImage`.
6. **Automatic fallback preserved:** `hero_image_id === null` ⇒ no `hero_image` in payload ⇒ every resolver falls through to the collection-based chain.

Other manual media fields exist but belong to a different (media, not gallery) family: `countries.hero_media_id` and `partners.logo_media_id` (`entityConfig.js` lines 33, 157). Countries/partners cards are not gallery-based and are out of scope.

## 5. What each management editor exposes today

| Resource | Gallery attachment UI | Image selection UI |
|---|---|---|
| Stories | `ContentImageCollectionManager` (toggle + reorder) | ✅ hero-image thumbnail picker + Automatic radio |
| Foods | `ContentImageCollectionManager` **without** `onHeroImageChange` (`EntityFormPage.jsx` line 1025) → picker not rendered | ❌ none |
| Places | `GalleryAttachmentManager` (`EntityFormPage.jsx` lines 1062–1069) | ❌ none (component has no image-picker capability) |
| Routes | `GalleryAttachmentManager` (`EntityFormPage.jsx` lines 1120–1127) | ❌ none |
| Route waypoints/segments | `GalleryAttachmentManager persistImmediately` (`WaypointList.jsx`) | ❌ none |
| Galleries themselves | `src/pages/manage/galleries/GalleryEditPage.jsx` (membership, order, captions) | n/a — must not be touched for this feature |

`GalleryAttachmentManager` already loads the catalog via `useManagementCatalog` and can open a full-image `ImageLightbox` preview (detail fetch in `openPreview`), so the data needed for a thumbnail picker is already flowing through it; only the picker UI and a selected-id prop are missing.

---

## 6. Missing contracts — is backend work required?

**Yes, for everything beyond stories.** The frontend sends writes only through `PATCH /api/offward/manage/<resource>/:id/` with whitelisted serializer fields, and renders only fields present in public payloads. Missing:

1. **Per-entity card image for Places, Routes, Foods** (one selection reused by all of that entity's cards):
   - Management serializers must accept/return `hero_image_id` (nullable ImageAsset UUID, validated to belong to one of the entity's attached collections).
   - Public list **and** detail serializers must emit a resolved `hero_image` (`{ url, thumbnail_url }`) when set. Note: public **list** endpoints must include it, because every card surface renders from list payloads (`getPublicPlaces`, `getPublicRoutes`, `getPublicFoods`, `getPublicStories`).
2. **Per-placement distinct images** (e.g., homepage rail vs Explore vs related card showing different images of the same entity): no field, no endpoint, no model exists. Requires a new backend contract — either discrete nullable fields (`card_image_id`, `featured_image_id`, …) or a placement-keyed map (`image_selections: { "card": <asset-id>, "featured": <asset-id> }`) with matching resolved URLs in public payloads. Frontend cannot emulate this without persistence.
3. **Stories:** no backend work needed for per-entity selection (already shipped). Per-placement for stories falls under item 2 like everyone else.

If the product accepts **one manual image per entity** (same image on every card placement of that entity, distinct between entities — which satisfies "each card or featured presentation may use a different selected image" whenever placements show different entities), item 1 alone suffices and the Story contract is simply replicated.

---

## 7. Preserving automatic selection

Already solved by convention — nothing new to invent:

- Sentinel: `hero_image_id = null` ⇒ "Automatic" (explicit radio in `ContentImageCollectionManager.jsx` line 69).
- Submit normalization keeps the explicit `null` (pattern at `EntityFormPage.jsx` lines 509–511; must be replicated per resource because of the generic null-pruning loop).
- Every public resolver (`getDetailHeroImage`, `getExplorePreview`, `getPlacePreview`, `FoodCard`/`LatestFoodCard` chains, `CompactRelatedEntityCard.getPreview`, `getContentSocialImage`) is an ordered fallback chain; a missing `hero_image` silently yields today's behavior.

---

## 8. Smallest implementation plan

### Phase 0 — Backend contract (prerequisite, outside this frontend audit's scope)
Add nullable `hero_image_id` (write) + resolved `hero_image` (read, lists **and** detail) to Places, Routes, Foods, mirroring Stories. For per-placement support, add the placement-keyed variant from §6.2 instead/in addition.

### Phase 1 — Per-entity selection for Foods (frontend-only once contract exists; smallest diff)
1. `src/features/management/entityConfig.js` — add `hero_image_id: null` to `foods.defaultValues` (hydration then works automatically via `getInitialValues`).
2. `src/features/management/EntityFormPage.jsx` — pass `heroImageId={formData.hero_image_id}` / `onHeroImageChange` to the food `ContentImageCollectionManager` (line 1025), and extend the stories-style `hero_image_id ?? null` payload normalization to `foods` (near lines 502–511; `buildFoodPayload` in `src/features/food/foodForm.js` must whitelist the field — its test currently asserts `hero_image_id` is stripped, `src/features/food/foodForm.test.js` lines 33–39).
3. Card resolvers — prepend `imageUrl(food.hero_image)` in `FoodCard.jsx` (line 10) and `LatestFoodCard.jsx` (line 8). (`CompactRelatedEntityCard` and `getContentSocialImage` already read `hero_image`.)

### Phase 2 — Per-entity selection for Places and Routes
1. `entityConfig.js` — add `hero_image_id: null` to `places` and `routes` defaults.
2. `src/features/management/GalleryAttachmentManager.jsx` — add optional `selectedImageId` / `onSelectedImageChange` props rendering the same attached-images thumbnail grid + "Automatic" radio as `ContentImageCollectionManager` (reuse `imageId`/`imageUrl`/`imagePreviewUrl`; attached collections' full `images` are already fetched by `useManagementCatalog`). Alternatively extract the hero-picker block of `ContentImageCollectionManager` (lines 66–71) into a small shared component used by both managers — slightly larger diff, zero duplication.
3. `EntityFormPage.jsx` — wire the new props on the Place (line 1062) and Route (line 1120) managers; add `hero_image_id ?? null` normalization for `places`/`routes` in `buildPayload`.
4. Card resolvers:
   - `src/features/explore/exploreUtils.js` — `getPlacePreview` (line 16): prepend `imageUrl(place.hero_image)` (routes already covered by `getExplorePreview`'s `hero_image` head).
   - `src/shared/components/CompactRelatedEntityCard.jsx` — `getPreview` Place branch (line 9): prepend `imageUrl(entity.hero_image)`.
   - `src/features/routes/components/RouteMapDetailOverlay.jsx` — `resolvePreviewImage` (lines 8–13): prepend the route's `hero_image` if that payload carries it.
5. Do **not** touch `GalleryEditPage`, `replaceImages`, detail-page galleries (`EntityMediaSection`, `ImageLightbox`), or collection ordering — selection lives entirely on the owning entity.

### Phase 3 — Per-placement selections (only if required after Phases 1–2)
Once the backend exposes placement-keyed fields (§6.2): extend the Phase 2 picker to render one selector per supported placement (e.g., "Card image", "Featured image"), and have each surface read its placement key first (`hero_image?.card` / `featured_image`) before the shared `hero_image` and then the automatic chain. No other frontend structure changes are needed — all surfaces already funnel through the small set of resolvers listed in §1.

### Verification checklist (post-implementation)
- Selection persists across save + reload of the manage form (field round-trips through `PATCH` → `getById` → `getInitialValues`).
- "Automatic" radio restores pre-feature imagery on every surface in §1.
- Gallery membership/order unchanged (no `replaceImages` calls introduced).
- Detail-page galleries render identically.

---

## 9. Risks / caveats found during the audit

1. **Generic null-pruning:** `buildPayload`'s cleanup loop (`EntityFormPage.jsx` lines 514–523) deletes empty/null keys; without a per-resource `hero_image_id ?? null` guard, "reset to Automatic" would silently never reach the API. Stories already guard this — each new resource must too.
2. **Food payload whitelist:** `buildFoodPayload` strips unknown fields and its test (`foodForm.test.js` line 39) asserts `hero_image_id` is removed — this test encodes today's contract and must be updated with Phase 1.
3. **Places ignore `hero_image` everywhere** (`getPlacePreview`, `CompactRelatedEntityCard` Place branch) — both resolvers must be edited or place selections will persist but never render.
4. **Public list serializers** must carry the resolved image; if only detail endpoints get it, every card in §1 (all list-fed) keeps showing the automatic image.
5. **Waypoint/segment cards** (route-map editor attachments) persist via `routeMapApi`, not `entityApi`; if per-waypoint selections are ever needed, they need their own field on the waypoint contract — excluded from the minimal plan.
6. **Video cards** use provider thumbnails, and **country cards** use `hero_media_id` (media family) — both are outside the gallery-based selection feature.
