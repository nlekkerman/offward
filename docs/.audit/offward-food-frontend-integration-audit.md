# Offward Food Frontend Integration Audit

Audit date: 2026-10-08. Scope: current frontend source, management and public UI, API helpers, and locally available documentation. This audit creates documentation only; it does not implement Food or modify existing application behavior.

## Evidence and Contract Boundaries

The entire `src/` file inventory was inspected and source searches covered management routing, entity configuration, media attachments, selectors, relationship fields, pagination, and public consumers. The active implementations below were read directly, including route-map payload builders and gallery authoring. There are no Food references, Food pages, Food helpers, or `food_ids` consumers in the current frontend.

The requested backend sources are **not present in this checkout**:

- `docs/.audit/offward-food-backend-design.md`
- `docs/.audit/offward-food-backend-implementation.md`

No Food implementation was found in the repository. The user explicitly approved completing this audit with contract gaps marked. No authenticated backend requests or mutations were made. Consequently:

- The Food endpoint paths, supported capabilities, core/recipe field names, and shallow owner `food_ids` described in the request are supplied requirements, not independently verified serializer evidence.
- Food relationship write-field names, public media shape, collection ordering, enum choices, optional-field clearing, and nested recipe replacement semantics remain contract gates.
- Existing frontend request fields are proven by source. They do **not** automatically prove that Food accepts identical fields.
- Current source takes precedence over historical frontend audits. For example, the earlier [Story gallery create audit](./OFFWARD_STORY_IMAGE_COLLECTION_CREATE_AUDIT.md) describes an inline gallery creator that no longer exists in the current Story manager. Current gallery creation/editing uses dedicated management pages.

### Principal Findings

1. Food can be integrated into the existing entity list/form architecture, not a separate management application.
2. There is a reusable video manager, but it is **immediate-persistence and saved-owner-only**, not a deferred form field.
3. There are **two** established gallery attachment UIs: generic Route/Place/Waypoint attachments and the separate Story ordered-gallery/hero-image manager.
4. Story's backend image relationship difference is not represented by frontend join-model APIs. The backend translates `image_collection_ids`; however, Story still has separate frontend presentation/state logic.
5. Management catalogs discard pagination metadata. Local search does not make later pages accessible.
6. There is no active generic Waypoint or Segment relationship picker, and no active saved-Segment media editor. Route candidate-section controls are not a Segment CRUD UI.
7. Public cards are mostly entity-specific. Media presentation is reusable; Story cards cannot be passed Food records unchanged.
8. Shallow `food_ids` are not enough to link to slug-based Food details without a complete, public-only ID-to-slug resolution strategy.

## Existing Management Architecture

### Routing, Access, and Layout

- [Management router](../../src/app/manageRouter.jsx): guarded `/manage` dashboard and `/manage/<resource>`, `/new`, `/:id/edit` for Countries, Places, Routes, Stories, Videos, Tours, Events, and Partners. Galleries and contact messages use dedicated pages. The route map is `/manage/routes/:routeId/map`.
- [ManagementGuard](../../src/pages/manage/ManagementGuard.jsx): checks Offward access on pathname changes, displays session loading, then redirects unauthorized access to login. Food should be registered inside this existing guard.
- [ManageLayout](../../src/pages/manage/ManageLayout.jsx): management shell, `Outlet`, logout context; it does not contain an entity sidebar.
- [ManageDashboardPage](../../src/pages/manage/ManageDashboardPage.jsx): explicit card array for entry links. A Food dashboard card will need registering.
- [Entity configuration](../../src/features/management/entityConfig.js): per-resource label, singular name, list columns, default form values, slug utility, and relationship-catalog mapping. Waypoints/Segments are not configured resources. An unknown key falls back to Country configuration; Food must be registered explicitly.
- [EntityListPage](../../src/features/management/EntityListPage.jsx): shared table, create/edit links, confirmed delete, reload after delete, loading/error/empty states, and a separate country lookup for labels/flags. It has no pagination controls.
- [EntityFormPage](../../src/features/management/EntityFormPage.jsx): shared page/form shell and a resource-specific field switch. Configuration alone does not generate fields.
- [Management API registry](../../src/services/management/index.js) binds resources to [createManagementEntityApi](../../src/services/management/entityApi.js).

### Form State and Save Architecture

The generic form uses React `useState`: `formData`, `relationshipOptions`, `loading`, `submitting`, top-level `error`, `fieldErrors`, and `slugLocked`. It has additional Video-specific upload/location/context state. There is no form library, shared save hook, generic dirty/change hook, standalone shared text/select field component, or generic ordered-row editor. `src/shared/hooks` contains no implementation.

Initialization copies only keys in the entity's configured defaults. Country resolves a nested object, scalar `country`, or `country_id` to a scalar ID. Story normalizes its Place/Route/Event relationship arrays; Route adapts ordered `places`. A Food form must explicitly hydrate all supported fields and normalize their actual response representations.

On create, changing title/name generates a slug until the slug input is manually edited. Existing slugs are locked against automatic regeneration. This is a reusable convention, not a guarantee about backend slug generation.

Options load before edit detail in the generic form. Each option request failure is caught and converted to an empty array without a visible option error. A detail/load failure is shown as a page error; the form can still render after loading finishes. Food should distinguish "no records" from "options unavailable."

Save:

1. Build a payload from the configured form state.
2. Strip `published_at` wherever present; the current frontend treats first publication as backend-owned.
3. Apply resource-specific conversions and cleanup.
4. POST on create or PATCH on edit.
5. Navigate back to the entity list on success.
6. Show an error and basic field errors on failure; reset `submitting` in `finally`.

Only the submit button is generally disabled during saving; ordinary fields and some attachments are not uniformly disabled. Cancellation returns to the list and does not undo already-persisted videos or gallery edits.

### API and HTTP Semantics

[apiClient](../../src/services/apiClient.js) is the shared Axios instance using configured API origin, cookies, and CSRF for POST/PUT/PATCH/DELETE. Food should use it unchanged.

[createManagementEntityApi](../../src/services/management/entityApi.js) exposes:

| Helper | Method | Shape/behavior |
| --- | --- | --- |
| `list()` | GET collection | Returns bare array or `data.results`; discards count/next/previous; unexpected shape becomes `[]`. |
| `getById(id)` | GET UUID detail | Returns response data. |
| `create(payload)` | POST collection | Returns response data; errors propagate. |
| `update(id, payload)` | PATCH UUID detail | Not PUT; sends caller's payload. |
| `remove(id)` | DELETE UUID detail | Errors propagate. |

Generic edit is a PATCH containing the whole configured writable form snapshot, not a minimal diff. The media manager sends a narrower PATCH. Explicit empty ID arrays are retained to express removal of all attachments. Actual atomic relationship replacement for Food must be verified in its backend contract.

The generic blank/null cleanup is **not safe to inherit blindly**: most empty or null values are deleted, except a small set of text/Country keys. A PATCH that omits a field cannot explicitly clear it. Food's nullable times/servings and nested arrays need field-aware serialization. Story also sets `hero_image_id` to null before generic cleanup subsequently removes it, so the current code does not reliably send an explicit hero reset. This is a relevant warning about reusing payload cleanup, not a code change made by this audit.

### Entity Inventory

