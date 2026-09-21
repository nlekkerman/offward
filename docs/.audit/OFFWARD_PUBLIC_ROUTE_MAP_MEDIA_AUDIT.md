# Offward Public Route Map Media Audit

Date: 2026-09-21

Scope: frontend and checked-in API contracts only. No implementation files were changed. This repository contains no captured live Route response, so deployed payload differences must be verified against the network response; conclusions below distinguish repository-proven behavior from that runtime check.

## 1. Current data flow

### Waypoint selection

```text
Leaflet Marker click
-> PublicWaypointMarker calls onWaypointSelect(waypoint.id)
-> MapView forwards the callback unchanged
-> RoutePage.selectWaypoint stores selectedWaypointId and clears selectedSegmentId
-> activeWaypointId selects the clicked ID (or hovered ID when nothing is pinned)
-> mapDetail re-finds the current Waypoint in route.waypoints
-> resolveAttachedVideos(waypoint, videoById)
-> resolveImageCollections(waypoint)
-> RouteMapDetailOverlay receives detail.videos and detail.imageCollections
-> Play sets RoutePage.activeVideo; View sets RoutePage.lightbox
-> external VideoPlayerDialog / ImageLightbox renders outside the map
```

Files and functions:

- [src/features/map/components/RouteEndpointLayer.jsx](../../src/features/map/components/RouteEndpointLayer.jsx): `PublicWaypointMarker`, `RouteEndpointLayer`.
- [src/features/map/components/MapView.jsx](../../src/features/map/components/MapView.jsx): forwards waypoint props and renders map children.
- [src/pages/RoutePage.jsx](../../src/pages/RoutePage.jsx): `selectWaypoint`, `activeWaypointId`, `mapDetail`, `openVideo`, `openGallery`.
- [src/features/routes/components/routeMediaUtils.js](../../src/features/routes/components/routeMediaUtils.js): `resolveAttachedVideos`, `resolveImageCollections`.
- [src/features/routes/components/RouteMapDetailOverlay.jsx](../../src/features/routes/components/RouteMapDetailOverlay.jsx): renders preview rows.
- [src/features/video/VideoPlayerDialog.jsx](../../src/features/video/VideoPlayerDialog.jsx) and [src/shared/components/ImageLightbox.jsx](../../src/shared/components/ImageLightbox.jsx): external viewers.

The click passes only an ID. The selected object is not copied into state; `mapDetail` re-finds it from the current `waypoints` array. This rules out a stale selected-object copy in the examined path.

### Segment selection

```text
Leaflet GeoJSON click or Sections row click
-> onSegmentSelect(segment.id)
-> RoutePage.selectSegment stores selectedSegmentId and clears selectedWaypointId
-> mapDetail re-finds the current Segment in route.segments
-> resolveAttachedVideos(segment, videoById)
-> resolveImageCollections(segment)
-> RouteMapDetailOverlay receives detail.videos and detail.imageCollections
-> external VideoPlayerDialog / ImageLightbox opens from RoutePage state
```

Files and functions:

- [src/features/map/components/SegmentLayer.jsx](../../src/features/map/components/SegmentLayer.jsx): GeoJSON click callback.
- [src/features/routes/components/RouteSections.jsx](../../src/features/routes/components/RouteSections.jsx): Sections-list selection.
- [src/features/map/components/MapView.jsx](../../src/features/map/components/MapView.jsx): forwards Segment selection props.
- [src/pages/RoutePage.jsx](../../src/pages/RoutePage.jsx): `selectSegment` and `mapDetail`.
- The same resolver, overlay, and external-viewer files listed above.

## 2. Public API field names actually used

`getPublicRouteBySlug` in [src/services/routesApi.js](../../src/services/routesApi.js) returns the response object unchanged. There is no public Route detail normalizer that removes or renames media fields.

The frontend currently recognizes:

| Owner | Video fields accepted | Gallery fields accepted |
|---|---|---|
| Route | nested `videos`, otherwise `video_ids`, otherwise `media_ids` | not resolved for Route-page presentation |
| RouteWaypoint | nested `videos`, otherwise `media_ids`, otherwise `video_ids` | nested `image_collections` only |
| RouteSegment | nested `videos`, otherwise `media_ids`, otherwise `video_ids` | nested `image_collections` only |

The checked-in canonical public contract in [docs/OFFWARD_MAP_API_IMPLEMENTATION_CONTRACT.md](../OFFWARD_MAP_API_IMPLEMENTATION_CONTRACT.md) specifies:

- Route: shallow `media_ids`.
- RouteSegment: shallow `media_ids` and `story_ids`; no nested Video objects.
- RouteWaypoint: no `media_ids`, `video_ids`, nested `videos`, `image_collection_ids`, or nested `image_collections` in the documented public shape.
- RouteSegment: no `image_collection_ids` or nested `image_collections`.
- Maximum Route detail depth is shallow; full Video and other media objects are not recursively embedded.

