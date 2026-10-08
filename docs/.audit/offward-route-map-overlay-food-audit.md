# Offward Route Map Overlay Food Audit

Audit date: 2026-10-08. Scope: public frontend Route detail, route-map entity selection and overlay, public Food resolution, and relevant presentation styles. This is an audit only: no application code or backend code was changed.

## Route Food Aggregation Follow-up (2026-10-08)

The audit below is historical. The Route detail "Food along the way" section now passes a presentation-only union of `route.food_ids`, every embedded `waypoint.food_ids`, and every embedded `segment.food_ids` to [RelatedFood](../../src/features/food/RelatedFood.jsx), instead of only `route.food_ids`.

[getRouteFoodIds](../../src/features/food/publicFoodResolution.js) safely normalizes missing/non-array relationships and deduplicates IDs with the existing public relationship normalizer. Order is first occurrence: Route, then Waypoints, then Segments. [RoutePage](../../src/pages/RoutePage.jsx) derives this list without mutating any owner relationship.

Waypoint/Segment overlays and detail pages still resolve only their own `food_ids`. Backend ownership, management APIs, and the existing public Food cache/resolver are unchanged; aggregation adds no API call or relationship write. Regression coverage is in [publicFood.test.js](../../src/features/food/publicFood.test.js).

## Current Overlay Data Flow

1. `RoutePage` calls `getPublicRouteBySlug(routeSlug)`.
2. `getPublicRouteBySlug` in `src/services/routesApi.js` GETs `/api/offward/routes/{slug}/`, checks that the response is an object, and returns the response data without normalizing or projecting its fields.
3. `RoutePage` stores that object as `routeResult.route`.
4. `getOrderedRouteWaypoints(route)` selects Waypoints that have an object shape, `route_id === route.id`, and a string `id`. It spreads every Waypoint property into a new object, supplies a numeric `order` if needed, and sorts the result. It does not remove `food_ids`.
5. `segments` is the Route's `segments` array unchanged (or an empty array if it is not an array).
6. Selection state is held separately as `selectedWaypointId` and `selectedSegmentId`; hover preview state is `hoveredWaypointId`. Selecting one entity clears the other. `activeWaypointId` uses the selected Waypoint or, when no Segment is selected, the hovered Waypoint.
7. `mapDetail` finds the selected raw child and constructs a new, limited display object. That projection includes title/type-or-endpoint text, summary, resolved videos and embedded image collections, but does not copy `food_ids`, story IDs, place fields, or arbitrary child fields.
8. `RouteMapDetailOverlay` receives that object as its `detail` prop; it does not receive the selected raw Waypoint or Segment and has no Food lookup.
9. The overlay renders `detail.eyebrow`, `title`, `subtitle`, `summary`, one media preview, media counts, and actions. “View details” navigates to the child detail URL; it does not open a Food detail.

The public Route response and child response/serializer implementation are not present in this frontend checkout. Accordingly, the exact backend JSON serializer shape cannot be independently confirmed here. The frontend evidence is that the Route detail endpoint returns its raw object, while RoutePage expects `route.id`, `route.waypoints`, and `route.segments`, and accesses the child properties described below. `WaypointDetailPage` and `SegmentDetailPage` also fetch the parent Route detail and find their child by ID in those embedded arrays rather than calling separate Waypoint/Segment public endpoints.

## Waypoint Overlay Data

For a selected Waypoint, the exact object passed to `RouteMapDetailOverlay` is constructed by `RoutePage` in this shape:

```js
{
  id: waypoint.id,
  type: 'waypoint',
  eyebrow: `Waypoint ${waypoint.order}`,
  title: waypoint.name || waypoint.label || waypoint.place_name || `Waypoint ${waypoint.order}`,
  subtitle: String(waypoint.type || 'via').toUpperCase(),
  summary: waypoint.summary || waypoint.note || waypoint.description || '',
  videos: resolveAttachedVideos(waypoint, videoById),
  imageCollections: resolveImageCollections(waypoint),
}
```

What gets used or can reach this projection:

- `food_ids`: the raw child property survives `getOrderedRouteWaypoints`'s spread-copy normalization, but is not copied into `mapDetail`.
- Media/video IDs: the projected object does not retain `media_ids` or `video_ids`. `resolveAttachedVideos` uses embedded `waypoint.videos` when present, otherwise resolves IDs from `media_ids` or `video_ids` against the RoutePage public Video catalog.
- Image collections: `resolveImageCollections` copies usable embedded `waypoint.image_collections`. `image_collection_ids` alone are not resolved by this overlay helper.
- Story IDs: not copied or resolved for the overlay.
- Place context: `place_name` is a title fallback only. `place_id`, a nested `place`, and resolved Place details are not copied or displayed in the overlay.
- Resolved related content: only videos and embedded image collections are prepared for the overlay. No Food, Story, or Place resolver is invoked for it.

The frontend child fields also used by Waypoint detail include `id`, `route_id`, `order`, `name`/`label`/`place_name`, `type`, `summary`/`note`/`description`, `place_id`, coordinates, media/gallery fields, and `food_ids`. These are frontend expectations, not independent proof of every backend serializer field.

## Segment Overlay Data

For a selected Segment, `RoutePage` constructs this object:

```js
{
  id: segment.id,
  type: 'segment',
  eyebrow: `Section ${segment.order}`,
  title: segment.title || `${getWaypointTitle(start)} → ${getWaypointTitle(end)}`,
  subtitle: start && end ? `${getWaypointTitle(start)} → ${getWaypointTitle(end)}` : '',
  summary: segment.summary || segment.note || '',
  videos: resolveAttachedVideos(segment, videoById),
  imageCollections: resolveImageCollections(segment),
}
```

The `start` and `end` labels are looked up in the current Route's Waypoints using `start_waypoint_id` and `end_waypoint_id`. The object passed to the overlay contains only the resulting title/subtitle strings, not the endpoint Waypoint objects or their other data.

What gets used or can reach this projection:

- `food_ids`: not copied into `mapDetail`; it is not passed to the overlay.
- Media/video IDs: not copied. Embedded `segment.videos`, or `media_ids`/`video_ids` resolved against the public Video catalog, supply `videos`.
- Image collections: embedded `segment.image_collections` are copied by the shared media helper; IDs alone are not resolved there.
- Story IDs: not copied or resolved for the overlay. The Segment detail page independently uses `RelatedStories`.
- Place context: there are no Place fields or resolved Place details on the overlay object. Endpoint names may themselves be Waypoint labels but not Place cards.
- Resolved related content: only videos and embedded image collections.

The public Segment detail UI also reads `order`, `title`, `summary`/`note`, endpoint IDs and `food_ids`; its separate media and related-story sections are outside this overlay. As above, backend serializer sources were not available to verify the complete wire schema.

## Existing Food Data on Route Detail

The Route page renders:

```jsx
<RelatedFood foodIds={route.food_ids} />
```

This is a sibling section in the Route detail side content, not a child of the map overlay. It resolves only the Route's own `food_ids`.

The public Waypoint detail page separately renders `RelatedFood` with `waypoint.food_ids`. The public Segment detail page separately renders it with `segment.food_ids`. Those consumers establish that the frontend treats each owner's Food relationship as its own shallow ID list. Nothing in this RoutePage path aggregates Route Food IDs onto children or inherits Route Food into a Waypoint or Segment.

`food_ids` are relationship identifiers, not hydrated Food objects. The public Food resolver converts them to Food records only when a matching public Food record with a slug is present in its loaded cache.

## Food Along the Way Source

On the Route detail page, the heading “Food along the way” is rendered inside the shared `RelatedFood` component. That component is given `route.food_ids`; it does not receive `waypoints`, `segments`, or any child Food IDs.

Therefore, on this page it is sourced from **Route.food_ids only**, not an aggregate and not Waypoint/Segment IDs. The frontend contains distinct Waypoint and Segment detail usages of the same component, each passing that individual owner's own IDs. No code in the audited path combines the three scopes.

## Existing Public Food Resolution

The existing public Food path is reusable:

- `RelatedFood` subscribes to the singleton exported by `src/features/food/publicFoodCache.js`.
- It calls `publicRelationshipIds` and `resolvePublicFoodIds` from `publicFoodResolution.js` to deduplicate shallow IDs and find slug-bearing Food records in the cache snapshot.
- The cache calls `getPublicFoods` from `src/services/foodsApi.js`, which requests the public `/api/offward/food/` endpoint and normalizes a paginated response. No management endpoint is involved.
- The cache stores loaded records by ID, caches page results, and deduplicates in-flight requests by page/query key. An initial unresolved relationship triggers page 1 (12 records); further pages are exposed through an explicit “Load next Food page” action. The resolver does not automatically crawl the catalog.
- Public Food detail calls `rememberPublicFoods` to seed the same cache with a loaded detail record.

An overlay can subscribe to and resolve against this exact shared cache and resolver. Reusing those exports (preferably through shared RelatedFood lookup logic) avoids a second cache, resolution algorithm, or management request. Repeated resolution of page 1 is served from cached results or the in-flight promise. If an attached Food is not among loaded records, only the existing bounded page behavior should be used; resolving an arbitrary shallow ID is not guaranteed without loading pages, and the overlay must not crawl all Food pages.

## Why Food Is Missing From Overlay

There are two distinct omissions in sequence:

1. The selected Waypoint object that RoutePage maintains still has its raw `food_ids` property after `getOrderedRouteWaypoints` spreads it. Segments are also read directly from `route.segments`.
2. RoutePage then creates a new `mapDetail` object with an explicit set of display fields and omits `food_ids` for both entity types. `RouteMapDetailOverlay` only reads the resulting display fields and never invokes the Food cache or resolver.

Thus, **Food is missing because `food_ids` is omitted when RoutePage builds the overlay-specific `mapDetail` projection, and the overlay has no related-Food rendering/resolution step.** It is not dropped by the public Route fetch adapter or the public Waypoint ordering helper.

There is a similarly named management/editor helper worth distinguishing: `normalizeWaypoint` in `src/features/routes/routeMap/routeMapUtils.js` explicitly retains/normalizes `food_ids`; `normalizeSegment` there does not include `food_ids`. These helpers are for Route map editing and are not called by the public RoutePage selected-entity path. The Segment editor normalization omission is therefore not the cause of this public overlay behavior.

## Reusable Components / Helpers

- `RelatedFood` already implements the “Food along the way” heading, shared cache subscription, shallow-ID resolution, loading/unresolved/error UI, and manual next-page action. Its existing visual output uses full `FoodCard` components, which is too large for the map overlay.
- `publicFoodCache.js` and `publicFoodResolution.js` are the reusable public-only lookup/cache path; they should remain the only Food resolution path.
- `FoodCard` links a resolved record by public Food slug and provides a substantial card with preview, type, summary and metadata. It is not a compact overlay preview.
- `resolveAttachedVideos`, `resolveImageCollections`, and `getAttachedMediaCount` in `routeMediaUtils.js` are media helpers. The latter feeds the Waypoint map marker's media count. The overlay itself selects one image (gallery cover first, then a video thumbnail/poster) and formats video/gallery counts; none of these helpers handle Food.
- `RouteMapDetailOverlay` is the compact map summary itself. It has no dependency on entity detail-page content components beyond the media helpers invoked by RoutePage.
- Place and Story detail components (`EntityRouteContext`, `RelatedStories`, etc.) are used on child detail pages, not in the selected map overlay.

## Overlay UX Constraints

- Content order is eyebrow/title/subtitle, optional summary, optional single image preview, optional video/gallery counts, then actions. Existing primary content is intentionally brief; the image preview takes precedence over any additional image and is 140px high on desktop.
- Desktop overlay width is capped at 380px, with a map-relative maximum height and scrolling. It sits inside the map at the lower left.
- On screens below 700px it spans between small left/right margins at the bottom, with a maximum height of `min(46%, 300px)`; the preview shrinks to 110px. Any addition competes with summary, preview, counts and actions within that capped area.
- The whole `<aside>` is keyboard-activatable and clickable for “View details”; Close and Segment-only “Show full route” are nested controls that stop propagation.
- Existing overlay context covers title, entity type/order, Waypoint type or Segment endpoints, optional summary, a single media preview, and media counts. It currently has no related Food, Stories, or resolved Place section.
- A full `FoodCard`, gallery, or additional thumbnail would conflict with its compact purpose and mobile height. Any Food presentation should be one text row and avoid another large preview.