| Entity | List | Create/edit | API | Relationships/media/save summary |
| --- | --- | --- | --- | --- |
| Stories | `/manage/stories`, shared list | `/manage/stories/new`, `/:id/edit`, shared form Story branch | `managementApis.stories` | Country select; searchable Place/Route/Event managers; immediate videos on edit; deferred ordered collections/hero; POST/PATCH on Save. |
| Routes | `/manage/routes`, shared list | `/manage/routes/new`, `/:id/edit`; separate `/:routeId/map` | `managementApis.routes`, `routeMapApi` | Country; ordered Place stops; immediate videos; deferred generic galleries; subordinate Waypoints and candidate geometry in map editor. |
| Places | `/manage/places`, shared list | `/manage/places/new`, `/:id/edit`, shared form Place branch | `managementApis.places` | Country; coordinates/map picker; immediate videos; deferred generic galleries. No management Story/Route picker on Place. |
| Waypoints | No standalone list | Embedded Route map list, quick editor, advanced editor | Route-scoped `routeMapApi` | Place selects; geometry/order fields; saved-only videos/galleries; full Waypoint PUT, not own PATCH detail. |
| Segments | No standalone list | Active candidate-section list/manual geometry controls; no saved-Segment CRUD form | Route-scoped Segment GET/PUT helpers exist | Payload supports Story/media/collection IDs, but current UI does not expose saved-Segment relationship/media attachment. |
| Videos | `/manage/videos`, shared list | `/manage/videos/new`, `/:id/edit`, shared form Video branch | `managementApis.videos`, `videoUploadApi` | Cloudflare upload on create; editable metadata/location; relationship context read-only; POST/PATCH on Save. |
| Image collections | `/manage/galleries`, dedicated list | `/manage/galleries/new`, `/:id/edit`, dedicated pages | management `imageCollectionsApi` | Metadata POST/PATCH; image upload POST; full membership PUT; separate authoring from owner attachments. |

## Existing Video Attachment Flow

### Shared Component and State

[ContentVideoManager](../../src/features/video/ContentVideoManager.jsx) is the established Upload new / Choose existing attachment UI. Props include `resourceKey`, `resourceId`, `attachedVideoIds`, `onAttachmentsChange`, and route/child IDs for subordinate owners.

Owner form state is normally `video_ids: string[]`; Waypoint/Segment state is `media_ids: string[]`. The manager normalizes IDs to deduplicated strings. These are Offward Video UUIDs, **not Cloudflare `provider_id` values**. A catalog record adapts `id`/`video_id`, title, status, thumbnail/playback URLs.

The manager loads GET `/api/offward/manage/videos/` once on mount. It accepts an array or `results` only. Search filters the loaded catalog by title/status; there is no server search, next-page access, or hydration of selected IDs absent from that catalog.

### Owner Wiring and Persistence

| Owner | Current mount | Write field | Endpoint/operation | Timing |
| --- | --- | --- | --- | --- |
| Route | Route branch of shared form; Route map Videos panel | `video_ids` | PATCH `/manage/routes/<uuid>/` | Immediate on attach/detach. Parent form callback synchronizes local state; later Save includes those IDs again. |
| Place | Place branch of shared form | `video_ids` | PATCH `/manage/places/<uuid>/` | Immediate. |
| Story | Story branch of shared form | `video_ids` | PATCH `/manage/stories/<uuid>/` | Immediate. Public Story currently reads `media_ids` instead. |
| Tour | Tour branch of shared form | `video_ids` | PATCH `/manage/tours/<uuid>/` | Immediate. Also has legacy `videos` checkbox state. |
| Event | Event branch of shared form | `video_ids` | PATCH `/manage/events/<uuid>/` | Immediate. Also has legacy `videos` checkbox state. |
| Waypoint | Saved Waypoint media panel in [WaypointList](../../src/features/routes/routeMap/components/WaypointList.jsx) | `media_ids` | GET all route Waypoints, replace matching child's array, PUT full Waypoint collection | Immediate. Callback synchronizes local IDs and saved-signature media field. |
| Segment | Supported code path **without a current UI consumer** | `media_ids` | GET all route Segments, replace matching child's array, PUT full Segment collection | Immediate if invoked; currently not mounted. |
| Country / Partner | No mount | None | None | No attachment UI. |

Attach appends an ID if absent; detach filters it out. The manager sends the entire next relation array, including `[]` when removing all. It does not delete Video records. There is no video reorder UI.

Standard owner writes need a saved ID. The manager returns no UI when `resourceId` is absent, except for its Segment branch. Therefore Route/Place/Story/Food create cannot attach videos using this component as a deferred field. The existing sequence is create the owner, then edit it to add videos. Do not redesign this into a second upload system for Food.

### Upload and Preview

Upload path:

1. Validate extension `.mp4`, `.mov`, or `.m4v`.
2. [videoUploadApi](../../src/services/management/videoUploadApi.js) POSTs `/api/offward/manage/videos/direct-upload/` with `original_filename`, `mime_type`, `file_size_bytes`, `max_duration_seconds`.
3. Upload to the returned URL with TUS PATCH, progress and abort handling.
4. POST `/api/offward/manage/videos/` with `title`, generated `slug`, `provider`, `provider_id`, `status`.
5. Attach the **returned Offward UUID** using the owner flow above.

The created Video exists even if attachment fails. The manager distinguishes a created-record/attachment failure and stores a retry ID, but does not append/refetch the newly created record into `allVideos`. Thus even a successful new attachment can be absent from cards until remount, and the retry message can direct users to an existing catalog that lacks the new record. Food should not introduce a separate manager to work around this; any required improvement belongs in the shared manager.

Existing attached cards are filtered from the loaded catalog, not hydrated by UUID. Missing catalog entries are silently invisible. Catalog load error is explicit; attach errors are displayed. Existing attach catches the propagated error; detach calls an async handler without a surrounding UI catch, while the shared update function displays and rethrows the error.

Preview uses [VideoPlayer](../../src/features/video/VideoPlayer.jsx): poster/button before activation, lazy iframe, loading state, no playback URL -> "Video unavailable." It consumes presentation URLs only. Inline attachment preview does not invent provider URLs.

### Can Food Reuse It?

**Yes on a saved Food, conditionally on verified `video_ids` write semantics.** Pass `resourceKey="foods"` and `resourceId=<Food UUID>`: the resource path fallback produces `/manage/foods/<uuid>/`, and any non-child owner uses `video_ids`. Passing singular `"food"` unchanged would incorrectly PATCH `/manage/food/<uuid>/`; unlike Route/Story/etc., Food has no explicit singular-to-plural mapping.

No Food-only video picker/uploader/player is needed. Optional extension: add explicit Food aliases for consistency. Required before declaring complete catalog coverage: preserve pagination/load additional pages and hydrate selected records. Tell users that attachment changes save immediately and are not reversed by Cancel.

## Existing Image Collection Attachment Flow

### Generic Attachments

[GalleryAttachmentManager](../../src/features/management/GalleryAttachmentManager.jsx) takes `ownerType`, `ownerId`, `attachedCollectionIds`, `onAttach`, `onDetach`, optional `onPreview`, `disabled`, and `persistImmediately`.

Important: `ownerType`/`ownerId` are used for the accessibility label; this component **does not construct owner endpoints or send content-type IDs**. Persistence is entirely delegated to callbacks. It is suitable for generic Food attachments without knowing the backend join model.

State:

- Owner holds `image_collection_ids: UUID[]`.
- Manager holds one management collection catalog, loading/error, picker-open state, immediate persistence status/error, preview collection, and preview index.
- IDs are string-normalized. Attached cards are selected catalog entries in owner ID order.

Behavior:

- "+ Add gallery" opens a grid of existing collections; no search, pagination, or inline authoring.
- Card click attaches an unselected collection; selected cards cannot be attached twice.
- Remove calls detach; it does not delete the collection or any image.
- **No reorder control exists in this manager.**
- With default `persistImmediately=false`, callbacks update parent state only.
- With `persistImmediately=true`, it awaits the callback, displays Saving/Saved or a persistence error, and blocks concurrent attachment actions.
- Preview GETs collection detail through the management API then opens [ImageLightbox](../../src/shared/components/ImageLightbox.jsx). On detail failure it silently falls back to the list record; a shallow record may yield no usable full preview.
- Missing selected collections outside the loaded catalog are filtered out entirely; the apparent empty state is not evidence that owner IDs are empty.

### Exact Owner Flows

