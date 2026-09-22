# OFFWARD Place Frontend Audit

**Audit date:** 2026-09-22  
**Scope:** Current frontend code in this repository. No backend source is present, so backend observations are limited to frontend request code and the checked-in contract documents.

## Executive summary

Places have complete generic management CRUD, coordinate editing, edit-only Video attachment, Gallery attachment on create/edit, ordered attachment to Routes, and optional linkage from Route Waypoints. Public discovery and a slug-addressed Place detail route both exist.

The public Place experience is incomplete. Explore shows text-only selectable rows and map markers, with navigation requiring a second click in a preview panel. `PlacePage` renders core text and a map, but no Videos, Galleries, Stories, Routes, or Waypoints. The reusable media/detail pieces already used by Waypoint and Segment pages can cover much of that presentation, but Place-specific relationship loading is not implemented.

## 1. Place management pages

Management routes are declared in [src/app/manageRouter.jsx](../../src/app/manageRouter.jsx):

| Purpose | Route | Component |
|---|---|---|
| List | `/manage/places` | `EntityListPage resourceKey="places"` |
| Create | `/manage/places/new` | `EntityFormPage resourceKey="places"` |
| Edit | `/manage/places/:id/edit` | `EntityFormPage resourceKey="places"` |

There are no dedicated Place list/form files. Both surfaces are branches of the generic management components.

### List page

[src/features/management/EntityListPage.jsx](../../src/features/management/EntityListPage.jsx) calls `managementApis.places.list()` and renders the configured columns `name`, `country`, `status`, and `visited_at`. It separately loads the management Country list to turn a country ID into a name when the Place response does not include `country_name` or a nested country object.

Each row links to `/manage/places/{id}/edit` and has a Delete button.

### Create and edit

[src/features/management/EntityFormPage.jsx](../../src/features/management/EntityFormPage.jsx) initializes create state from `entityConfig.places.defaultValues`. Edit loads `managementApis.places.getById(id)`, copies only configured Place keys, normalizes a nested `country` or `country_id` to the `country` select value, and locks automatic slug generation when a slug already exists.

Create submits with `managementApis.places.create(payload)` and edit submits with `managementApis.places.update(id, payload)`. Success navigates to `/manage/places`.

### Delete flow

`EntityListPage.handleDelete`:

1. Requires an item ID.
2. Shows `window.confirm("Delete this place? This cannot be undone.")`.
3. Calls `managementApis.places.remove(id)`.
4. Reloads the list on success.
5. Shows `detail`, the first `non_field_errors` item, or a generic message through `window.alert` on failure.

## 2. Place management fields

The Place defaults are defined in [src/features/management/entityConfig.js](../../src/features/management/entityConfig.js), and the fields actually rendered are in `EntityFormPage`.

| UI field | Control/behavior | Submitted field |
|---|---|---|
| Country | Select populated from management Countries | `country` ID; omitted when empty |
| Name | Text input | `name` |
| Slug | Text input; generated from name on create until manually edited | `slug`; omitted when empty |
| Summary | Textarea | `summary` |
| Body/description | Textarea labelled `body`; there is no separate `description` field | `body` |
| Coordinates | `PlaceCoordinatePicker` plus manual number inputs | `latitude`, `longitude` as numbers |
| Visited date | Plain text input, not a date control | `visited_at`; omitted when empty |
| Status | Select: `draft`, `active`, `upcoming`, `inactive`, `completed`, `archived` | `status` |
| Videos | `ContentVideoManager`; only renders after the Place has an ID | `video_ids` |
| Galleries | `GalleryAttachmentManager`; available on create and edit | `image_collection_ids` |

Latitude is validated to `[-90, 90]` and longitude to `[-180, 180]`. The map picker writes the same two form fields and supports manual input fallback if the map fails.

There is no Place title field; `name` is canonical in this UI. There are no Place hero image, SEO, publication timestamp, route, story, waypoint, tour, event, or arbitrary metadata controls.