## Recommended Minimal Integration

Keep Food ownership explicit: copy only the selected child's own `food_ids` into the `mapDetail` object for Waypoints and, separately, Segments. Do not merge `route.food_ids` into either child.

Use the existing public cache and `publicRelationshipIds`/`resolvePublicFoodIds` path to render a single compact, text-only Food row in the overlay. The suitable pattern is **Food count + first resolved Food title** (for example, “2 Foods · [first title]”), with the title linking to its public Food slug. For one item, the count naturally reads as singular. This communicates that more than one item is attached without adding a card or preview image. Reuse the lookup state/logic already used by `RelatedFood` rather than creating another cache, API path, or resolver; preserve bounded page loading and an honest loading/unresolved state.

This recommendation is based on the existing overlay density: it already has an optional summary, one relatively tall media preview, media counts and actions, while the mobile overlay is capped at 300px. A single text row is the smallest useful addition.

## Risks / Pagination / Resolution Concerns

- The Route-level RelatedFood section resolves Route IDs, not Waypoint/Segment IDs. It may incidentally have seeded the shared cache with matching Food records, but that is not guaranteed and does not make Route Food applicable to the child.
- A shallow ID can remain unresolved if its Food is outside the loaded public pages, unpublished, or lacks a usable slug. Do not imply that every `food_ids` entry is already hydrated.
- Do not fetch all Food pages when a selected overlay opens. The current catalog resolution is paginated and intentionally bounded; later pages are manual.
- The shared cache deduplicates same-query page requests. A separate overlay-local API call/cache would risk duplicate requests and inconsistent stale/invalidation behavior.
- Do not use management Food APIs for public rendering.
- Do not assume Route Food is the union of Waypoint or Segment Food. Current public frontend code exposes each owner's independent `food_ids`.
- The backend serializer source is not in this checkout. Confirm its actual public child fields before implementation if the deployed response differs from the properties the current public pages consume.
- `getOrderedRouteWaypoints` filters out children without matching `route_id` or a string `id`; changing that filter is outside this Food omission and is not recommended as part of this integration.

## Files That Would Need Changes

For the recommended compact integration, the likely frontend changes are:

- `src/pages/RoutePage.jsx`: pass each selected child's own `food_ids` through the display projection.
- `src/features/routes/components/RouteMapDetailOverlay.jsx`: render the compact Food summary for available resolved related data.
- `src/features/food/RelatedFood.jsx` and likely a small shared Food lookup hook/helper under `src/features/food/`: share the existing cache subscription, ID normalization, resolution and bounded loading logic with the overlay without using the full-card presentation.
- `src/features/map/map.css`: style the compact row using a small amount of the existing card space, including mobile behavior.
- Related frontend tests for RoutePage/map overlay and shared Food resolution/rendering.

No backend change is indicated by this audit. If the API shape or behavior is found to differ from the frontend expectations documented above, that should be treated as a separate contract investigation before implementation.

## Audit Summary