| Owner | Component | State/write field | Attach/detach | Reorder | Persistence |
| --- | --- | --- | --- | --- | --- |
| Route | Generic gallery manager in shared form | `formData.image_collection_ids` | Append `collection.id`; remove string-matched ID | None | On parent Create/Save via POST/PATCH. No immediate owner request. |
| Place | Same | `formData.image_collection_ids` | Same | None | On parent Create/Save via POST/PATCH. |
| Waypoint | Generic gallery manager in saved Waypoint media panel | `waypoint.image_collection_ids` | Route-map callback builds next Waypoint collection, changes matching child's IDs | No gallery reorder; Waypoint order is separate | Immediate full PUT `/manage/routes/<uuid>/waypoints/`, then route refresh and local normalized state. |
| Segment | **No current gallery manager mount** | Normalizer/payload builder supports `image_collection_ids` | No active attach/detach UI | None | PUT Segment helper can write field, but no active user flow. |
| Story | **ContentImageCollectionManager**, not generic manager | `formData.image_collection_ids`, `hero_image_id` | Toggle catalog card or Detach attached row | Up/Down | Deferred parent Create/Save via POST/PATCH. |

Waypoint gallery callbacks submit the **current in-memory whole Waypoint list**, not just the selected child's attachment. This can also save pending waypoint edits/reorder/remove/add changes and update the saved signature. In contrast, Waypoint video changes fetch the persisted list before PUT, preserving local non-media changes only in the parent callback. This distinction matters when describing "immediate media save."

### Story Exception

[ContentImageCollectionManager](../../src/features/management/ContentImageCollectionManager.jsx) is currently consumed only by Story:

- Always renders a gallery grid and a separate ordered attachment list.
- Supports Up/Down and Detach through `onAttachmentsChange(nextIds)`.
- Fetches each attached gallery detail to obtain images for hero selection.
- Optional `onHeroImageChange` exposes an automatic/null choice and individual hero image choices.
- Parent holds `hero_image_id`; collection operations are local until parent Save.
- There is a "Manage galleries" link, not the old inline collection creator.
- Per-gallery detail failures are converted to null and dropped; hero-image loading failures are not displayed.
- Attached row IDs not found in the catalog still have a fallback "Gallery N" row, unlike the generic manager.

**Backend difference:** the request establishes Story has a different image relationship from the generic owners. Frontend does not call a Story join-model API; Story and generic owners all submit `image_collection_ids` to their owner serializer. Thus backend mechanics are abstracted by the owner API, **not by a single common attachment UI**. Story has its own component, order controls, hero state, payload handling, and public full-gallery rendering. The exact Story join-model name, uniqueness rules, and backend order behavior cannot be independently established here.

Food should default to the generic manager because it requires collections, not a Story hero. If the verified Food backend requires ordered collection attachments, reuse the existing Story manager without hero callbacks or extend the generic manager with optional ordering. Do not assume order is persisted just because arrays preserve order.

### Collection Authoring Is Separate

- [GalleryListPage](../../src/pages/manage/galleries/GalleryListPage.jsx): grid with cover/count/created date/edit, loading/error/empty; first response only, no delete button.
- [GalleryCreatePage](../../src/pages/manage/galleries/GalleryCreatePage.jsx): local title/description; trims/requires title; POST metadata; navigate to new collection edit page.
- [GalleryEditPage](../../src/pages/manage/galleries/GalleryEditPage.jsx): local collection, title, description, images, status/error/notice. PATCH metadata via Save details.
- [Management image API](../../src/services/management/imageCollectionsApi.js): GET/POST collection, GET/PATCH/DELETE detail, image upload POST `/manage/images/`, and PUT `/<uuid>/images/`.
- [Image utilities](../../src/features/management/imageCollectionUtils.js): thumbnail/count/ID/URL/error helpers and canonical membership payload.

Image upload validates JPEG/PNG/WebP <= 10 MiB, uploads each asset separately, reports individual failures, then replaces collection membership. Membership payload is `{ images: [{ image_asset_id, order, caption }] }`; order is zero-based in this **existing image-membership** helper. Do not infer Food recipe order is also zero-based.

Image Up/Down and Remove persist membership immediately with PUT. Caption changes persist on blur, not metadata Save. Metadata PATCH and owner attachment PATCH are distinct operations. Moving/removing images updates local state before a failed request, so a failed write can leave unsaved-looking state. Food can keep using existing Gallery management; it needs no image upload/editor duplicate.

## Existing Relationship Picker Architecture

### Catalog Loading and Selection

There is no universal remote entity picker. There is a reusable **controlled local picker** plus native form selects/checkboxes.

[RelationshipAttachmentManager](../../src/features/management/RelationshipAttachmentManager.jsx):

- Props supply `availableItems`, `attachedIds`, label/ID/secondary-label functions, attach/detach callbacks, and disabled state.
- Current consumers: Story Places, Routes, Events in the shared form.
- Renders attached rows plus a toggled searchable add list.
- Search is case-insensitive label substring search over the supplied array only.
- Already attached records are excluded from add results.
- Uses string ID comparison; retains unresolved attached IDs as UUID fallback rows, allowing removal without inventing titles.
- Does not fetch, paginate, save, reorder, display loading/error, or perform server search.

| Related entity | Existing UI / consumers | Data source | Pagination/search | Suitability for Food |
| --- | --- | --- | --- | --- |
| Country | Shared form native single select for Place/Route/Story/Tour/Event | Direct GET management Countries in form loader | One response; `results` only if paginated; no search | Reuse single-ID/select pattern, but load complete options or support paging. Confirm Food's write key and Country nullability. |
| Places | Story attachment manager; Route ordered-stop select; Tour/Event checkboxes; Video location; Waypoint linked Place and quick-add selects | Management Places; map editor uses generic `.list()` | First response only; only Story has local search | Reuse relationship manager for Food multi-attach; do not use Route stop objects. |
| Routes | Story attachment manager; Tour/Event checkboxes; Video location Route select | Management Routes | First response only; Story local search | Reuse relationship manager with Food route UUIDs, after catalog fix. |
| Stories | No active management Story selector | Management Story list helper exists but is not an option loader branch | Helper loses pagination; no active picker/search | Reuse controlled relationship manager with a new complete management Stories data source. |
| Waypoints | No generic relationship picker; route editor displays/edits its own Waypoints | GET management Route Waypoints | Route-scoped collection, not a cross-route catalog; no remote search | Use existing relationship manager, adding route-scoped option loading and route-aware labels. No existing drop-in loader. |
| Segments | Video location Segment native select after choosing Route; candidate-section controls are not attachment pickers | `routeMapApi.getSegments(routeId)` | Expects bare array; scoped to one route; no search | Reuse helper + controlled relationship manager; add route context and labels. No active multi-attach implementation. |
| Videos | Content video manager; legacy Tour/Event checkboxes | Management Videos | First response; local title/status search in manager | Reuse manager with immediate saved-owner semantics; resolve catalog gaps. |
| Image collections | Both gallery managers | Management collection `.list()` | First response; no search | Reuse managers; resolve catalog/selected-record gaps. |

Country public data in list/public UI is for labels/flags, not a management picker source. Management should continue using management endpoints so draft/unpublished selectable entities are not silently excluded.

### Child Relationships Are Route-Scoped

[routeMapApi](../../src/services/management/routeMapApi.js) exposes route Waypoint and Segment collections. There is no management standalone Waypoint/Segment collection helper or route-independent picker in this checkout.

Food needs a **browse Route context** to load child options. That browse selection must not silently attach the Route or require it already be a Food relationship unless the backend explicitly requires that dependency. A Food may relate to multiple children across multiple routes; maintain selected UUIDs and metadata across context switches. Show Route title plus child order/name or Segment endpoints to disambiguate. Never expose `new-*` draft IDs as persisted options.

Unresolved selections should stay visible by UUID while their labels hydrate. Switching the browse Route must not clear Food `waypoint_ids`/`segment_ids`. The Video location form clears its single Segment when its Route changes because it edits one capture location; that behavior is **not** suitable for Food multi-relationships.

## Story Management Pattern

Source: [EntityFormPage](../../src/features/management/EntityFormPage.jsx), [configuration](../../src/features/management/entityConfig.js), [shared list](../../src/features/management/EntityListPage.jsx), [API registry](../../src/services/management/index.js).