The backend source and an exact Place serializer contract are not in this workspace. Therefore a complete list of backend-only Place fields cannot be proven. The edit initializer discards response keys not present in `defaultValues`, so fields such as `id`, timestamps, nested `videos`, or nested `image_collections`, if returned, are not editable. The locked conceptual model in [docs/OFFWARD_CONTENT_MODEL(1).md](../OFFWARD_CONTENT_MODEL(1).md) uses `countryId`, nested `coordinates`, `mediaIds`, and `visitedAt`; the implemented API-facing form instead uses snake-case `country`, flat coordinates, `video_ids`, `image_collection_ids`, and `visited_at`.

## 3. Place Video management

Place management does reuse [src/features/video/ContentVideoManager.jsx](../../src/features/video/ContentVideoManager.jsx) with `resourceKey="place"`.

### Data flow

```text
EntityFormPage formData.video_ids
  -> ContentVideoManager attachedVideoIds
  -> normalizeVideoIds()
  -> attach/detach next ID array
  -> PATCH /api/offward/manage/places/{id}/ { video_ids: [...] }
  -> onAttachmentsChange(nextIds)
  -> EntityFormPage formData.video_ids
```

For Place, `getRelationField()` returns `video_ids`; it does **not** use `media_ids`. `media_ids` is used only for Segment and Waypoint resources in this manager.

### Attach

The manager fetches the complete management Video catalog from `GET /api/offward/manage/videos/` on mount. An editor can search by title/status and attach an existing Video. The ID is de-duplicated and the Place is patched immediately.

“Upload new” performs:

1. `createVideoDirectUpload()` for `POST /api/offward/manage/videos/direct-upload/`.
2. Direct TUS upload to the returned Cloudflare URL through `uploadVideoToCloudflare()`.
3. `POST /api/offward/manage/videos/` to create the Video record.
4. Immediate Place PATCH with the expanded `video_ids` array.

If upload succeeds but attachment fails, the manager retains the new Video ID as `retryVideoId` and tells the editor to attach it from the existing list.

### Detach and persistence timing

Remove filters the Video ID out and immediately PATCHes the Place. It does not delete the Video record. The parent form state is updated after a successful PATCH. The later main “Save changes” also includes the current `video_ids`, but it is not what performs attachment changes.

On `/manage/places/new`, the manager returns `null` because there is no `resourceId`; a Place must be created before Videos can be attached.

### Preview and errors

Attached records show thumbnail, title, status, and a Preview/Hide control. Preview uses `VideoPlayer`, which is poster-first and creates the playback iframe only after Play.

Upload/attach failures are converted to messages. A failed Video catalog load is silent and appears as an empty list. Detach calls can set an error, but errors are rendered only inside the open add-video panel; a detach failure while that panel is closed has no visible inline error. There is no optimistic parent update before the PATCH succeeds.

## 4. Place Gallery management

Place create/edit uses [src/features/management/GalleryAttachmentManager.jsx](../../src/features/management/GalleryAttachmentManager.jsx) with `ownerType="Place"`, the Place ID when available, and `formData.image_collection_ids`.

### Data flow

```text
EntityFormPage formData.image_collection_ids
  -> GalleryAttachmentManager attachedCollectionIds
  -> onAttach/onDetach(collection)
  -> EntityFormPage updates image_collection_ids
  -> main Create/Save
  -> POST/PATCH Place with image_collection_ids
```

The manager loads all management collections through `imageCollectionsApi.list()` (`GET /api/offward/manage/image-collections/`). Attach appends an unattached collection ID. Detach filters only that ID from Place form state.

`persistImmediately` is not passed, so it remains `false`: Place gallery changes are local until the main Place Create/Save. Detach does **not** call `imageCollectionsApi.delete()` and does not delete the Gallery.

The attached order follows `image_collection_ids`; new attachments append. There are no up/down, drag, or numeric ordering controls for galleries on a Place. Image order belongs to Gallery management, not this attachment UI.

Preview calls `GET /api/offward/manage/image-collections/{id}/` and passes `detail.images` to `ImageLightbox`. If detail loading fails, it silently falls back to the list object; this can result in a lightbox with no images. Gallery list-load errors are displayed. Because Place persistence is deferred, Place save errors are handled by `EntityFormPage`; the manager’s own persistence status/error UI is inactive.

