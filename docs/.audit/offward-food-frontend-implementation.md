# Offward Food Frontend Implementation

Food is integrated into the existing management shell and public application. No backend, auth, provider upload infrastructure, Explore behavior, Route overlays, or Route authoring/child-write flows were changed.

The supplied implementation specification is the Food contract source. The backend design/implementation documents named in the original request were not present in this checkout. The [original frontend audit](./offward-food-frontend-integration-audit.md) remains a historical assessment; its implementation follow-up records how the contract gaps were addressed.

## Files Changed

Paths below are relative links to the actual implementation. No dependencies were added and no commit was created.

### Food domain, management composition, and public presentation

- [foodConstants.js](../../src/features/food/foodConstants.js): specified Food enums and display labels.
- [foodForm.js](../../src/features/food/foodForm.js): form defaults, detail hydration, validation, payload whitelist, ordering, nested errors.
- [FoodRecipeEditor.jsx](../../src/features/food/FoodRecipeEditor.jsx): ingredient and step rows.
- [foodManagement.css](../../src/features/food/foodManagement.css): scoped Food form styling and compact recipe controls.
- [FoodCard.jsx](../../src/features/food/FoodCard.jsx): public list/compact cards with real Food slug links.
- [RelatedFood.jsx](../../src/features/food/RelatedFood.jsx): common owner-related Food section.
- [FoodRelatedContent.jsx](../../src/features/food/FoodRelatedContent.jsx): Food detail's related Places, Routes, Stories, Waypoints and Segments.
- [publicFoodCache.js](../../src/features/food/publicFoodCache.js): application-wide public Food cache instance.
- [publicFoodCacheState.js](../../src/features/food/publicFoodCacheState.js): cache/paged catalog state, concurrent deduplication and invalidation.
- [publicFoodResolution.js](../../src/features/food/publicFoodResolution.js): shallow-ID resolution and bounded child-parent lookup.
- [publicRelationshipCatalog.js](../../src/features/food/publicRelationshipCatalog.js): public-only relationship catalogs and Route-detail cache.
- [usePublicCountries.js](../../src/features/food/usePublicCountries.js): page-aware public Country options.
- [food.css](../../src/features/food/food.css): scoped public Food cards, detail, recipe and responsive styling.
- [FoodsListPage.jsx](../../src/pages/FoodsListPage.jsx): public list, filters and load-more.
- [FoodPage.jsx](../../src/pages/FoodPage.jsx): public detail, shared media and related content.
- [foodsApi.js](../../src/services/foodsApi.js): strict public Food API adapter.

### Existing shell, registration, and shared components