- **List:** title, Country, published date, status; shared edit/delete/create.
- **Create/edit:** Country, title, slug, excerpt, body, read-only publication time, status.
- **State:** configured scalar fields and `place_ids`, `route_ids`, `event_ids`, `video_ids`, `image_collection_ids`, nullable `hero_image_id`. Place/Route/Event input arrays normalize bare IDs or objects to IDs.
- **Relationships:** three reusable controlled attachment managers, management catalogs, deferred until Save. No Story Waypoint/Segment picker.
- **Videos:** shared immediate manager, edit only.
- **Images:** Story-specific ordered manager with optional hero selection; deferred.
- **Save/update:** POST/PATCH form snapshot; read-only `published_at` omitted, explicit empty relationship arrays retained. Null hero cleanup issue described above.
- **Loading/errors:** shared form loading and field error UI; option failures silently empty; gallery catalog errors displayed but attached detail failures hidden.
- **Reusable pieces:** form shell/pattern, relationship manager, video manager, image/lightbox utilities and Country identity.

Food should follow Story's title/slug/body and compact multi-relationship UX, but use `summary`, not Story's `excerpt`; no hero field or Event relation is implied by the Food requirements.

## Route Management Pattern

Source: [generic Route form](../../src/features/management/EntityFormPage.jsx), [RouteMapEditorPage](../../src/pages/manage/routes/RouteMapEditorPage.jsx), [routeMapApi](../../src/services/management/routeMapApi.js).

- **List:** title, Country, activity, status.
- **Create/edit:** Country/title/slug/summary/activity/status/path and ordered Place stops.
- **State:** Route `places` is `[{ place_id, position }]`, not `place_ids`.
- **Stop operations:** add blank row; select management Place; editable position; Up/Down and Remove renumber local positions. They persist only on Route Save.
- **Save:** POST/PATCH Route snapshot; filters blank stops, coerces positions, attempts JSON parse for path. This is not Food relationship serialization.
- **Media:** immediate Video manager; deferred generic gallery manager; no gallery order controls.
- **Map editing:** saved Route ID required; independently loads Route, Waypoints, management Places; tracks normalized Waypoints, saved payload signature, map revision, accepted geometry, candidate, GPX/manual state.
- **Errors/loading:** explicit load/action errors and operation flags; candidate/geometry validation; stale acceptance can refresh Route data.
- **Reusable pieces:** title/slug/Country form pattern and shared media UI. Route geometry and stop structures are not Food recipe semantics.

The route-map helpers use PUT for subordinate collections and POST for candidate calculation/geometry acceptance. Food relationship editing should PATCH the Food, **not replace a Route's child collection**.

## Place Management Pattern

Source: [generic Place form](../../src/features/management/EntityFormPage.jsx), [configuration](../../src/features/management/entityConfig.js).

- **List:** name, Country, status, visited date.
- **Create/edit:** Country/name/slug/summary/body, coordinate picker, numeric latitude/longitude, visited date, status.
- **State/save:** configured `formData`; coordinates validate ranges and convert to numbers; blank visited date and some blank Country handling omit fields. POST/PATCH on Save.
- **Relationships:** Country only; no editable Story/Route relationship selector.
- **Media:** immediate videos on saved Place; deferred generic collection attachments on create/edit.
- **Loading/errors:** shared loading/top-level/field-error behavior; option-loader caveat applies.
- **Reuse:** summary/body field styling, media managers, Country select/flag; Food does not need coordinate controls.

## Waypoint / Segment Pattern

### Waypoints

Sources: [RouteMapEditorPage](../../src/pages/manage/routes/RouteMapEditorPage.jsx), [WaypointList](../../src/features/routes/routeMap/components/WaypointList.jsx), [WaypointEditor](../../src/features/routes/routeMap/components/WaypointEditor.jsx), [WaypointQuickEditor](../../src/features/routes/routeMap/components/WaypointQuickEditor.jsx), [routeMapUtils](../../src/features/routes/routeMap/routeMapUtils.js).

- No standalone list/create/edit page. Embedded Route order list supports blank, map-click, or Place-based creation.
- Local draft IDs start with `new-`; payload omits those IDs so the backend creates records.
- Normalized state includes persisted ID, order/type/name/label, linked Place, coordinate strings, `media_ids`, `image_collection_ids`.
- Route-specific list Up/Down renumbers and keeps start/finish rules. This is domain-specific reorder logic, not an ingredient editor.
- Quick name Save and advanced Save both validate and PUT the whole route Waypoint list. General save does the same.
- Payload: `{ waypoints: [{ id?, order, type, coordinates: { lat, lng }, name, label, place_id, media_ids, image_collection_ids }] }`.
- `place_id` clearing is explicit null; media and gallery arrays are always included so unrelated child edits preserve attachments.
- New Waypoints show "Save waypoint before adding media." Saved media panel uses existing video/gallery managers with the different immediate flows already described.
- Saved-signature tracking and candidate calculation/acceptance gating are specific to map authoring. They should not be imported wholesale into Food.
- Load/save/validation errors are visible; temporary IDs and full-collection write semantics make this unsuitable as a direct Food child editor.

### Segments

Sources: [SegmentList](../../src/features/routes/routeMap/components/SegmentList.jsx), [SegmentEditor](../../src/features/routes/routeMap/components/SegmentEditor.jsx), [SegmentActions](../../src/features/routes/routeMap/components/SegmentActions.jsx), [routeMapUtils](../../src/features/routes/routeMap/routeMapUtils.js), [routeMapApi](../../src/services/management/routeMapApi.js).

- Active SegmentList displays **consecutive saved-Waypoint candidate pairs**, not persisted Segment records.
- Manual drawing changes local candidate geometry; accepting the candidate persists Route geometry. It is not a Segment metadata/media form.
- SegmentEditor and SegmentActions exist but have no current source consumer.
- Segment GET/PUT helpers and normalizers exist. GET/PUT require bare arrays in responses; malformed response throws.
- Normalized persisted Segment state supports ID/order/title/summary/geometry/boundary IDs/review flag/`story_ids`/`media_ids`/`image_collection_ids`.
- PUT builder submits `{ segments: [...] }`, assigns one-based order, omits new draft IDs, and includes those relationship arrays.
- There is **no active management Story picker, video manager mount, or collection attachment manager for saved Segments**. The video manager's Segment persistence branch is capability, not current UX.

Food should relate to persisted Segment UUIDs using GET options. Candidate pair keys such as `<waypoint UUID>:<waypoint UUID>` are not Segment UUIDs and must never be submitted as Food `segment_ids`.

## Reusable Components Food Can Use

Paths are links to current source. "Unchanged" means the component can remain unchanged with correct props/data; it does not mean its current data-loading limitations can be ignored.