## 5. Place to Route management UI

The frontend does allow Place attachment to a Route, but only from the generic Route create/edit form in `EntityFormPage`, not from the Place form.

The “Ordered stops” editor operates on `formData.places` entries shaped as `{ place_id, position }`. It supports:

- adding an empty stop;
- choosing a Place from the full management Place list;
- manually editing `position`;
- moving a stop Up/Down, which renumbers all positions;
- removing a stop, which also renumbers the remaining entries.

On save, empty entries are removed and the Route payload contains:

```json
{
  "places": [
    { "place_id": "...", "position": 1 }
  ]
}
```

The request is the normal Route `POST /api/offward/manage/routes/` or `PATCH /api/offward/manage/routes/{id}/`; there is no dedicated RoutePlace service call. The UI edits only the RoutePlace `position` metadata. No other junction metadata is exposed.

The form normalizer reads Route edit data from `data.places`, while the locked public Route contract names this relation `route_places`. Whether the management serializer intentionally uses `places` cannot be checked without backend source.

## 6. Waypoint to Place management

There are two Place-driven controls in the Route map editor:

- [src/features/routes/routeMap/components/WaypointList.jsx](../../src/features/routes/routeMap/components/WaypointList.jsx) has “Add Waypoint from Place”. Its select disables Places without valid coordinates; “Use Place” creates a draft waypoint with `place_id`, Place name as `label`, and copied coordinates.
- [src/features/routes/routeMap/components/WaypointEditor.jsx](../../src/features/routes/routeMap/components/WaypointEditor.jsx) has an optional “Linked Place” select for new and existing waypoints.

Selecting a Place in the editor stores `place_id`, records a local `place_name`, fills an empty label, and replaces latitude/longitude when the Place has valid coordinates. Changing an existing link behaves the same way.

Clearing selects “No linked Place” and sets `place_id` and local `place_name` to empty strings. It does not clear or restore coordinates, name, or label. On serialization, [src/features/routes/routeMap/routeMapUtils.js](../../src/features/routes/routeMap/routeMapUtils.js) sends `place_id: waypoint.place_id || null`, so clearing is explicit.

Saving a waypoint atomically replaces the Route’s waypoint collection through:

```text
Waypoint editor local state
  -> buildWaypointPayload()
  -> PUT /api/offward/manage/routes/{routeId}/waypoints/
  -> { waypoints: [{ id?, order, type, coordinates, name, label,
                     place_id, media_ids, image_collection_ids }] }
```

The Route map editor loads the full management Place list up front, in parallel with Route and waypoint data. It is local to that editor instance, not a global application store, and it is not lazy or search-backed.

## 7. Segment to Place UI

No Segment/Place relationship is exposed. Segment normalization, editing, validation, and payload construction contain no `place_id` or Place collection. The Segment UI exposes boundaries as waypoint IDs, Stories, Videos, and Galleries. This matches the checked-in content model, which gives Place linkage to Waypoints but not Segments; the frontend does not synthesize a Segment/Place relation.

## 8. Story to Place frontend

Story management exposes `places` as a checkbox multi-select populated from the management Place list. Selected IDs remain in `formData.places` and are sent in the normal Story POST/PATCH as `places: [id, ...]`. There is no dedicated Story/Place endpoint and no ordering UI.

Public [src/pages/StoryPage.jsx](../../src/pages/StoryPage.jsx) reads `story.places`. Nested Place objects are used directly; string values are treated as **slugs** and individually resolved with `getPublicPlaceBySlug`. Resolved Places render as links to `/places/{slug}`.

This creates a contract dependency: management writes IDs, while public rendering requires the backend to return nested Place objects or slugs. If public `story.places` contains UUID strings, the frontend will incorrectly request `/api/offward/places/{uuid}/` as though the UUID were a slug.

Place detail does not perform the reverse lookup and shows no related Stories.

## 9. Public Explore Places

The public entry is `/explore?view=places`; any `view` other than exactly `places` defaults to Routes.

### Data and filters

