# Offward Frontend Public Pagination Audit

## Backend Contract

The public list endpoints now return a pagination envelope:

```json
{
  "count": 0,
  "next": null,
  "previous": null,
  "results": []
}
```

`GET /api/offward/routes/` and `GET /api/offward/places/` default to `page_size=12`, accept `page` and caller-selected `page_size`, and cap `page_size` at 24. Supported filters are applied before pagination. Route geometry remains omitted unless `include_geometry=true`. No general map-bounds query is part of the stated contract.

## API Helpers

- `src/services/routesApi.js` implements `getPublicRoutes`; it sends `status`, `country`, `activity_type`, and `include_geometry`, but not `page` or `page_size`. It requires a bare array and throws for any other shape. Its default requests geometry.
- `getRoutes` is a direct alias to `getPublicRoutes`, so it has the same contract and failure mode. No other frontend call site for this alias was found.
- `src/services/placesApi.js` implements `getPublicPlaces`; it sends the optional `country` filter, but not `page` or `page_size`. It requires a bare array and throws for any other shape.
- `getPublicRouteBySlug` and `getPublicPlaceBySlug` are detail helpers, not list consumers; their detail handling is not affected by this contract change.
- No other direct request to either public list URL was found in `src/`. The repository has no frontend `*.test.*` or `*.spec.*` files.

## Route Consumers

| path | consumer | purpose | current behavior | raw-array assumption? | pagination needed? | geometry needed? | required change |
|---|---|---|---|---|---|---|---|
| `src/features/explore/useExploreData.js` | `useExploreData` | Explore route results and map data | Calls `getPublicRoutes` with country/activity/status filters; helper expects an array. Explore slices the fetched collection in `ExplorePage`. | Yes, helper guard and hook state expect an array. | Yes for the user-facing growing Explore list; only request the next page on explicit Load more. | No in list mode; yes for Route map mode. | Return and store the pagination envelope, request bounded pages, append next-page results, and request geometry only in Route map mode. |
| `src/features/home/LatestContentRail.jsx` | `loadLatestRoute` | Home latest-content preview, including mini-map card | Requests the entire Route list with geometry and selects index zero. It assumes helper returns an array. | Yes (`routes[0]`). | No; a bounded first page is sufficient. | Yes, for the mini-map card. | Request a bounded first page with geometry explicitly enabled. Do not claim chronological latest ordering because the Route summary lacks a timestamp and the API contract does not specify an ordering parameter. |
| `src/pages/StoryPage.jsx` | `loadRoutes` and related Route-ID catalog | Resolve Story-attached Route IDs to public Route summaries | Requests the public Route list without geometry and stores/maps the returned array. It currently relies on fetching all routes to match arbitrary IDs. | Yes, state and later `Map` construction expect an array. | Not a user-facing list; exact matching can require records beyond the first page. | No. | Use explicit pagination-envelope results. A bounded page cannot guarantee all Story Route IDs resolve; do not silently crawl every page. Document the missing server-side ID lookup/filter as an API limitation. |
| `src/pages/RoutePage.jsx`, `src/pages/SegmentDetailPage.jsx`, `src/pages/WaypointDetailPage.jsx` | detail loaders | Fetch an individual Route by slug | Use `getPublicRouteBySlug`, not the Route list endpoint. | No list-array assumption. | No. | Detail payload behavior is unchanged. | No list-contract change. |

## Place Consumers