- [manageRouter.jsx](../../src/app/manageRouter.jsx), [entityConfig.js](../../src/features/management/entityConfig.js), [management/index.js](../../src/services/management/index.js), [ManageDashboardPage.jsx](../../src/pages/manage/ManageDashboardPage.jsx): management registration.
- [EntityFormPage.jsx](../../src/features/management/EntityFormPage.jsx): Food branch in the existing form/save flow.
- [EntityListPage.jsx](../../src/features/management/EntityListPage.jsx): existing list shell with page-aware loading and Food cache invalidation on delete.
- [entityApi.js](../../src/services/management/entityApi.js), [imageCollectionsApi.js](../../src/services/management/imageCollectionsApi.js), [catalogPagination.js](../../src/services/management/catalogPagination.js): backward-compatible management page helpers.
- [useManagementCatalog.js](../../src/features/management/useManagementCatalog.js), [CatalogStatus.jsx](../../src/features/management/CatalogStatus.jsx): shared paging, selected-record hydration and visible catalog states.
- [RelationshipAttachmentManager.jsx](../../src/features/management/RelationshipAttachmentManager.jsx): controlled selection, disabled states and removable unresolved IDs.
- [FoodRelationshipManager.jsx](../../src/features/management/FoodRelationshipManager.jsx): shared management Food selector, pagination, selected-record hydration and relationship error state.
- [foodRelationshipWrites.js](../../src/features/management/foodRelationshipWrites.js): relationship-only Food read/modify/PATCH helper.
- [ContentVideoManager.jsx](../../src/features/video/ContentVideoManager.jsx): shared paged Video catalog, upload insertion, busy reporting and explicit detach errors.
- [ContentImageCollectionManager.jsx](../../src/features/management/ContentImageCollectionManager.jsx), [GalleryAttachmentManager.jsx](../../src/features/management/GalleryAttachmentManager.jsx): shared paged/hydrated collection options and error states.
- [GalleryListPage.jsx](../../src/pages/manage/galleries/GalleryListPage.jsx): management gallery-list pagination.
- [index.css](../../src/index.css): preserve existing shared Video layout when using its disabled fieldset.
- [router.jsx](../../src/app/router.jsx), [AppShell.jsx](../../src/shared/layout/AppShell.jsx): public routes, Food navigation and active state.
- [countriesApi.js](../../src/services/countriesApi.js): additive public Country page helper; existing array-returning helper preserved.
- [CountryPage.jsx](../../src/pages/CountryPage.jsx) and [CountryFood.jsx](../../src/features/food/CountryFood.jsx): derive Country Food from the canonical Food Country filter.
- [PlacePage.jsx](../../src/pages/PlacePage.jsx), [RoutePage.jsx](../../src/pages/RoutePage.jsx), [StoryPage.jsx](../../src/pages/StoryPage.jsx), [WaypointDetailPage.jsx](../../src/pages/WaypointDetailPage.jsx), [SegmentDetailPage.jsx](../../src/pages/SegmentDetailPage.jsx): import/mount the shared Related Food section using each owner's own `food_ids`.

### Tests and documentation

- [foodForm.test.js](../../src/features/food/foodForm.test.js): contract, replacement/omission, recipe order, metadata, hydration and errors.
- [publicFood.test.js](../../src/features/food/publicFood.test.js): strict paging, cache, retry, bounded resolution and stale-response invalidation.
- [managementIntegration.test.js](../../src/features/management/managementIntegration.test.js): mocked management/public API checks and server-rendered component assertions.
- [integration audit](./offward-food-frontend-integration-audit.md): retained original findings plus implementation follow-up.
- This implementation report.

## Management Registration

Food uses the existing configuration, entity CRUD factory, dashboard and protected management routes:

- `/manage/foods`
- `/manage/foods/new`
- `/manage/foods/:id/edit`

The resource key is plural `foods`, matching `/api/offward/manage/foods/` and UUID detail endpoints. Existing access protection, management navigation and shell are reused; there is no second Food management application.

## Food List Management

The existing entity list supports Food title/status display, create/edit navigation and deletion. The page-aware helper retains `count`, `next`, `previous` and `results`; explicit Load more reaches later pages without automatic catalog crawling. Existing `.list()` callers still receive arrays.

Loading and errors are visible; loaded results survive a subsequent-page failure. Delete uses the existing confirmation/API flow. Successful local Food deletion invalidates public Food cache.

## Food Form

The existing Entity Form contains Food-specific fields rather than a parallel form shell:

| Fields | Behavior |
| --- | --- |
| `title`, `slug` | Required core text fields; existing controls and validation presentation. |
| `country` | Required canonical Country selected from the management Country catalog. |
| `food_type` | Exactly `dish`, `recipe`, `story`, `guide`, `place_to_eat`, `ingredient`, `other`. Default `dish`. |
| `status` | Exactly `active`, `upcoming`, `inactive`. Default `inactive`. |
| `summary`, `body` | Existing text/textarea presentation. |
| `prep_time_minutes`, `cook_time_minutes`, `servings` | Optional nullable positive integers, visible for every Food type. Blank values serialize as `null` to clear existing metadata. |
| `ingredients`, `steps` | Ordered recipe rows; not restricted to `food_type=recipe`. |
| `video_ids` | Existing saved-owner manager; attachment writes are immediate. |
| `image_collection_ids` | Ordered UUID array; deferred to parent Save. |
| `published_at` | Read-only; never included in a write payload. |

Food has no `hero_image_id` field/control.