1. **Exact reason Food is missing:** RoutePage builds a reduced `mapDetail` object without the selected child's `food_ids`, and the overlay does not resolve or render Food.
2. **Do `food_ids` already reach the overlay?** No. They are present on the selected Waypoint data (preserved by the public ordering helper) but are absent from the object passed as `detail`. For Segment, the raw segment list is passed through until RoutePage builds the same kind of reduced projection; its `food_ids` are also omitted there.
3. **Does normalization drop them?** Not on the public RoutePage path: Waypoints are spread-copied, and Segments are not normalized there. The separate management `normalizeSegment` helper omits them, but it is not the cause. Management `normalizeWaypoint` retains them.
4. **Source of “Food along the way”:** `Route.food_ids` on Route detail. Waypoint and Segment detail pages separately use their own IDs. There is no aggregate across Route children in the audited frontend path.
5. **Can the existing Food resolver be reused?** Yes. Reuse the singleton public cache, subscription, `publicRelationshipIds`, and `resolvePublicFoodIds`; this avoids management APIs and duplicate resolution paths. Keep to the existing bounded page behavior rather than fetching all pages.
6. **Recommended compact presentation:** One text-only row with Food count and the first resolved Food title, linked by its public slug. No Food thumbnail/card.
7. **Files likely to change:** `RoutePage.jsx`, `RouteMapDetailOverlay.jsx`, shared Food lookup logic alongside `RelatedFood.jsx`, `map.css`, and the corresponding frontend tests. No backend file is included.
8. **Audit path:** `docs/.audit/offward-route-map-overlay-food-audit.md`.

## Implementation Follow-up

Implemented on 2026-10-08. No backend code or public Food API was changed.

- `RoutePage` now includes a safely normalized `foodIds` array in each selected overlay detail. Waypoint details use only `waypoint.food_ids`; Segment details use only `segment.food_ids`. Route IDs, sibling child IDs and Country Food are not merged.
- Added `useRelatedFood` as a small shared hook for the existing singleton public Food cache subscription, `publicRelationshipIds`, `resolvePublicFoodIds`, and bounded page loading. The existing `RelatedFood` component now uses this hook and retains its full-card layout and load-next-page control.
- The map overlay renders a compact, text-only Food row: a small FOOD label, first resolved title, and a count/“+N more” when applicable. It adds no thumbnail, recipe, summary, or FoodCard.
- The first resolved record links to its actual public `/food/:slug` path. The link stops click propagation so it does not activate the containing Waypoint/Segment overlay.
- Waypoint Food is isolated to that Waypoint's IDs. Segment Food is isolated to that Segment's IDs; Segment endpoint title/subtitle resolution is unchanged.
- Initial lookup reuses the existing cache request/deduplication. Loading is shown subtly without blocking other overlay content. Partially resolved lists display the resolved count and title plus the unresolved count, without showing unresolved UUIDs or inventing Food links.
- Further public catalog pages are not fetched automatically. When more pages may exist, a compact “Check next page” control loads just the next bounded page; errors offer a retry. The full RelatedFood page section retains its existing behavior.
- Food row styles are scoped to the route map overlay and allow title wrapping on narrow screens. Existing media, summary, controls, map selection, hover and map behavior remain unchanged.
- Added focused server-rendered overlay coverage for resolved Food links and bounded unresolved behavior.

### Implementation Report

1. **RoutePage changes:** Added normalized selected-child `foodIds` to both Waypoint and Segment `mapDetail` projections.
2. **Overlay changes:** Added compact related Food output, count/status text, explicit next-page/retry action, and retained existing overlay fields/actions.
3. **Shared Food lookup/helper changes:** Added `useRelatedFood`; refactored `RelatedFood` to use it while retaining its existing full-card UI.
4. **Waypoint behavior:** Resolves and displays only the selected Waypoint's own Food IDs.
5. **Segment behavior:** Resolves and displays only the selected Segment's own Food IDs; endpoint display logic is unchanged.
6. **Food link behavior:** Uses the resolved Food's real slug in a React Router link and stops click propagation to the containing overlay.
7. **Unresolved/loading behavior:** Shows subtle loading/error/unresolved text, never displays unresolved IDs, keeps paging bounded, and requires explicit user action to load another page.
8. **CSS changes:** Added small scoped label/link/status styles with wrapping support; no large preview or card was added.
9. **Files changed:** `src/pages/RoutePage.jsx`, `src/features/routes/components/RouteMapDetailOverlay.jsx`, `src/features/routes/components/RouteMapDetailOverlay.test.js`, `src/features/food/useRelatedFood.js`, `src/features/food/RelatedFood.jsx`, `src/features/map/map.css`, and `docs/.audit/offward-route-map-overlay-food-audit.md`.