| path | consumer | purpose | current behavior | raw-array assumption? | pagination needed? | geometry needed? | required change |
|---|---|---|---|---|---|---|---|
| `src/features/explore/useExploreData.js` | `useExploreData` | Explore Place results and map data | Calls `getPublicPlaces` with the country filter; Explore slices the fetched collection in `ExplorePage`. | Yes, helper guard and hook state expect an array. | Yes for the user-facing growing Explore list; only request the next page on explicit Load more. | Place coordinates are used in map mode. | Return and store the pagination envelope, request bounded pages, append next-page results, and request further pages only through Load more. |
| `src/pages/StoryPage.jsx` | `loadPlaces` and related Place-ID catalog | Resolve Story-attached Place IDs to public Place summaries | Requests the entire Place list and stores/maps the returned array to resolve arbitrary IDs. | Yes, state and later `Map` construction expect an array. | Not a user-facing list; exact matching can require records beyond the first page. | No. | Use explicit pagination-envelope results. A bounded page cannot guarantee all Story Place IDs resolve; do not silently crawl every page. Document the missing server-side ID lookup/filter as an API limitation. |
| `src/pages/WaypointDetailPage.jsx` | `loadPlaceContext` | Resolve a waypoint's `place_id` to Place context | Requests the entire Place list and calls `.find()` by ID. | Yes (`places.find`). | No visible list, but the exact Place may be on any page. | No. | Read the envelope explicitly and avoid pretending the first page is a complete catalog. The current API has no stated ID filter or Place-by-ID detail request, so complete resolution is an API limitation. |
| `src/pages/PlacePage.jsx` | detail loader | Fetch an individual Place by slug | Uses `getPublicPlaceBySlug`, not the Place list endpoint. | No list-array assumption. | No. | Detail payload behavior is unchanged. | No list-contract change. |

## Map Consumers

| path | consumer | filters available | geometry/data requirements | lazy/current behavior | recommendation and API limitation |
|---|---|---|---|---|---|
| `src/pages/ExplorePage.jsx`, `src/features/explore/useExploreData.js`, `src/features/explore/ExploreMapBrowser.jsx` | Explore map browser | Country for both types; Route activity for Routes | Route map needs Route geometry; Place map uses Place coordinates. Map rendering is country-gated. | Data fetch currently runs on ordinary Explore entry and fetches all matching records before map mode is entered. Route helper defaults `include_geometry=true`; geometry is gated in the hook by country and map mode but the normal list is still unpaginated. | Make page requests lazy with respect to geometry: ordinary Route list uses `include_geometry=false`; entering Route map mode requests geometry only for a bounded page and current filters. Keep map data paginated; do not crawl all pages. The API has no general bounds query, so a complete map may need a future bounds or map-specific API. |
| `src/features/home/LatestContentRail.jsx`, `src/features/home/LatestRouteCard.jsx` | Home mini-map on the Route preview card | No explicit country filter | Route geometry is required for the mini-map. | Loads the entire Route list with geometry merely to choose one preview. | Request only a bounded first page with geometry; do not fetch all Routes. The backend does not specify chronological ordering for this summary list. |

## Client-side Fake Pagination

- `src/pages/ExplorePage.jsx` fetches the complete matching Route/Place collection, then applies `items.slice(0, visibleCount)` and increments `visibleCount` to reveal more. This is display-only pagination and does not use server `next`.
- `src/pages/ExplorePage.jsx` determines Load more from `items.length`/`total`, with `total` currently being the length of the fully downloaded array rather than backend `count`.
- `src/features/home/LatestContentRail.jsx` chooses one Route from a full Route-list download. This is a preview requiring only a bounded first page, not a paginated list.
- `src/pages/StoryPage.jsx` and `src/pages/WaypointDetailPage.jsx` download complete Place/Route lists to resolve IDs. These are catalog lookups, not display lists; their completeness cannot be preserved by silently reading only page one, and automatic hidden all-page traversal is not recommended.
- `loadLatestVideo` also sorts/slices videos, but it does not use either Route or Place list endpoint and is outside this audit's implementation scope.

## Breaking Changes

The two list helpers reject the new envelope with a "must be a bare array" error. The affected consumers therefore fall into their error states rather than receiving results:

- `useExploreData` for both Route and Place Explore lists/maps.
- `loadLatestRoute` in `LatestContentRail`.
- Story-attached Route catalog loading in `StoryPage`.
- Story-attached Place catalog loading in `StoryPage`.
- Waypoint Place-context lookup in `WaypointDetailPage`.

The detail calls in Route, Segment, Waypoint, and Place pages are not list calls and are unaffected.

## Recommended Implementation Plan