| Component/pattern path | Purpose | Current consumers | Food unchanged? | Required extension / integration |
| --- | --- | --- | --- | --- |
| [EntityListPage](../../src/features/management/EntityListPage.jsx) | Table CRUD entry, loading/error/delete | Countries/Places/Routes/Stories/Videos/Tours/Events/Partners | Presentation yes | Register Food config/API/routes; pagination wiring needed if list is paginated. |
| [EntityFormPage](../../src/features/management/EntityFormPage.jsx) | Form shell, local state, slug/save/errors; internal field renderer | Same generic entities | No: add Food branch | Food defaults/hydration, enum choices, nested serialization/errors; retain same UX. Internal `renderField` is not an exported field component. |
| [RelationshipAttachmentManager](../../src/features/management/RelationshipAttachmentManager.jsx) | Attached rows, local search, add/remove | Story Place/Route/Event relationships | Yes as controlled presentation | Load complete/paged options, hydrate labels, render loading/error outside or add optional props; child Route context wrapper. |
| [ContentVideoManager](../../src/features/video/ContentVideoManager.jsx) | Existing/video upload and immediate attachment | Route/Place/Story/Tour/Event; Route map and Waypoints | Yes for saved Food with `"foods"` and verified write field | Shared catalog pagination/selected hydration; new-upload catalog refresh. Deferred create mode would require a shared extension, not a Food duplicate. |
| [GalleryAttachmentManager](../../src/features/management/GalleryAttachmentManager.jsx) | Generic gallery pick/preview/attach/remove | Route/Place; saved Waypoints | Yes for generic deferred Food collections | Complete catalog/selected hydration; optional order only if Food contract requires it. |
| [ContentImageCollectionManager](../../src/features/management/ContentImageCollectionManager.jsx) | Ordered gallery selection, optional hero | Story | Yes without hero callback if ordered Food galleries are confirmed | Catalog completeness and explicit detail errors; no invented Food hero support. Alternative to generic manager, not simultaneous duplicate controls. |
| [Gallery pages](../../src/pages/manage/galleries/GalleryEditPage.jsx) and [image utilities](../../src/features/management/imageCollectionUtils.js) | Existing independent collection authoring/metadata/images | Gallery routes; both managers/public media use utilities | Yes | Link to Gallery management; no Food copy. Do not reuse membership payload for Food attachments. |
| [VideoUploadField](../../src/features/management/VideoUploadField.jsx) | Upload-before-Video-create field | Video create form | Technically reusable, not needed in Food | Prefer ContentVideoManager; avoid duplicate owner upload UI. |
| [VideoPlayer](../../src/features/video/VideoPlayer.jsx) | Provider-neutral inline playback | Story, video management, manager, EntityMediaSection, RouteMediaGrid, VideoPlayerDialog | Yes | Pass verified public presentation URLs. |
| [VideoPlayerDialog](../../src/features/video/VideoPlayerDialog.jsx) | Modal player shell | No active import in current source | Yes technically, not required | Use only if adopting an existing modal pattern; current active entity media is inline. |
| [ImageLightbox](../../src/shared/components/ImageLightbox.jsx) | Collection-scoped image viewer/navigation | Story, Place, Waypoint, Segment, generic gallery manager | Yes | Supply canonical image `url`/`thumbnail_url`/caption shape and navigation state. |
| [EntityMediaSection](../../src/features/routes/components/EntityMediaSection.jsx) | Shared public Video/gallery rail | Place/Waypoint/Segment details | Yes | Parent resolves media and supplies gallery open/loading/error handlers. |
| [RouteMediaGrid](../../src/features/routes/components/RouteMediaGrid.jsx) | Collapsible poster-to-player video grid | Route detail | Yes | Optional presentation choice, not a second attachment system. |
| [routeMediaUtils](../../src/features/routes/components/routeMediaUtils.js) | Resolve embedded Videos/UUID fallback and nested galleries | Route/Place/Waypoint/Segment details | Yes if Food response matches | Gallery IDs alone need detail/summary resolution; helpers do not fetch. |
| [RelatedStories](../../src/features/routes/components/RelatedStories.jsx) | Public Story link list | Place/Segment details | Yes to show Food's related Stories | Not usable unchanged to display Food: hardcoded heading/link path. |
| [EntityRouteContext](../../src/features/routes/components/EntityRouteContext.jsx) | Child detail Route/back context | Waypoint/Segment detail | Yes in genuine Route-child contexts | Not a general multi-Route Food related-content component. |
| [CountryFlag](../../src/shared/components/CountryFlag.jsx), [country helpers](../../src/shared/utils/country.js) | Country identity, lookup/format | Management/public entity lists/details/cards | Yes | Use actual Country response shape and complete lookup data. |
| [entity API factory](../../src/services/management/entityApi.js), [apiClient](../../src/services/apiClient.js) | Existing CRUD/auth/CSRF pattern | Generic entities / all network services | Factory yes for CRUD methods | Preserve management list envelope before building scalable pickers/list; no new auth system. |
| [pagination normalizer](../../src/services/pagination.js) | Strict paginated envelope validation | Public Route/Place helpers | Yes if Food uses that exact envelope | Do not apply to an unverified array contract. |
| [ExploreResults](../../src/features/explore/ExploreResults.jsx), [useExploreData](../../src/features/explore/useExploreData.js) | Real load-more/retry/dedupe pattern | Explore Route/Place view | Pattern only | Both are Route/Place-specific; not drop-in Food cards/loaders. Reuse paging behavior, not map assumptions. |
| [LatestStoryCard](../../src/features/home/LatestStoryCard.jsx), [Story list](../../src/pages/StoriesListPage.jsx) | Existing public card aesthetics | Home rail / Story list | Pattern only | Hardcoded Story path/kind/excerpt; small Food adapter or shared extraction required. |

Existing Up/Down UI occurs in Route stops, Waypoint order, Story collection attachments, and image membership authoring. None is a general ordered ingredient/step editor. Reuse interaction/styling conventions, not unrelated Route geometry or collection membership serializers.

## Food Management Field Mapping

The core/recipe names below are supplied by the request. Relationship names marked "proposed" follow existing owner conventions and are not asserted as verified Food backend fields.

| Food field | Existing component/pattern | Reusable? | Notes |
| --- | --- | --- | --- |
| `title` | Shared form text renderer / Story pattern | Yes, internal pattern | Add Food field branch; backend required/max-length rules unverified. |
| `slug` | Shared slug renderer + `slugify`/slug-lock | Yes | Keep create auto-slug and explicit edit conventions; backend generation/uniqueness rules unverified. |
| Country; proposed `country` | Native Country select in shared form | UI yes; loader needs work | Existing keys are `country`, hydration accepts `country_id`; verify Food write/read shape and clearing. |
| `food_type` | Existing explicit enum-select pattern | Pattern yes | No Food choices exist locally; obtain backend enum/default. Do not submit invented values. |
| `status` | Shared status select pattern | Pattern yes, choices not blindly | Existing global options: draft/active/upcoming/inactive/completed/archived. Confirm Food-specific allowed subset/default. |
| `summary` | Shared textarea, Place/Route | Yes | Explicit empty string currently retained. |
| `body` | Shared textarea, Story/Place | Yes | Current public bodies render plain text, not a new rich-text format. |
| Publication fields | Story/Video read-only Published pattern | Pattern yes | Existing `published_at` omitted from writes. Verify Food read-only fields and activation behavior. |
| `prep_time_minutes` | Existing numeric input styling | Pattern yes; serialize specifically | Integer/range/nullability unknown; `step="any"` and raw strings are not sufficient validation. |
| `cook_time_minutes` | Same | Same | Explicit clear vs omission must follow backend contract. |
| `servings` | Same | Same | Verify integer/decimal/string semantics and minimum before choosing coercion. |
| Ordered ingredient list; proposed container `ingredients` | Local array + Add/Remove/Up/Down pattern | New domain editor needed | Container key, child IDs, replacement and empty-list rules must be verified. |
| Ingredient `order` | Existing renumber-after-move convention | Pattern only | Recipe zero/one-based rule unknown; not automatically image `order` or Route `position`. |
| Ingredient `name` | Existing text field styling | Yes inside new editor | Required/length rules unverified. |
| Ingredient `quantity` | Existing text/numeric control styling | Pattern only | Type/unit representation unverified; do not force Number conversion. |
| Ingredient `note` | Existing textarea/text styling | Yes inside new editor | Blank/null rules unverified. |
| Ordered step list; proposed container `steps` | Add/Remove/Up/Down local array pattern | New domain editor needed | Verify key, item IDs and full replacement on PATCH/PUT. |
| Step `order` | Existing renumber convention | Pattern only | Use verified recipe indexing; serialize order on Save. |
| Step `text` | Existing textarea styling | Yes inside new editor | Nested validation must stay associated with row. |
| Places; proposed `place_ids` | RelationshipAttachmentManager | Component yes | New Food callbacks + management loader; raw UUID array, not Route stop objects. |
| Routes; proposed `route_ids` | Same | Component yes | Complete management Route options. |
| Stories; proposed `story_ids` | Same | Component yes | Add management Stories catalog; no current form option-loader branch. |
| Waypoints; proposed `waypoint_ids` | Same + route-scoped GET Waypoints | Component yes; new composition | Route-context loader, persistent cross-route selections, valid saved UUIDs. |
| Segments; proposed `segment_ids` | Same + route-scoped GET Segments | Component yes; new composition | Select persisted Segments, not candidate section pair keys. |
| Videos; proposed `video_ids` | ContentVideoManager | Saved-owner component yes | Pass `"foods"`; immediate PATCH; verify replacement semantics. Public key may differ. |
| Collections; proposed `image_collection_ids` | GalleryAttachmentManager | Yes for generic attachments | Parent Save timing; verify ordering/public shape. Existing Story manager is alternative only if required. |