[src/pages/ExplorePage.jsx](../../src/pages/ExplorePage.jsx) calls `getPublicPlaces({ country })`, which issues `GET /api/offward/places/` with optional `?country={countrySlug}`. The only Place filter is Country. Visible Country options are limited client-side to `active` or `upcoming` Countries. There is no Place status, text, bounds, media, route, or visited-date filter and no frontend pagination handling.

### Cards/list rows

There is no dedicated Place card component. Places are inline `<button>` rows showing:

- `name`;
- Country name, or raw `place.country` if unresolved;
- “Not mapped” when coordinates are invalid;
- optional `summary`.

Rows have no image/video preview, visit date, status, route count, related Route names, or distance/context data.

### Map and selection

`MapView` filters Places through `isRenderablePlace`; [src/features/map/components/PlaceLayer.jsx](../../src/features/map/components/PlaceLayer.jsx) renders simple Leaflet markers from `latitude`/`longitude`. Marker or list click sets `selectedPlaceId`, clears Route selection, marks the row/marker selected, and moves the map to that Place at a zoom clamped between 4 and 11.

Selection opens a separate preview below the map with name, Country, summary, “View Place”, and Deselect. Neither a marker click nor a list-row click navigates. Reaching the detail page requires the second “View Place” click to `/places/{slug}`. Places without valid coordinates remain in the list and can still be selected/navigated, but do not appear on the map.

### Current UX gaps

- No single-click Place navigation from list rows or markers.
- No media preview or media count.
- No related Route information.
- No search, bounds loading, Place status filter, pagination, or sorting controls.
- The preview is spatially separated below the map rather than attached to the selected marker.
- Explore fetches both Route and Place data regardless of the active view.

## 10. Public Place routing

[src/app/router.jsx](../../src/app/router.jsx) declares one public Place detail route: `/places/:placeSlug`, rendered by `PlacePage`. Direct URLs are supported.

[src/services/placesApi.js](../../src/services/placesApi.js) uses the slug in `GET /api/offward/places/{encodedSlug}/`. There is no public Place-by-UUID function or route.

A 404 is converted to `null`, and `PlacePage` renders a Place-specific not-found state with a link back to Explore. Other failures render a separate unavailable/network state. The catch-all application route still uses `NotFoundPage` for unmatched paths.

There is no standalone `/places` list route; discovery is `/explore?view=places`.

## 11. Public Place page

`PlacePage` currently renders:

- `name`;
- Country slug converted to title case, or “Country pending”;
- optional `visited_at`;
- optional `summary`;
- optional `body` as text in a `<div>`;
- a single-Place `MapView` when coordinates are valid;
- an unavailable-location message otherwise;
- Back to Explore navigation.

It does not render Videos, Galleries, Stories, Routes, or linked Waypoints. It does not request Video or Gallery APIs and has no lazy Gallery loading or Video playback. It also does not expose a reusable Place-specific detail component; the page owns its fetch and status states directly.

Reusable pieces already proven on Waypoint/Segment detail pages are covered in section 14.

## 12. Place API services

### Public

[src/services/placesApi.js](../../src/services/placesApi.js):

| Function | Request | Behavior |
|---|---|---|
| `getPublicPlaces({ country } = {})` | `GET /api/offward/places/`, optional `country` param | Requires a bare array; otherwise throws |
| `getPublicPlaceBySlug(slug)` | `GET /api/offward/places/{encodeURIComponent(slug)}/` | Requires an object; returns `null` for 404; rethrows other errors |

### Management

[src/services/management/index.js](../../src/services/management/index.js) exports `placesApi = createManagementEntityApi('places')`. [src/services/management/entityApi.js](../../src/services/management/entityApi.js) provides:

| Function | Request |
|---|---|
| `placesApi.list()` | `GET /api/offward/manage/places/` |
| `placesApi.getById(id)` | `GET /api/offward/manage/places/{id}/` |
| `placesApi.create(payload)` | `POST /api/offward/manage/places/` |
| `placesApi.update(id, payload)` | `PATCH /api/offward/manage/places/{id}/` |
| `placesApi.remove(id)` | `DELETE /api/offward/manage/places/{id}/` |

The generic form also bypasses `placesApi.list()` and directly calls `apiClient.get('/api/offward/manage/places/')` while loading relationship options.

