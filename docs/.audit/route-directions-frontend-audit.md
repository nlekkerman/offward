# Route Directions Frontend Audit

**Scope:** Read-only audit of the public Route detail/map, shared map components, location and navigation functionality, and Route waypoint API handling. No implementation, tests, builds, or lint were run.

## Executive summary

The public Route detail already loads Route Waypoints and includes a UI labeled **“Directions to start.”** That control currently starts browser location tracking, adds a current-position marker and accuracy circle, highlights the selected start marker, and fits the map to include the user and start. It does **not** calculate a route, draw directions from the user to the start, or open an external navigation service.

The documented Route detail contract supplies ordered Waypoints directly, including `type` and `coordinates: { lat, lng }`; no additional Waypoint request or response normalization is needed when the endpoint honors that contract. The frontend currently selects the first `type === "start"` in the raw detail array. It should not silently do this when there are multiple starts: require exactly one valid, Route-owned start and handle zero or multiple candidates as unavailable/ambiguous.

Since the existing Leaflet map has no routing engine, the minimal way to provide actual directions is to reuse the existing location flow and offer an external directions link targeting the canonical start coordinates. No routing provider or API is currently present.

## Relevant files and existing functionality

| File | Relevant behavior |
|---|---|
| `src/pages/RoutePage.jsx` | Loads public Route detail; orders/filter Waypoints for display; resolves the start; renders the Route map and “Directions to start” control; handles missing start and location errors. |
| `src/services/routesApi.js` | `getPublicRouteBySlug(slug)` requests `/api/offward/routes/{slug}/`, checks the response is an object, maps 404 to `null`, and otherwise returns the response data without normalizing Waypoints. |
| `src/features/map/components/MapView.jsx` | Shared React Leaflet map; composes tile, Route, Segment, Waypoint and Place layers, viewport/resize controllers, and caller-supplied map children. Leaflet’s default zoom and attribution controls remain enabled. |
| `src/features/map/components/RouteLayer.jsx` | Renders accepted Route `geometry` as GeoJSON. |
| `src/features/map/components/SegmentLayer.jsx` | Renders Route Segment geometry. |
| `src/features/map/components/RouteEndpointLayer.jsx` | Renders public Waypoint markers and can highlight the Waypoint whose ID is supplied as the directions start. |
| `src/features/map/components/RouteDirectionsLayer.jsx` | Reuses the location hook; renders the current-position marker and accuracy circle; fits the map to the user and start. It does not render a connecting path or directions. |
| `src/features/map/mapGeometry.js` | Validates Route geometry and Waypoint coordinates. Waypoint display marker type can fall back to the first ordered Waypoint when an explicit type is absent; this is a display convention, not a canonical-start rule. |
| `src/shared/hooks/useUserLocation.js` | Browser Geolocation API integration using `watchPosition`, validation of returned coordinates, cleanup with `clearWatch`, and readable unsupported/permission/unavailable/timeout errors. |
| `src/features/routes/components/RoutePlacesAlongRoute.jsx` | Resolves linked Places from the public Place catalog and links to canonical `/places/:slug` pages. This is entity navigation, not map directions. |
| `src/features/map/tileConfig.js` | OpenStreetMap tile URL and attribution. |
| `src/index.css` | Styles the existing Route directions button and feedback. |
| `docs/OFFWARD_MAP_API_IMPLEMENTATION_CONTRACT.md` | Documents the Route detail and Waypoint response shape, Waypoint ordering, and the scoped start/finish authoring invariant. |

The map uses **Leaflet / React Leaflet** with OpenStreetMap tiles. On a public Route, `RoutePage` passes the Route’s accepted GeoJSON geometry, Segments, and Waypoints to `MapView`. The public Route map does not pass Places to the shared Place layer.

## Route start data contract

- **Start type:** Yes. The Waypoint response includes `type`; `start` is one of the documented values (`start`, `via`, `stop`, `finish`).
- **Coordinates:** `waypoint.coordinates.lat` and `waypoint.coordinates.lng`. The public detail contract describes `lat`/`lng` values derived from Waypoint latitude/longitude. Route geometry is a separate GeoJSON object using `[longitude, latitude]`.
- **Where loaded:** `getPublicRouteBySlug` returns the full Route detail object. `RoutePage` stores that object and reads its nested `route.waypoints` array. The Route detail contract explicitly includes ordered Waypoints.
- **Extra requests:** None for the Route start. `RoutePage` separately loads Countries for Route metadata; Places and media may have their own unrelated catalog requests.
- **Normalization:** The service returns the detail response directly. For map display, `getOrderedRouteWaypoints` filters Waypoints to the current Route ID and string ID, normalizes/falls back the order value, and sorts ascending. Map validation requires numeric, in-range `coordinates.lat`/`coordinates.lng`. Start resolution separately checks numeric, finite, in-range coordinates and does not coerce strings.
- **Missing or invalid start:** The current page disables the control and displays an unavailable message when it cannot find a valid, explicitly typed start. It must not use the display-layer fallback that treats the first Waypoint as a start.
- **Multiple starts:** The API contract’s “exactly one start and finish” rule applies to authored Routes used for geometry authoring/candidate calculation; it is not a guarantee for every publicly renderable or imported Route. The public contract does not prescribe a canonical choice among multiple starts. Current frontend code uses `.find(...)` on the raw Waypoint array and silently chooses the first typed start (while the map can display multiple start markers). For directions, treat multiple valid starts as ambiguous/unavailable rather than choosing by array order; correct the Route data if directions are required.
- **Ownership consistency:** Display Waypoints are filtered by `route_id === route.id`; the current start lookup is not. A start candidate should be checked against the same Route ownership before it is used.