The contract's full JSON example also omits Waypoint media while including Segment `media_ids`. Management code does preserve both Waypoint and Segment `media_ids`: `normalizeWaypoint`/`buildWaypointPayload` and `normalizeSegment`/`buildSegmentPayload` in [src/features/routes/routeMap/routeMapUtils.js](../../src/features/routes/routeMap/routeMapUtils.js). Therefore Waypoint video attachment can exist in management while being absent from the canonical public response.

No frontend fixture contains a Route payload (`src/data/routes.js` is empty), and no types provide a stronger response definition.

## 3. Waypoint Video findings

The selected Waypoint reaching `mapDetail` is the object from `route.waypoints`, with only `order` normalized. It is not passed through management `normalizeWaypoint` on the public page.

`resolveAttachedVideos` correctly supports nested `videos` for compatibility, then `media_ids`, then `video_ids`. IDs are normalized with `String`, de-duplicated, and looked up in a `Map` keyed by `String(video.id)`, so UUID object/string comparison is not the failure. Resolved records are retained only when they have both an ID and `playback_url`.

The repository-proven break is earlier: the canonical Waypoint public read shape does not expose any video relationship field. Consequently:

- `unresolvedVideoIds` sees no Waypoint IDs;
- Waypoint-only attachments cannot trigger the one-time public Video list load;
- `resolveAttachedVideos(waypoint, videoById)` returns `[]`;
- the marker media count is zero;
- the overlay's Media block remains hidden.

Classification: **backend public serialization gap**.

## 4. Segment Video findings

The Segment object comes directly from `route.segments`. The documented fields are `id`, `route_id`, `order`, `title`, `summary`, `geometry`, boundary Waypoint IDs, `needs_review`, `story_ids`, `media_ids`, and timestamps.

The frontend wiring matches that contract:

- Segment `media_ids` contribute to `unresolvedVideoIds`.
- `getPublicVideos()` loads the public catalog once when any owner has IDs.
- `videoById` indexes by string ID.
- `resolveAttachedVideos(segment, videoById)` resolves only that Segment's IDs.
- `mapDetail.videos` reaches the overlay.

There is no per-selection request, stale selected object, memo dependency omission, or UUID/string mismatch in this path. The public Video service filters explicitly non-active videos, and the resolver filters records without `playback_url`; those are intentional playability/publication gates, but either condition explains a specific attached record being absent.

Classification from repository evidence: **no bug found**. If Segment videos are absent at runtime, inspect the initial Route response for Segment `media_ids`, then confirm those IDs occur in `/api/offward/videos/` as active records with `playback_url`. A missing Segment `media_ids` value would be a deployed backend serialization violation, not the frontend path shown here.

## 5. Waypoint ImageCollection findings

`resolveImageCollections` does not resolve IDs. It only de-duplicates already embedded `owner.image_collections` objects. `RoutePage` does not load public ImageCollections, create an index, or recognize `image_collection_ids`.

The canonical Waypoint public shape defines no ImageCollection attachment field. The frontend also has no Waypoint ImageCollection attachment UI: [src/features/management/ContentImageCollectionManager.jsx](../../src/features/management/ContentImageCollectionManager.jsx) is used for Stories, not Route map owners.

Classification: **backend public serialization gap**. The relationship and its public shallow field are not established by the checked-in contract. Even after that contract exists, frontend one-time resolution will still be required.

## 6. Segment ImageCollection findings

The same resolver limitation applies to Segments: only nested `image_collections` can render. The Segment contract exposes `media_ids` specifically as reusable Video IDs through `VideoAttachment`; it defines no `image_collection_ids` or nested collections. Segment management currently attaches Videos but not ImageCollections.

Classification: **backend public serialization gap**. There is no repository evidence that a canonical Segment-to-ImageCollection relationship is serialized publicly. Frontend resolution is also unwired because there is no ID field to consume.

## 7. RouteMapDetailOverlay findings

`RouteMapDetailOverlay` accepts:

- `detail`
- `onClose`
- `onPlayVideo`
- `onOpenGallery`
- `onShowFullRoute`
- `onPointerEnter`
- `onPointerLeave`

It distinguishes owner type through `detail.type`; only a Segment receives the `Show full route` action. Media itself is owner-agnostic and arrives as resolved arrays in `detail.videos` and `detail.imageCollections`.

The Media block renders when `videos.length > 0 || imageCollections.length > 0`. Defaults convert missing/non-array values to empty arrays. This correctly hides empty data but will also hide valid raw IDs because the overlay intentionally expects resolved objects. There is no local state or memoization in the overlay that can become stale.