No `hero_image_id`, Route `path`, Place coordinates, Event relations, or Tour fields should be added to Food merely because another form has them.

## Food Media Integration Plan

1. Confirm Food's writable Video/collection fields and whether supplied arrays replace relationships; confirm public embedded media vs shallow IDs.
2. Use **one** existing gallery manager. Default: generic manager, `ownerType="Food"`, `ownerId=<UUID if saved>`, callbacks updating form `image_collection_ids`; Save owner through Food POST/PATCH.
3. Continue creating/uploading/editing galleries in the existing Gallery pages. Collection content saves independently of Food attachment Save.
4. Use ContentVideoManager after Food has an ID, passing plural `"foods"` and syncing callback IDs into Food form state.
5. Explain create-then-edit for videos, and immediate attachment persistence on edit. Cancel must not be presented as rolling back videos.
6. Normalize/hydrate selected media outside the first catalog page and update the shared new-video catalog after upload. No duplicate Food manager.
7. If collection order is contractual, use existing ordered collection manager without hero UI or add shared optional ordering. Do not promise persisted order until verified.
8. Public Food should use EntityMediaSection, VideoPlayer and ImageLightbox with the same lazy full-gallery fetch pattern as Place/Waypoint/Segment. If Food only returns gallery IDs, resolve summaries/details through confirmed public APIs rather than treating IDs as rendered galleries.

## Food Relationship Integration Plan

- Store scalar Country selection and UUID arrays for each many-to-many relation using the **verified** Food keys.
- Reuse RelationshipAttachmentManager for Places/Routes/Stories/Waypoints/Segments, with controlled callbacks and labels.
- Add Stories option loading to management form infrastructure; do not restrict selection to public Stories.
- Use existing Route-scoped read helpers for children, with separate browse Route context. Preserve attached selections and cached labels from other routes.
- No Food relationship action should PUT Route Waypoints/Segments. Those writes own whole route child collections and may overwrite unrelated fields.
- Display independent catalog loading/failure/retry states and selected UUID fallbacks. Failed option loads must not mean "no entities exist."
- Ensure later-page selection and off-page attached-label resolution before declaring these selectors ready.
- Verify backend constraints for Country/Route/child consistency; do not silently enforce guessed relationships or remove chosen IDs.

## Food API Helper Plan

### Management Helpers

Smallest convention-aligned addition: register `foodsApi = createManagementEntityApi('foods')` in [management/index.js](../../src/services/management/index.js) and `managementApis.foods`. This supplies the existing methods below, **but its list method needs pagination support before it can be a complete catalog**.

| Proposed helper | HTTP | Endpoint | Expected handling |
| --- | --- | --- | --- |
| `managementApis.foods.list(options)` | GET | `/api/offward/manage/foods/` | Preserve actual envelope and page/filter options; current factory takes no options. Verify Food list shape first. |
| `managementApis.foods.getById(id)` | GET | `/api/offward/manage/foods/<uuid>/` | UUID detail; load writable fields and nested recipe rows explicitly. |
| `managementApis.foods.create(payload)` | POST | `/api/offward/manage/foods/` | Writable scalar/relationship/recipe payload; use returned UUID for later media. |
| `managementApis.foods.update(id, payload)` | PATCH | `/api/offward/manage/foods/<uuid>/` | Same generic edit convention; preserve explicit clears and arrays. Backend PUT support does not require frontend PUT usage. |
| `managementApis.foods.remove(id)` | DELETE | `/api/offward/manage/foods/<uuid>/` | Existing confirmed-delete pattern; report errors and refresh list. |

Pagination improvements should preserve existing array-based callers or add an explicit page-returning helper beside them. Do not silently change every `.list()` return type during Food registration.

### Public Helpers

Proposed new public service module follows [Story](../../src/services/storiesApi.js), [Place](../../src/services/placesApi.js), and [Route](../../src/services/routesApi.js) helper conventions:

| Proposed helper | HTTP | Endpoint | Behavior |
| --- | --- | --- | --- |
| `getPublicFoods(options)` | GET | `/api/offward/food/` | **Singular API path.** Return validated actual list shape; preserve pagination if present. Only send verified query filters. |
| `getPublicFoodBySlug(slug)` | GET | `/api/offward/food/<encoded slug>/` | Validate object; return null only on 404; propagate network/server/invalid-shape errors. |

Do not infer supported `country`, `status`, relationship-ID, search, or page-size filters merely because Route/Place accept some of them. If Food is paginated, use the existing envelope normalizer and load-more/retry conventions once confirmed.

### Payload and Response Contract Ledger

| Area | Established evidence | Food-specific unknown / gate |
| --- | --- | --- |
| Endpoint methods | User supplies management GET/POST and detail GET/PUT/PATCH/DELETE; public GET list/detail | Serializer/list envelope still unavailable. |
| Core keys | Request explicitly names `title`, `slug`, `food_type`, `status`, `summary`, `body` | Required fields, limits, defaults and exact enum choices. |
| Country | Existing forms write `country`; support `country_id` or object on read | Confirm Food uses same write key and how public Country is serialized. |
| Recipe metadata | Request explicitly names `prep_time_minutes`, `cook_time_minutes`, `servings` | Types, ranges, nullability and clear behavior. |
| Ingredients | Request specifies ordered rows with `order`, `name`, `quantity`, `note` | Exact container key (`ingredients` proposed), child IDs/read-only keys, indexing, nesting/replacement rules. |
| Steps | Request specifies ordered rows with `order`, `text` | Exact container key (`steps` proposed), child IDs, indexing, replace/clear rules. |
| Relationship IDs | Request says Place/Route/Story/Waypoint/Segment IDs; existing frontend uses several `*_ids` keys | Confirm exact Food write/read keys. No sample serializer response available. |
| Video attachments | Existing owner writes `video_ids`; public Story/Place use `media_ids`; Route-family resolver supports embedded `videos` | Confirm Food key(s), UUID array vs embedded media, URL fields and availability. |
| Collection attachments | Existing owner writes `image_collection_ids`; public UI consumes `image_collections` | Confirm Food list/detail nested shape, previews/images, relationship order. |
| Publication | Existing Story/Video `published_at` is read-only in UI/writes | Food publication/read-only fields and status transition behavior. |
| Reverse references | User supplies shallow `food_ids` on public Country/Place/Route/Story/Waypoint/Segment | UUID-to-public-slug lookup and supported related filtering/hydration. |
| Clearing/replacement | Existing UI retains `[]` but often drops null/empty scalar values | Confirm omitted vs null vs `[]` on PATCH and nested atomicity. |

No fabricated Food JSON response is included. Obtain source-of-truth serializer docs or real read-only responses before implementation. Nested recipe errors may be arrays of objects; current generic `value.join(' ')` field-error handling is insufficient for row-level validation.

## Public Food UI Integration Plan

### Current Public Patterns