Management publication timestamps use the shared management date formatter with
the browser's locale and local timezone, including hours and minutes. Food,
Story and Video tables and the read-only Published field share this presentation.
Empty or invalid dates display a dash; API values and publication behavior are
unchanged. Event timestamps and Place visited dates also use the shared formatter
in the entity table.

Food bypasses the generic blank/null cleanup with an explicit whitelist. Lists omitted from an edit response remain omitted on untouched Save; supplied arrays replace, and explicit `[]` clears. Unknown/read-only fields do not leak into payloads. Edit writes use the existing PATCH helper, not a synthetic full-record PUT.

Create redirects to the saved Food edit surface so Videos can be attached only after an owner UUID exists. Failed initial detail loading blocks the editor and offers retry, preventing accidental overwrites. Parent Save is disabled while a Video write is busy; shared field/row errors include nested backend ingredient/step paths.

## Recipe Editor

The new small Food-specific editor adds, removes and moves ingredient/step rows with Up/Down controls. Structural edits recompute contiguous **one-based** `order` values; loaded rows are sorted before editing.

- Ingredients expose `name`, textual `quantity`, and `note`.
- Steps expose `text`.
- Required row fields validate locally and display backend row/field errors.
- Boundary controls are disabled, action labels identify the row, and form busy state disables editing.
- Recipe changes persist only with parent Save. Empty row arrays explicitly clear the corresponding list.

There is no separate recipe endpoint, drag/drop library or generic row-framework dependency.

## Relationship Authoring Direction Correction

Food create/edit authors Food content only: required Country, title, slug, type, status, summary/body, recipe metadata, ingredients, steps, Videos and image collections. It no longer provides Place/Route/Story/Waypoint/Segment relationship pickers or includes those relationship arrays in Food form payloads.

Relationship authoring is on the owning management surfaces:

- Route edit attaches/detaches Food through `Food.route_ids`.
- Place edit attaches/detaches Food through `Food.place_ids`.
- Story edit attaches/detaches Food through `Food.story_ids`.
- The Route map Waypoint editor attaches Food only for persisted Waypoint UUIDs through `Food.waypoint_ids`. Draft Waypoints show “Save waypoint before adding Food.”
- There is no saved Segment editor: the management Route map shows candidate Waypoint-pair geometry, not persisted Segment CRUD. Segment Food authoring is deferred; no candidate pair IDs are offered.
- Country has no independent Food attachment relationship. Country Foods derive from `Food.country`; public Country detail queries the existing public Food endpoint with that canonical Country filter.

The same [FoodRelationshipManager](../../src/features/management/FoodRelationshipManager.jsx) is reused on Route, Place, Story and Waypoint editors. It uses the management Food catalog, shows title/type/Country, searches loaded records locally, supports explicit pagination, hydrates selected records outside the current page, and preserves unresolved UUIDs with visible retry/error states.

Each attach/detach re-reads the current Food detail, requires the requested relationship to be an array, adds/removes only the owner UUID in that array, then PATCHes only that relationship field through the management Food API. No cached Food form data or recipe/media/status/Country fields are sent. UI actions are disabled while a relationship write is pending; errors are shown without optimistic success. Waypoint Food writes do not PUT/replace waypoint collections or touch map geometry. Candidate Segments are never used as persisted Segment IDs.

Public Route, Place, Story, Waypoint and Segment Food sections remain scoped to each record's public `food_ids`. Public Country Food is different by design and is derived from canonical `Food.country`.

## Video Integration

Food reuses the existing Content Video Manager with `resourceKey="foods"`:

- Pick existing Videos from the shared management catalog, including explicit later pages.
- Hydrate selected UUIDs that are absent from loaded pages.
- Reuse the existing Video creation/upload/provider flow and previews/player.
- Insert a newly created Video into local catalog state immediately, so attachment failure/retry does not hide it.
- PATCH the saved owner with the replacement `video_ids` list on attach/detach; these writes are **immediate**, not deferred until Food Save.
- Surface attachment/detach failures and unresolved Video IDs; report busy state to the parent.