1. Change Route and Place list helpers to return a validated, explicit `{ results, count, next, previous }` page object; pass through page, page_size, existing supported filters, and Route `include_geometry`.
2. Convert Explore to server pagination: request page 1 with `page_size=12`, do not fetch Places before Places mode is selected, reset on filter/mode changes, append only the requested next page, deduplicate overlapping results, and use `next` to control Load more.
3. Keep Route geometry off for Route list requests; request it only for bounded Route map-mode requests, without automatically traversing map pages.
4. Bound the Home Route preview request to a first page and explicitly request geometry only because its mini-map needs it.
5. Update Story and Waypoint catalog consumers to read the page envelope without representing a partial first page as a complete catalog. Since no ID lookup/filter is specified, record exact arbitrary-ID resolution as an API limitation instead of silently crawling all pages.
6. Confirm there are no remaining public Route/Place list consumers with raw-array assumptions. Validate with the existing lint/build commands because no frontend test suite is present.

## Implementation Follow-up

### Files changed

- `src/services/pagination.js` — added shared validation/normalization for the explicit pagination envelope.
- `src/services/routesApi.js` — `getPublicRoutes` and its `getRoutes` alias now return `{ results, count, next, previous }`; requests preserve `country`, `status`, and `activity_type`, and support `page`, `page_size`, and `include_geometry`.
- `src/services/placesApi.js` — `getPublicPlaces` now returns the same page contract and supports `country`, `page`, and `page_size`.
- `src/features/explore/useExploreData.js` — requests `page_size=12`, guards stale requests, tracks page metadata, and appends deduplicated next-page results only on demand.
- `src/pages/ExplorePage.jsx` and `src/features/explore/ExploreResults.jsx` — removed client-side `slice()` pagination and use the server `count`/`next` metadata for result counts and Load more.
- `src/features/home/LatestContentRail.jsx` — the Route preview requests one bounded result with geometry for its mini-map; it uses the API's current ordering and does not claim chronological ordering.
- `src/pages/StoryPage.jsx` — related Place/Route ID lookup uses bounded first pages (page size capped at 24) and envelope `results`; incomplete references are not hidden behind an all-pages crawl.
- `src/pages/WaypointDetailPage.jsx` — Place context lookup reads a bounded page's `results` and reports when another page may contain the Place.

### Behavior after implementation

- Initial Explore Routes request is page 1 with `page_size=12`, active status and `include_geometry=false`.
- Explore Places are requested only when Places mode is active, at page 1 with `page_size=12`.
- Load more is shown only when server `next` is non-null. It requests one subsequent page and appends unique records; errors allow retry and loading disables the action.
- Mode, filter, and geometry-query changes start from page 1 with empty accumulated results. Request sequencing prevents older responses from replacing current results.
- Ordinary Route list view does not request geometry. Route map mode requests geometry only when a country is selected, using current country/activity filters and the same bounded page size; additional map data is loaded only through explicit Load more.
- Home's mini-map preview requests only one Route.
- No automatic fetch-all-pages behavior was added.

### Remaining backend/API limitations

- The public lists do not specify a chronological ordering parameter, so the Home Route preview uses current API ordering.
- There is no general bounds query for map data. Explore's map can display only loaded/paginated data; a complete country/world map would require a purpose-built backend query.
- There is no stated Route/Place lookup-by-ID list filter or Place-by-ID detail endpoint. Story related references and waypoint Place context can therefore be incomplete when the ID is outside the bounded first page; callers report the possibility and do not silently fetch all pages.

### Verification

- No frontend unit-test files or test runner are present in the repository.
- ESLint passed for all changed application files.
- `npm run build` passed. Vite reports the existing large main-chunk advisory.
- Full `npm run lint` still reports pre-existing `react-hooks/set-state-in-effect` findings in unchanged `src/pages/PlacePage.jsx` and `src/pages/SegmentDetailPage.jsx`; the changed files pass targeted lint.
- A final search of `src/` found no remaining consumer treating public Route/Place list helper responses as raw arrays. Remaining public list consumers access the envelope's `results`.