| Surface | Current behavior | Food implication |
| --- | --- | --- |
| [Story list](../../src/pages/StoriesListPage.jsx) | API-backed cards: hero/collection-preview fallback, title/excerpt, Country flag/date; loading/error/empty; no paging | Reuse card aesthetic, not first-page-only loader or hardcoded Story labels/links. |
| [Story detail](../../src/pages/StoryPage.jsx) | Slug fetch, text independent of relationship/media catalogs, hero image, plain body; `media_ids` resolved via public Videos; full nested collection images with per-collection lightbox; inline Place/Route cards | Food title/body/media can follow this layout, but recipe presentation is new; Food relation keys/media may differ. |
| [Route detail](../../src/pages/RoutePage.jsx) | Header/Country/activity; collapsible Route video grid; map Waypoints/Segments and detail overlay; no related Story section, no top-level gallery renderer | Add top-level related Food section as content, without changing map authoring or pretending a gallery section already exists. |
| [Place detail](../../src/pages/PlacePage.jsx) | Body/map, shared media rail, lazy cached gallery detail, related Story link list | Add Related Food beside existing related content; keep main Place readable if Food lookup fails. |
| [Country detail](../../src/pages/CountryPage.jsx) | Simple identity/summary/status page, not a related-content hub | Add a small related Food section; there is no Country card loader to reuse unchanged. |
| [Waypoint detail](../../src/pages/WaypointDetailPage.jsx) | Fetches parent Route then selects child UUID; Route context, optional Place, shared media/lightbox | Add related Food from that Waypoint's own `food_ids`, not all Route Food. |
| [Segment detail](../../src/pages/SegmentDetailPage.jsx) | Parent Route fetch/child UUID lookup; boundaries/context, shared media/lightbox, related Stories | Add related Food from that Segment's own `food_ids`; keep scoped relationships. |
| [Route map overlay](../../src/features/routes/components/RouteMapDetailOverlay.jsx) | Compact clickable child preview; gallery cover before video poster; media counts; no full media consumption | Initially retain preview/navigation; Food can live on child details. Food badges/counts are a deliberate extension, not existing behavior. |

### Galleries and Videos

[routeMediaUtils](../../src/features/routes/components/routeMediaUtils.js) prefers embedded `videos` when present; otherwise resolves `media_ids` or `video_ids` against a Video map. Only playable records survive. It de-duplicates nested `image_collections` but **does not resolve `image_collection_ids`**.

Public Place/Waypoint/Segment show gallery previews first, then GET [public image collection detail](../../src/services/imageCollectionsApi.js) only on explicit View; cache by UUID, show per-gallery loading/errors, allow retry. Story instead uses full nested images already on its response. Food should adopt whichever matches its verified public contract, preferably the existing preview/lazy-detail flow for shallow collections.

Route detail only uses Route videos at the top level; its own image collections are not rendered there even though it manages attachments. Child galleries are available through child detail pages. This is an existing gap, not a reason to create another Food gallery renderer.

VideoPlayer is the common inline player. RouteMediaGrid mounts a player only for an expanded item, with collapse unmounting playback. No Food-specific provider URL builder is justified.

### Related Cards: What Actually Exists

- [RelatedStories](../../src/features/routes/components/RelatedStories.jsx) is a simple heading + linked list, **not a generic related-content card component**. Food can use it unchanged to show its related Stories, not to show Food records elsewhere.
- Story's Place/Route cards are inline JSX in [StoryPage](../../src/pages/StoryPage.jsx), not exported pick-any-entity cards.
- [LatestStoryCard](../../src/features/home/LatestStoryCard.jsx) is reusable only for Story records; its path, labels and excerpt are fixed.
- [ExploreResults](../../src/features/explore/ExploreResults.jsx) contains a private Route/Place card and makes map/type assumptions.
- Existing classes in [index.css](../../src/index.css) and [Explore styles](../../src/features/explore/explore.css) provide card/grid/form styling conventions. Reuse them or extract a small presentation primitive if actually shared; do not pass Food as a fake Story.

### Proposed Food Surfaces

| Proposed surface | Smallest coherent integration |
| --- | --- |
| `/food` | Public Food list page in existing AppShell; Story/Explore-like cards and real loading/error/empty/pagination states; Food title/summary/type and real preview only. |
| `/food/:slug` | Slug detail page; header/Country/publication metadata as confirmed, summary/body, recipe metadata and ordered ingredient/step sections; existing media section/lightbox/player; public related entities only. |
| Country | Related Food section from shallow `food_ids`, consistent with the simple existing page, with independent lookup state. |
| Place | Related Food next to existing RelatedStories/media content. |
| Route | Separate related Food section; Route children retain their own scoped references. Do not aggregate child Food into top-level Route Food unless deliberately specified. |
| Story | Related Food section alongside existing Place/Route groups, without changing Story's hero/gallery relationship behavior. |
| Waypoint/Segment | Child detail Related Food sections scoped to that child's IDs; map overlay remains a compact navigation preview initially. |

Register public Food routes in [router](../../src/app/router.jsx), preserving [PublicLaunchGate](../../src/shared/components/PublicLaunchGate.jsx). Add Food navigation and active-section handling in [AppShell](../../src/shared/layout/AppShell.jsx). Management still uses its own access guard.

[ExplorePage](../../src/pages/ExplorePage.jsx) only supports Routes/Places; it is not a generic entity-discovery router. Do not silently add Food as a map mode. Home latest-Food cards or Explore changes are optional later scope, not needed for the requested list/detail/related integration.

### Shallow `food_ids` Resolution

Food detail is slug-addressed; reverse owner references supply UUIDs. An owner cannot link to `/food/<UUID>` and assume it works. Reuse the public related-catalog pattern **only after fixing its completeness**:

- Prefer verified public filters/ID lookup or embedded lightweight summaries if the backend already supports them.
- If only the supplied list/detail capabilities exist, use a shared public catalog/cache that can access later pages and resolve requested UUIDs, with explicit unresolved/loading/error states. Avoid one independent full-catalog crawl per owner.
- Do not claim nonexistent bulk endpoints or filters are available.
- Do not consult management Food to label/link public references; unpublished data must not leak.
- A failed/incomplete catalog must not silently produce "no related Food." Distinguish unavailable/partial/unpublished references.
- Food detail reverse Place/Route/Story and child links likewise need public slug/parent Route context. UUID arrays alone do not establish those links.

## Scaling / Pagination Risks

### Management Blockers

| Risk | Source / consequence | Required response before Food is considered ready |
| --- | --- | --- |
| Generic `.list()` discards envelope | [entityApi](../../src/services/management/entityApi.js); lists and map Place options cannot reach later pages | Add a page-capable helper/UI or a verified complete-catalog strategy; preserve existing callers. |
| Shared form loads only first option response | [EntityFormPage](../../src/features/management/EntityFormPage.jsx); Country/Place/Route/Event/etc. catalogs incomplete | Preserve metadata and expose paging/search or load complete bounded catalogs. |
| "Search" is only local | [RelationshipAttachmentManager](../../src/features/management/RelationshipAttachmentManager.jsx) | Never label as full-catalog search unless data source is complete or server search is verified. |
| Option errors look like emptiness | Shared form catches each option error and returns `[]` | Show option failure/retry; keep selected IDs intact. |
| No cross-route child catalog | Route-scoped helpers only; no generic Waypoint picker and only Video location Segment select | Route-context loader with complete Route browsing and cross-route selected-label cache. |
| Video catalog first response only | ContentVideoManager | Later-page videos cannot be selected; existing off-page IDs invisible. Add paging/selected hydration. |
| Gallery catalog first response only | Both managers and collection list API | Later-page galleries unavailable; generic attached cards invisible. Add paging/selected detail hydration. |
| Upload result not merged into video catalog | ContentVideoManager | Fresh upload attachment/retry not visible until reload; fix shared data flow if Food relies on it. |
| Whole-child collection PUT mixed with media saves | Waypoint gallery vs video paths | Document timing/overwrite risks; Food must write its own relationships only. |

The frontend accepts bare arrays in many management helpers. That means **first-response-only**, not proof that a given endpoint is currently paginated. The backend page size/count and whether each management endpoint returns a complete array are unverified. If it returns a paginated envelope, later records are definitely inaccessible in the current UI. This is a readiness blocker, not an acceptable silent assumption.

For small verified complete arrays, existing local picker presentation can remain unchanged. For larger catalogs, prefer confirmed server-side search/paging or incremental loading. Eagerly fetching every page is not automatically scalable; bound it and expose failure/completeness.

### Public Risks