The new-owner surface explains that Food must be saved first. Successful Food Video writes invalidate public Food cache. No provider-specific uploader or alternate player was added.

## Gallery Integration

Food reuses the existing **ordered** Content Image Collection Manager, also used by Story, with no hero callback. Food nevertheless writes the generic Food field `image_collection_ids`; it does not copy Story's backend relationship or hero semantics.

Attach/remove/Up/Down modify the local ordered array. They persist only with parent Food Save. Selected collection details and previews are hydrated when missing from the current page; unresolved IDs remain visible. The shared ordered and generic gallery pickers both expose explicit pagination and loading/error/retry states.

Existing collection authoring/upload remains separate. Public Food reuses embedded collection previews, lazy full-collection loading, the existing media section and image lightbox. Collection order follows the Food response; gallery fetch failures are visible/retryable.

List/card previews share [collectionPreview and imagePreviewUrl](../../src/features/management/imageCollectionUtils.js). They prefer `preview_image.thumbnail_url`, falling back to `preview_image.url`, without fetching collection details or constructing CDN URLs. Management gallery cards retain their title/count, layout, `object-fit: cover`, and existing "No preview" placeholder for empty collections. Food cards (list, Country and related Food), related Place/Route cards and public Story collection previews use the same URL resolver; public gallery media cards already use `collectionPreview`. Regression tests cover list-response preservation, thumbnail/full-size selection, null previews and request-free card rendering.

## Public Food API

The public adapter uses only:

- `getPublicFoods(options)` -> GET `/api/offward/food/`.
- `getPublicFoodBySlug(slug)` -> GET `/api/offward/food/<encoded-slug>/`.

Only `page`, `page_size`, `country` and `food_type` are sent as list parameters. List responses must be `{count,next,previous,results}` with an array of results; malformed responses fail explicitly. Detail 404 returns the not-found state; other failures remain errors.

Management list/detail/create/update/delete reuse the existing registered CRUD helper with plural `foods` and UUID details. Public pages never call management endpoints.

## Public Food List

`/food` uses the existing AppShell, navigation and launch-gate structure. The first request uses page 1 and page size 12.

Country and Food type filters reset results/page. Load more appends deduplicated real records, preserves loaded records on errors and offers retry. Country options also expose explicit subsequent-page loading.

Cards render real preview media when present, type, title, summary, Country and available date metadata. They link only through supplied slugs; no UUID is guessed to be a slug and no dummy card content was shipped.

## Public Food Detail

`/food/:slug` uses one adaptable detail template for all seven Food types. Title, type, Country, summary, body, metadata, ingredients and steps render when present, not through seven separate page implementations.

Recipe metadata remains meaningful on non-recipe Food; ingredient quantity stays text and row order is respected. Empty sections are omitted. Loading, 404 and retryable failures are distinct.

Media reuses the existing Entity Media Section, Video Player and Image Lightbox. Full galleries load on explicit viewing and are cached; no duplicate Food gallery/player system was created.

Food's related Places/Routes use existing Story-related visual card classes with real previews/metadata; related Stories retain existing presentation conventions. Child links require verified parent Route context.

## Related Food Integration

Related Food remains mounted on Place, Route, Story, Waypoint and Segment detail pages and uses each record's own shallow `food_ids`. Country detail instead lists Foods returned by the canonical Country filter; it does not require or create Country `food_ids`.

A shared UUID-to-public-Food cache is seeded by list/detail results. Missing IDs trigger at most one initial unfiltered page; further discovery requires explicit next-page actions. Concurrent requests deduplicate. Unpublished, missing or still-unresolved IDs have visible partial-resolution messaging instead of fabricated links.

Successful local Food create/update/delete and immediate Video writes invalidate this cache. Generation guards prevent an older pending response from repopulating invalidated records. No route-map overlay or Explore redesign was introduced.

## Pagination / Catalog Handling

Management page helpers and the shared catalog hook preserve compatibility with existing array-returning helpers, while exposing envelope metadata for new callers. Complete bare arrays are accepted for established APIs that return arrays.