Videos are supported as thumbnail/title/duration previews with a `Play` callback. Galleries are supported as collection cover/count previews with a `View` callback. `collectionPreview` accepts `preview_image.url`, `preview_image.image_url`, `preview_image_url`, or the first image URL, so no cover normalization failure occurs for those known shapes. A gallery with zero embedded `images` is rendered but its View button is disabled.

The overlay does not instantiate `VideoPlayer` or a Cloudflare iframe. Full playback remains in the page-level `VideoPlayerDialog`, which uses the existing `VideoPlayer`. Gallery viewing remains in the page-level existing `ImageLightbox`.

`RouteMediaGrid` is relevant only to the separate Route-level media panel. It embeds `VideoPlayer` cards and is not used by the map overlay.

## 8. Root-cause table

| Case | Classification | Exact reason |
|---|---|---|
| Waypoint Videos | **backend public serialization gap** | Management preserves `media_ids`, but the canonical public Waypoint shape exposes no video IDs or nested videos. The frontend resolver therefore receives no relationship data. |
| Segment Videos | **no bug found** | Contracted `media_ids` are loaded once, string-normalized, owner-resolved, and passed to the overlay. Runtime payload/catalog inspection is needed if this still fails. |
| Waypoint ImageCollections | **backend public serialization gap** | No canonical Waypoint ImageCollection relationship/public field is defined; frontend additionally has no ID-based public resolver. |
| Segment ImageCollections | **backend public serialization gap** | No canonical Segment ImageCollection relationship/public field is defined; frontend additionally has no ID-based public resolver. |

## 9. Ownership boundaries

Current resolver behavior is strict:

- Route media uses only the Route owner.
- Waypoint overlay media uses only the selected Waypoint.
- Segment overlay media uses only the selected Segment.

`unresolvedVideoIds` combines owner IDs only to decide whether to fetch the shared Video catalog. It does not combine resolved media for display. No child media is bubbled to the Route or between Waypoints and Segments.

## 10. Exact files that would need modification

Backend repository, outside this workspace:

- Public `RouteWaypoint` serializer and Route detail prefetch/query path: expose the existing direct Waypoint Video attachment IDs as `media_ids`.
- ImageCollection relationship models/serializers for RouteWaypoint and RouteSegment, only if those canonical relationships are approved: expose shallow `image_collection_ids`.
- Existing public ImageCollection/Gallery API must return the referenced public collection objects and ordered images. No new duplicate media API should be introduced.
- Public `RouteSegment` serializer requires no Video contract change if it already emits its documented `media_ids`; deployed output must be checked.

Frontend repository:

- [src/pages/RoutePage.jsx](../../src/pages/RoutePage.jsx): load public ImageCollection objects once when attachment IDs exist, index once, resolve per owner while building `mapDetail`, and retain the existing external viewer state.
- [src/features/routes/components/routeMediaUtils.js](../../src/features/routes/components/routeMediaUtils.js): add/reuse ID normalization and resolve `image_collection_ids` against the loaded canonical collection index while preserving nested-object compatibility only if required.
- The existing canonical public Gallery/ImageCollection service module, if one exists in the wider application, must be reused. This frontend contains only [src/services/management/imageCollectionsApi.js](../../src/services/management/imageCollectionsApi.js), which must not be used on a public page.

No change is required in `RouteMapDetailOverlay`, `VideoPlayerDialog`, `VideoPlayer`, `ImageLightbox`, `RouteEndpointLayer`, `SegmentLayer`, or `RouteMediaGrid` for the audited data-flow defect.

## 11. Smallest recommended fix and backend requirement

Backend change required:

- **Waypoint Videos: yes.** Add `media_ids` to the public nested RouteWaypoint serializer, backed by the existing direct `VideoAttachment` relationship.
- **Segment Videos: none if deployed output matches the existing contract.** Verify the actual initial Route response before changing code.
- **Waypoint and Segment ImageCollections: yes.** First establish/confirm direct canonical relationships and shallow `image_collection_ids` fields. The current contract does not contain them.

Frontend change required after the backend fields exist:

- Keep the existing one-time Video catalog load and resolver; no Waypoint/Segment Video overlay rewrite is needed.
- Reuse the existing canonical public ImageCollection/Gallery API to load referenced collections once at Route-page level.
- Resolve `image_collection_ids` once against an indexed collection catalog and pass resolved collections in `mapDetail.imageCollections`.
- Keep click/hover limited to selection state changes and keep playback/lightbox outside the map.

The cheapest disconfirming check before implementation is one browser network inspection of `GET /api/offward/routes/:slug/` plus `GET /api/offward/videos/`: verify Waypoint and Segment relationship IDs in the first response and matching active/playable Video records in the second. That check determines whether the deployed backend already exceeds the checked-in contract and prevents an unnecessary frontend rewrite.