- Public Route/Place helpers correctly preserve `{ count, next, previous, results }`; [useExploreData](../../src/features/explore/useExploreData.js) provides working page increment, dedupe, stale-request protection and load-more retry.
- Public Story/Video/Country helpers accept array/results but discard pagination. If paginated, Story lists, related Stories, Country labels, and Video UUID resolution miss later pages.
- Story related Places/Routes request **only page 1, size 24**, and explicitly warn if missing matches and `next` exists. They do not resolve later references.
- Waypoint Place context similarly requests only first public Place page and displays a partial-catalog message.
- Related Story lookup failures on Segment become an empty list with no error section; media lookup failures can similarly disappear. Do not copy this into new Food related-content resolution.
- Shared media section has no catalog-loading/error contract; parent pages must render it.
- `food_ids` are shallow. There is no existing source code capable of fully resolving them.
- Food list pagination, filters, max page size, ordering and public publication filtering remain backend contract gates.

### Required Validation for Later Implementation

Use real API fixtures/contracts, not dummy public content, and verify:

1. Choose and preserve entities/media that occur beyond page one, including already attached off-page IDs.
2. Distinguish failed catalog loads from truly empty catalogs and allow retry.
3. Preserve multi-route child selections while changing browse Route; reject temporary/pair IDs.
4. Create Food, edit it, attach/detach videos, then cancel another edit: video persistence remains as disclosed.
5. Gallery attachments change only on Food Save; image content edits retain existing independent persistence.
6. Send explicit clear-all arrays and valid optional-field clears; omission leaves untouched values.
7. Ingredient/step add/remove/reorder survives save/reload with verified order base and nested semantics.
8. Display nested row errors without replacing useful form data.
9. Public lookup reaches later Food pages without management fallback; 404 differs from network error.
10. Public Food galleries/players consume actual backend media shape, with lazy detail and visible failure/retry.

No runtime behavior was changed or live backend behavior certified by this audit. The repository has build/lint scripts but no test script in [package.json](../../package.json); documentation-only work does not require an application build.

## Required New Components

Only missing domain presentation/composition is justified:

1. **Food recipe field editor** within the existing management form: ordered ingredients and steps, using existing field classes and Add/Remove/Up/Down conventions. One component can contain both sections; separate Ingredient/Step components are optional, not mandatory architecture.
2. **Route-scoped child relationship composition** for loading/browsing saved Waypoints/Segments, using existing Route/child APIs and RelationshipAttachmentManager. It can be shared management wiring rather than a new standalone picker file. No replacement picker engine is needed.
3. **Public Food list and detail pages**: actual Food routes, recipe-specific read-only sections, existing media and related-Story presentation.
4. **Small Food card/related-Food section** shared between list and owner relationships, or a narrowly generalized existing presentation extraction. Existing components hardcode other entity links; this is missing Food presentation, not a new parallel design system.

Non-component additions: Food management config/registry/router/dashboard registration, public service helper, contract-aware payload handling, complete/paged catalogs and public UUID resolution. They do not justify a Food-only API client, gallery editor, uploader, video player, relationship engine, or auth system.

Recipe read-only rendering can live directly in the Food detail page initially. Do not create extra generic row/card frameworks unless multiple actual consumers require them.

## Recommended Implementation Order

Smallest safe sequence:

1. **Verify the Food contract:** retrieve missing backend docs/serializer evidence; settle exact keys, enum/defaults, read-only fields, nested order/replace/clear behavior, list pagination/filtering, and public media/reference shapes.
2. **Resolve catalog readiness:** add backwards-compatible page-capable management loading and selected-ID hydration; adapt existing picker consumers as needed. Add complete Route browsing and child read composition. Resolve public Food UUID-to-slug lookup before shipping owner links.
3. **Register management Food CRUD:** factory/registry/config, guarded list/new/edit routes and dashboard card. Add Food branch to the existing form with explicit payload serialization; no new management shell.
4. **Add recipe field editing:** ordered ingredient/step local state and nested errors; validate persistence and clear semantics.
5. **Wire existing relationships/media:** controlled reusable relationship managers, generic gallery manager, saved-Food video manager using `"foods"`. Repair shared catalog gaps required by these integrations; keep save timing visible.
6. **Add public Food helper/list/detail:** preserve launch gate/AppShell; add navigation; reuse existing media/gallery components and recipe-specific rendering.
7. **Add scoped related Food sections:** Country, Place, Route, Story, Waypoint, Segment using complete public-only resolution and independent failure states. Avoid unrelated map/Explore redesign.
8. **Verify end-to-end:** targeted contract and component checks for paging, cross-route selection, recipe order, immediate/deferred timing, null/empty replacement, publication, public 404/error, lazy media, and real related links; then build/lint the implementation.

### Audit Outcome

Food can feel like another first-class Offward entity using the current management shell, shared entity CRUD conventions, compact relationship attachments, and shared public media. The real additions are Food domain fields/recipe presentation and data-source wiring. The main blockers are **unverified Food serializer details**, **first-response-only management catalogs**, **missing route-child multi-selection composition**, and **incomplete public shallow-ID resolution**. None requires a duplicate media system.

## Implementation Follow-up

The subsequent implementation request supplied the previously missing frontend contract: exact Food type/status enums, nullable positive-integer metadata, one-based recipe order, UUID relationship field names, ordered `image_collection_ids`, list replacement semantics, embedded public media, and the paginated public Food endpoint/filter options. These now drive implementation rather than guessed fields. The original audit above is retained as a historical assessment.

Management Food is registered in the existing entity configuration, CRUD factory/registry, guarded routes and dashboard. The shared form includes explicit Food payload preparation and a small recipe editor. Missing list fields in an edit response remain omitted unless deliberately changed; explicit empty arrays clear lists. Publication time is read-only.

Food relationship authoring is managed from its owner: Route, Place and Story editors attach/detach through Food relationship fields, and saved Waypoints use the Route map editor. A shared paginated management Food selector hydrates selected Food records and preserves unresolved UUIDs. There is no persisted Segment editor; candidate Segment pairs are not valid Food relationship IDs, so Segment attachment is deferred.

Saved Food reuses `ContentVideoManager` with resource key `"foods"` and immediate attachment persistence. Shared Video catalogs now expose later pages, hydrate selected UUIDs, and merge new uploads. Ordered gallery attachments reuse `ContentImageCollectionManager` without hero callbacks and save with Food. Shared gallery pickers hydrate selected collections and expose explicit next-page loading; existing Gallery authoring remains separate.

Public Food list/detail routes reuse AppShell, shared media and lightbox presentation. Place, Route, Story, Waypoint and Segment Related Food sections use each owner's own `food_ids` through a shared paged UUID-to-slug cache; Country detail instead queries Foods by canonical `Food.country`. Local Food writes invalidate cached Food data. Public Story lookup remains explicitly first-response-only, and child parent-Route discovery is limited to four Routes per user action, never an automatic unbounded scan.

### Relationship Authoring Direction Correction

The earlier implementation attached Places, Routes, Stories, Waypoints and Segments from the Food form. That UI has been removed; Food create/edit now authors canonical Country and Food content only. Reverse relationship changes are made from Route, Place, Story and persisted Waypoint management surfaces, where one shared Food picker is used. Segment relationship authoring remains deferred because the Route map's Segment list contains candidate Waypoint pairs rather than a saved Segment editor. Country Food is derived from `Food.country`, not a separate Country relationship.

For every owner-side attach/detach, the frontend fetches the current Food detail, reads the relevant array (`route_ids`, `place_ids`, `story_ids` or `waypoint_ids`), changes only that owner's UUID and PATCHes only that relationship field. Missing/non-array relationship state aborts the write visibly. No stale form, recipe, media, Country or status fields are sent; Waypoint edits do not rewrite Route child collections or geometry. The detailed implementation notes and validation are in [Offward Food Frontend Implementation](./offward-food-frontend-implementation.md).

The final build and 29 contract/API/cache/server-rendered tests pass. Focused lint passes; full repository lint retains three pre-existing Place/Segment effect violations. Browser access was denied, so responsive/interactive and live backend behavior are not certified.

For the completed public integration, validation results, exact changed files, and remaining bounded-resolution limitations, see [Offward Food Frontend Implementation](./offward-food-frontend-implementation.md).