## Location, map, and navigation capability

### Reusable location functionality

`useUserLocation` calls `navigator.geolocation.watchPosition` (not `getCurrentPosition`) with high accuracy, a 15-second timeout, and a 5-second maximum age. It validates latitude/longitude, retains reported accuracy when valid, and clears the watcher on stop, error, or unmount. It does not query the Permissions API or separately distinguish a permission prompt from a granted permission; browser geolocation errors are surfaced as permission-denied, unavailable, timeout, or generic feedback.

`RouteDirectionsLayer` mounts this hook only while the Route directions mode is active. When a position arrives, it displays “You are here,” optionally draws an accuracy circle, highlights the start through the waypoint layer, and fits the map to both coordinates once. Stopping directions clears the watcher and removes the location display.

### Directions and entity navigation

- **Current-position marker:** Yes, in the Route directions map mode.
- **Location watching:** Yes, via `watchPosition`; it is cleared when the mode stops or unmounts.
- **In-app routing/directions service:** No.
- **Route from current position to start:** No. No connecting leg or turn-by-turn route is produced; the published Route geometry remains the only path drawn.
- **External navigation links:** No Google Maps, Apple Maps, or other directions URL was found in the frontend.
- **Navigation to Places:** Yes, linked Places use their canonical `/places/:slug` pages. This does not launch directions.
- **Navigation to a Route start:** No external navigation is performed. The existing “Directions to start” control only changes the map/location display.

`MapView` has Leaflet’s default zoom and attribution controls and shared viewport/resize behavior. The Route-specific Sections control and detail overlay are separate UI layers; none is a routing control.

## Edge cases and behavior gaps

1. **No Waypoints or no typed start:** The current control is disabled and explanatory feedback is shown. Preserve this graceful behavior.
2. **Invalid start coordinates:** The current resolver rejects non-numeric, non-finite, or out-of-range values; no first-Waypoint fallback is used for directions.
3. **More than one start:** Current resolution silently takes the first raw-array match. Reject ambiguity instead; public read data is not guaranteed to satisfy the candidate-generation invariant.
4. **Waypoint belongs to another Route:** Display filtering checks `route_id`, but start resolution does not. Apply the ownership check to the canonical candidate too.
5. **Location unavailable or denied:** Existing geolocation feedback stops the active mode and is shown in the Route controls.
6. **No accepted Route geometry:** The user/start map fit and markers can still work because Waypoints are independent of renderable Route geometry; there is no actual direction path to fall back to.
7. **External-link popup restrictions:** If the app waits asynchronously for browser location before opening a new tab, the browser may block that popup. A visible link/action rendered after location is obtained avoids relying on an asynchronous `window.open`.
8. **External service unavailable or not installed:** A web directions URL should remain usable in a browser and may be handed off by the device to an installed navigation app; the current frontend has no such fallback because it has no external navigation link.

## Recommended minimal implementation

Use an **external navigation service**, not the existing map as a routing engine: the Leaflet map is provider-neutral display only and contains no routing capability. Do not add a routing API/provider dependency.

Keep the current location acquisition/error handling and the published Route map. Resolve exactly one valid, Route-owned, explicitly typed start waypoint. Once the user’s location is available, expose an explicit external directions link with the current coordinates as origin and the canonical start’s `lat,lng` as destination. This avoids guessing a start and avoids opening a new tab from an asynchronous geolocation callback. If location fails, retain the existing error feedback and do not present a link with a fabricated origin. If the start is absent, invalid, or ambiguous, keep directions unavailable with clear feedback.

The current label “Directions to start” can initiate location acquisition, but should make clear that the external directions link becomes available after location is obtained. If the intended UX instead opens an external service immediately and lets that service resolve device location/permissions, the implementation should not request or watch location in the Offward page; that would be a deliberate behavior change from the current flow.

## Exact files likely to require changes

**Likely minimal changes:**

- `src/pages/RoutePage.jsx` — require exactly one valid, Route-owned start; adapt the existing control/feedback to expose the external directions action using the acquired origin and start destination.
- `src/features/map/components/RouteDirectionsLayer.jsx` — make the acquired position available to the Route detail integration (the current callback signals readiness without passing coordinates), unless the navigation link is composed inside the layer.
- `src/index.css` — style the external directions action and its ready/unavailable feedback if the existing control styles do not cover it.

**Reuse without expected changes:** `src/shared/hooks/useUserLocation.js`, `src/features/map/components/MapView.jsx`, `src/features/map/components/RouteEndpointLayer.jsx`, and `src/services/routesApi.js`, assuming the public detail response continues to satisfy the documented contract.

## Backend blockers

No backend change is required by the documented response shape: Route detail already includes ordered Waypoints with explicit type and `{ lat, lng }` coordinates, and the frontend already consumes that detail endpoint. The contract intentionally allows publicly renderable saved/imported Routes without Waypoints and limits its exactly-one-start rule to authored geometry/candidate workflows; therefore, a public Route may legitimately have no start for this feature.

If the deployed endpoint omits nested Waypoints, returns a different coordinate shape, or emits multiple starts, that is an API/data compatibility issue to resolve before reliably enabling directions. The frontend must not infer the canonical start from the first Waypoint or from Route geometry.