Explicit Load more is used for management entity/gallery lists, relationship/media catalogs, public Food list, public Country filters and public Place/Route relationship lookup. No picker silently assumes page one contains every record. Management selected-ID hydration avoids making users load every page to retain an existing relationship.

Public Food next cursors must advance. Filtered pages cache independently and seed related-ID resolution. Failed pages remain retryable; loaded data is retained. No public helper automatically exhausts all pages.

Public related Story lookup still uses the existing first-response-only helper. This limitation is stated in the UI. Waypoint/Segment public context checks inspect at most **four loaded public Routes per explicit action**, cache details and require real parent slugs before producing links.

## Error / Loading Behavior

- Initial Food edit failures block the form; retries do not save blank replacements.
- Food serialization/validation preserves explicit nullable metadata and list clear/replace/omit semantics.
- Nested recipe API errors retain row/field identity.
- Shared catalogs separate initial loading, subsequent loading, catalog errors and unresolved selected detail errors.
- Immediate Video writes disable conflicting operations and parent Save; errors are visible.
- Public list/detail failures, not found, partial relationships and gallery failures have explicit presentation.
- Public data failures are not converted into success-shaped empty Food responses.

## Responsive Behavior

Food inherits the existing management/public layouts, typography and responsive navigation. Scoped red accents do not recolor other entities. Public grids collapse at smaller widths; filters/metadata/actions wrap. Management recipe rows use minimum-width guards and compact mobile padding; relationship option lists remain scrollable.

Native controls, explicit labels, accessible row action names, disabled boundary/busy controls and visible focus outlines are present. Server-rendered assertions check important labels and controls, but browser interactions, keyboard focus, lightbox behavior and mobile visual layout were **not browser-validated** because browser access was denied.

## Remaining Limitations

1. No live backend or real mutation/upload validation was performed. The supplied contract and mocked requests were tested; this is not production API certification.
2. Browser-based responsive/interactive checks were not performed. The server-rendered tests are not a substitute.
3. Related public Stories remain first-response-only; the existing helper discards pagination metadata. Their bounded limitation is visible.
4. Arbitrary shallow public UUIDs require explicit catalog-page discovery because no bulk-ID endpoint was available. Unpublished/missing relationships cannot be resolved into public links.
5. Public Waypoint/Segment parent discovery is intentionally bounded and manual. Management child labels require browsing their owning Route when not already known.
6. Picker search filters loaded records locally, not every server page. Users must explicitly load additional catalog pages.
7. Public caches are session-local, not realtime subscriptions. Local Food writes invalidate Food records; external edits require a fresh application session/reload.
8. Full repository lint remains blocked by three pre-existing `react-hooks/set-state-in-effect` violations in [PlacePage.jsx](../../src/pages/PlacePage.jsx) (lines 72 and 88) and [SegmentDetailPage.jsx](../../src/pages/SegmentDetailPage.jsx) (line 57). The corresponding effects exist in HEAD and were not changed by this implementation.
9. Production build reports the existing large-chunk class of warning: the main JavaScript chunk is approximately 788 KB minified. No unrelated bundling redesign was made.

### Verification

- `node --test src\features\food\foodForm.test.js src\features\food\publicFood.test.js src\features\management\managementIntegration.test.js`: **32 passed, 0 failed** after the relationship-direction correction.
- `npm run build`: **passed** after the final implementation changes.
- Focused ESLint on Food, shared management/media code, helpers, registrations and clean changed public pages: **passed**.
- Place/Segment lint with only the known pre-existing rule disabled: **passed**; their changes are just Related Food imports/mounts.
- `git diff --check`: **passed**.
- Editor diagnostics for new Food pages/helpers and tested integration file: **no errors reported**.

Tests cover specified enums, omitted versus empty list writes, integer null clears, one-based recipe order, textual quantities, detail hydration, nested errors, management UUID/plural paths, public singular/encoded-slug paths and allowed filters, 404 versus other failures, strict list contracts, Country pagination compatibility, cache concurrency/retry/invalidation, explicit bounded discovery, unresolved relationships, media/hero distinctions, disabled/accessibly labeled controls and real public Food card links.