### Media-related requests used by Place management

- `GET /api/offward/manage/videos/`
- `POST /api/offward/manage/videos/direct-upload/`
- Direct upload to the returned Cloudflare URL
- `POST /api/offward/manage/videos/`
- `PATCH /api/offward/manage/places/{id}/` with `{ video_ids }`
- `GET /api/offward/manage/image-collections/`
- `GET /api/offward/manage/image-collections/{id}/` for preview
- Main Place POST/PATCH with `{ image_collection_ids }`

There are no Place-specific media endpoints.

## 13. Media contract consumption

| Context | Nested `videos` | `media_ids` | `video_ids` | Nested `image_collections` | `image_collection_ids` |
|---|---:|---:|---:|---:|---:|
| Management Place form | Ignored | Ignored | Read, edited, submitted | Ignored | Read, edited, submitted |
| Public Place page | Ignored | Ignored | Ignored | Ignored | Ignored |
| Reusable `resolveAttachedVideos` | Preferred when present | Fallback | Fallback | N/A | N/A |
| Reusable `resolveImageCollections` | N/A | N/A | N/A | Required | Not resolved |

The current Place manager therefore expects `video_ids` and `image_collection_ids`. The requested `media_ids` chain does not exist for Place.

The public Place page makes no media contract assumptions because it does not consume any media fields. If it adopts the existing route-detail helpers unchanged, nested `videos` will work without a catalog request; `video_ids` or `media_ids` will require a Video index; nested lightweight `image_collections` will work, but bare `image_collection_ids` will not be resolved by `resolveImageCollections`.

The checked-in canonical content model names a generic camel-case `mediaIds`; the implemented Place management request uses `video_ids`. No exact current Place backend serializer is visible, so this is a documented model/API naming divergence, not proof of a runtime backend defect.

## 14. Reusable detail components

| Component/helper | Reuse for Place | Required Place-specific work |
|---|---|---|
| `EntityMediaSection` | Reusable unchanged for already-resolved playable Videos and Gallery summaries | Place page must resolve data, own loading/error state, and supply `onOpenGallery` |
| `routeMediaUtils.resolveAttachedVideos` | Reusable; supports nested `videos`, then `media_ids`/`video_ids` | Load/index public Videos when only IDs are supplied |
| `routeMediaUtils.resolveImageCollections` | Reusable only for nested `image_collections` | Add Place-side resolution if the API supplies only `image_collection_ids` |
| `EntityRouteContext` | Not reusable unchanged | It assumes a child of one Route and always links “Back to Route”; a Place can belong to multiple Routes |
| `RelatedStories` | Reusable unchanged once Story objects are resolved | Place-specific reverse relationship loading is absent |
| `ImageLightbox` | Reusable unchanged | Place page needs lightbox state, per-gallery lazy fetch, cache, and errors |
| `getPublicImageCollection` | Reusable unchanged | Call only when a Gallery opens |
| `VideoPlayer` | Reusable unchanged | Supply playback/thumbnail/title data |
| `VideoPlayerDialog` | Available but unnecessary for `EntityMediaSection`, which embeds `VideoPlayer` | Only needed if Place UX chooses modal playback |
| `MapView`/`PlaceLayer` | Already reused unchanged by Place detail and Explore | Place-specific framing/preview behavior remains in the page |
| `PlaceCoordinatePicker` | Already reused unchanged in management | Management-only editing component |

Waypoint and Segment detail pages demonstrate the intended lazy Gallery pattern: consume shallow nested Gallery summaries, fetch full ordered images only on View, cache collections in a `Map`, and render `ImageLightbox`. They also demonstrate full-catalog Video resolution for shallow IDs and `EntityMediaSection` rendering.

## 15. Performance

Relevant current risks:

- `EntityFormPage` iterates every relationship type for every entity. Opening a Place create/edit form fetches full management lists for Countries, Places, Routes, Events, Partners, Tours, and Videos, even though the Place’s ordinary fields only need Countries.
- On Place edit, `ContentVideoManager` independently fetches the full Video list again, duplicating the generic form’s Video catalog request.
- `GalleryAttachmentManager` eagerly fetches the full management Gallery list. It fetches full Gallery detail only on Preview, which is the correct lazy boundary.
- `/explore?view=places` still fetches public Routes, including `include_geometry=true`, alongside Countries and Places. The Route request is unrelated to the active Places view.
- Explore requests all Places for the selected Country and has no pagination or bounds-based loading.
- `WaypointDetailPage` resolves one `place_id` by fetching the entire public Place list each time the page mounts; there is no public by-ID client method.
- Story public relation resolution can issue one Place detail request per bare Place slug.
- `PlacePage` does not fetch global Videos, Galleries, Route details, Stories, or Waypoints. It currently has no duplicate-request issue beyond its single detail request.
- No Place card fetches Route detail per Place.

## 16. Capability matrix

| Capability | Frontend exists? | API wired? | UX complete? | Gap |
|---|---:|---:|---:|---|
| Place list management | Yes | Yes | Yes | Generic table only; eager unrelated catalog loading is limited to forms, not list |
| Place create/edit | Yes | Yes | Partial | Video attach is unavailable until after create; visited date is plain text; no richer backend-only fields can be assessed |
| Place Video management | Yes | Yes | Partial | Edit-only; full catalog duplicated; weak catalog/detach error visibility |
| Place Gallery management | Yes | Yes | Partial | Save-deferred with no attachment reorder; failed detail preview silently falls back |
| Place to Route management | Yes | Yes | Partial | Route-side only; only `position` metadata; management `places` versus documented public `route_places` needs contract confirmation |
| Waypoint to Place | Yes | Yes | Yes | Full Place list is eagerly loaded; clearing preserves copied coordinates/label by design |
| Explore Places | Yes | Yes | Partial | No direct row/marker navigation, media, route context, search, pagination, or bounds loading |
| Place detail route | Yes | Yes | Partial | Slug only; page is minimal |
| Place public media | No | No | No | Place page ignores all Video/Gallery fields |
| Related Stories | Partial | Partial | No | Story to Place works publicly; Place to Stories is absent |
| Related Routes | Partial | Partial | No | Route-side ordered management exists; Place detail/Explore show no Routes |

## 17. Smallest next frontend work

No implementation is included in this audit.

### Management gaps

1. Make `EntityFormPage` load only relationship catalogs needed by the active resource; remove the duplicate Video-list request for Place edit.
2. Make attachment timing explicit in the Place UI: Videos require a saved Place and persist immediately; Galleries are staged until Create/Save.
3. Surface Video catalog and detach failures outside the optionally closed add panel.
4. Confirm the management Route relation response/request key (`places` versus `route_places`) against the backend before changing the form.
5. Add Gallery attachment ordering only if Place Gallery order is a backend-supported contract.

### Public Explore gaps

1. Stop loading Route geometry while the active view is Places.
2. Decide and implement one-click navigation semantics for Place rows and/or markers while retaining selection where needed.
3. Add lightweight media preview/count and related Route summary only after the public Place summary contract exposes them.
4. Add pagination or bounds-aware Place loading when the endpoint contract supports it.

### Place detail gaps

1. Confirm the exact public Place detail response for Videos, Galleries, related Stories, related Routes, and linked Waypoints.
2. Add `EntityMediaSection` using nested Video data or one indexed `getPublicVideos()` request, plus shallow `image_collections`.
3. Reuse the Waypoint/Segment lazy Gallery fetch, cache, error, and `ImageLightbox` pattern.
4. Add related Stories and Routes using shallow public relationship data; do not derive them through per-Place Route detail fetches.
5. Add linked Waypoints only if the public Place contract intentionally exposes that reverse relation.

### Media gaps

1. Align Place naming across the actual backend contract and frontend: `video_ids` versus generic `media_ids`, and nested `image_collections` versus `image_collection_ids`.
2. Prefer nested playable `videos` on detail or one catalog request; avoid a request per Video.
3. Preserve lightweight Gallery summaries on initial detail and load full ordered images only when opened.
4. Reuse `VideoPlayer`, `EntityMediaSection`, `getPublicImageCollection`, and `ImageLightbox`; no new media primitives are needed.
