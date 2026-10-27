# Offward Frontend Place Directions & Alternatives Audit

**Audit date:** 2026-10-26  
**Scope:** Read-only inspection of public Place directions, map rendering, saved access geometry, location tracking, analytics, and the current Route alternatives implementation. No application code, backend code, tests, builds, lint, or dependencies were changed or run.

## Executive summary

There was no existing Place Directions alternatives audit. The existing [OFFWARD_PLACE_FRONTEND_AUDIT.md](./OFFWARD_PLACE_FRONTEND_AUDIT.md) is a broader management/content audit and does not document public Place navigation; its summary that public Place detail lacks media is no longer current, as [PlacePage.jsx](../../src/pages/PlacePage.jsx) now includes media and relationship sections.

The more recent [OFFWARD_LIVE_ROUTE_FOLLOWING_AUDIT.md](./OFFWARD_LIVE_ROUTE_FOLLOWING_AUDIT.md) does cover Place navigation. Its findings that Place uses the shared location hook and marker, displays the manually authored access path during Directions, and routes only to the marker when needed were confirmed against current code. Its claims that Place has no Recenter control and hard-codes following off are stale: current `PlacePage` renders Recenter when a position exists, toggles `locationFollowing`, and passes that state to both `MapView` and `RouteUserLocationLayer`. The older [route-directions-frontend-audit.md](./route-directions-frontend-audit.md) concerns Route navigation and its described controls and flow do not match the current implementation.

Place Directions currently requests one provider-calculated LineString from `POST /api/offward/places/{slug}/directions/` for Walking or Driving. The frontend validates the primary geometry and distance, but neither defines nor validates an alternatives array. No multiple Place paths can be safely displayed unless the backend adds and documents a response contract for them.

When a Place has a valid saved access LineString and access marker, the map keeps that manually authored path separate from the provider route to the marker. The manual geometry is not a routing-provider alternative and must remain unchanged. A direct-on-map alternative experience is feasible inside the existing [PlaceDirectionsLayer.jsx](../../src/features/map/components/PlaceDirectionsLayer.jsx), with a selected-path information overlay inside [MapView.jsx](../../src/features/map/components/MapView.jsx). This should be limited to validated provider walking approaches; Driving and the saved access path should retain their current behavior and visual identity.

## 1. Current Walking and Driving flow

### Place with saved access geometry and marker

`PlacePage` accepts a saved access path only when `place.access_geometry` is renderable as a LineString and the access start latitude/longitude are valid. These form the `hasManualAccessPath` condition.

1. Activating the existing Directions button records one `directions` interaction, clears the prior journey state, enables Directions, and starts the shared `useUserLocation` watcher if it is not active.
2. After a GPS position is available, `PlacePage` captures one `directionsOrigin`, calculates the straight-line distance to the saved access marker, and chooses a journey:
   - At 1 km or less: it chooses Walking and the `walking` phase. No provider route to the marker is requested; the visitor is expected to walk the saved path from the current vicinity to the Place.
   - Beyond 1 km: it chooses Driving and the `driving` phase, which requests a provider route to the access marker.
3. Walking/Driving buttons are shown only under the existing `PlacePage` condition. The initial marker distance and journey phase affect whether they are available. In the Driving phase, **Start Walking** advances to `walking-after-driving`.
4. If explicitly switched to Walking while navigating to the access marker, the phase is `walking-to-marker`; the provider is asked for a Walking route to the marker. When the watcher reports a position within 35 m of that marker with accuracy no worse than 35 m, `PlaceDirectionsLayer` advances the journey to `walking-after-driving`.
5. In Driving or `walking-to-marker`, the provider-calculated route is the first leg to the access marker. The separately saved access LineString is the walking leg from that marker to the Place.

The service call receives the captured origin, not every subsequent GPS fix. Provider requests are keyed by Place slug, captured origin, and profile. The layer caches successful routes by profile for that origin, guards displayed results against stale profile requests, and aborts in-flight requests when Directions ends or the component unmounts. It does not stop and restart the GPS watcher when the travel mode changes.

### Place without valid saved access geometry and marker

`PlacePage` instead renders the shared [RouteDirectionsLayer.jsx](../../src/features/map/components/RouteDirectionsLayer.jsx) with a custom request callback to `getPlaceDirections`. Walking and Driving controls are available while Directions is active.

- The layer waits for the current location and requests directions to the Place using the selected profile.
- It applies the existing 30 km straight-line limit to the Place start point.
- The response becomes one non-interactive blue directions polyline.
- Mode changes cause a new request. The shared location watcher remains in use.

The existing Place Directions control, You, Track, Recenter, mode controls, status feedback, and error display remain in the Place map heading/secondary controls. Track and Directions are separate actions; directions activation and deliberate Track starts use the existing first-party analytics calls.

### Loading, errors, and location

`PlacePage` displays locating/routing statuses and location errors and offers location retry. The Place directions service maps common HTTP errors to visitor-safe messages, including missing Place, invalid coordinates, too-far origin, rate limiting, service unavailable, and timeout. A successful response that fails validation throws `Offward returned an invalid directions response.`

`useUserLocation` wraps browser geolocation, validates coordinates, stores accuracy/timestamp/speed where available, and uses `watchPosition` for continuous tracking. `RouteUserLocationLayer` draws the current location and accuracy circle; the visitor marker has a red dot and “You are here” label. The watcher stops when neither Directions nor independent Track is active, and on Place change/unmount.

## 2. Existing Place map architecture

- [PlacePage.jsx](../../src/pages/PlacePage.jsx) loads public Place details, derives valid Place/access geometry and coordinates, controls Directions/Track/mode/journey state, and composes the map.
- [MapView.jsx](../../src/features/map/components/MapView.jsx) provides the shared React Leaflet `MapContainer`, active basemap tiles, Place/Route/Segment/Waypoint layers, map viewport/resize controllers, basemap control, and caller-supplied map children.
- [PlaceLayer.jsx](../../src/features/map/components/PlaceLayer.jsx) renders the Place marker and optional label. `PlacePage` identifies the current Place as selected and as the directions destination.
- [PlaceDirectionsLayer.jsx](../../src/features/map/components/PlaceDirectionsLayer.jsx) renders the saved access path, provider route to the access marker, separate access marker/popup, phase arrival check, and initial bounds fitting for Places with manual access.
- [RouteDirectionsLayer.jsx](../../src/features/map/components/RouteDirectionsLayer.jsx) is reused for Places without a manual access path by injecting a Place directions request callback.
- [RouteUserLocationLayer.jsx](../../src/features/map/components/RouteUserLocationLayer.jsx) renders the visitor position/accuracy circle and handles follow/recenter map positioning.
- [routeDirectionsApi.js](../../src/services/routeDirectionsApi.js) posts Place requests and validates the response.
- [map.css](../../src/features/map/map.css) styles map markers and basemap/map overlays. [index.css](../../src/index.css) styles Place map controls, feedback, and the journey summary.

There is no current control for selecting between multiple provider paths. The directions line is not clickable. The access marker has a popup; the Place marker has its existing selected/directions-active style and label. Leaflet layer z-order currently places the custom directions pane above overlays and the visitor marker uses a high marker z-index.

## 3. Manually saved Place access geometry

For Places with a valid saved access LineString and valid access marker:

- The saved LineString is converted from GeoJSON `[longitude, latitude]` to Leaflet `[latitude, longitude]` positions and rendered unchanged from `place.access_geometry`.
- It uses a solid orange `#e28a3b` line with a dashed pattern (`10 9`) and 5 px weight.
- The saved access marker uses a distinct orange marker icon and opens a popup containing the authored name/description.
- The actual Place uses `PlaceLayer`; while Directions is active, its marker is red (`#ff3838`) and its label can be shown.
- The current visitor marker is red (`#d9232e`) with a light border, optional accuracy circle, and “You are here” label.
- The provider route to the access marker is rendered as teal (`#65c8ad`) for Walking or blue (`#438bd1`) for Driving, solid and 6 px wide.

The provider directions response validator allows an optional walking `access` LineString on a Driving response, but the current manual-access layer does not render that response field. Its saved access path remains the Place’s authored geometry, separate from the provider route. It must not be relabeled, counted, modified, or treated as an ORS alternative.

The public journey summary explains each leg, identifies the solid provider leg and orange dashed saved leg, and displays the approximate saved-path length. In phases where the visitor is only walking the saved path, the visitor-to-marker route is intentionally not displayed.

## 4. Proposed direct-on-map alternatives experience

When backend-supported Place Walking Directions provide multiple validated provider approaches:

1. Retain the current Directions button, Walking/Driving controls, watcher, and request lifecycle. Store every validated approach from the one response in the Place directions layer.
2. Render all provider Walking approaches immediately as Leaflet polylines in the current map window. Do not add an Alternative paths button, selector, menu, or modal.
3. Make each approach polyline interactive. A tap/click updates only local selected-path state, without changing mode, request key, GPS lifecycle, analytics, or Place geometry.
4. Render each approach with a distinct high-contrast color. Keep the manual access path orange dashed and visually separate; avoid colors too close to its orange or the red Place/current-location markers. For instance, a future palette could use bright cyan, violet, and yellow-green for provider paths. Distinguish states beyond color: use a thicker, opaque solid selected/recommended line and thinner or patterned lower-opacity unselected lines. Check contrast on all supported basemaps before finalizing colors.
5. Provide a compact, always-visible-in-session overlay inside the map container identifying the selected path (Recommended or Alternative N), whether it is recommended/selected, and the actual backend-supplied walking distance and optional duration. Keep it clear of the existing top-right Sections control and bottom-left basemap control. Hide it when Directions ends.
6. Fit initial map bounds to the captured origin and all returned approach coordinates once per request/response, alongside any necessary Place/access marker coordinates. Do not refit on every GPS fix or path selection.

For Places with a saved access path, alternatives must describe the provider-calculated leg **to the access marker**, not the saved marker-to-Place LineString. Preserve the existing manual access line and the two-leg journey explanation. If the current journey phase does not request a provider route (the within-1-km `walking` phase), do not show alternatives unless the backend contract explicitly defines a different target and frontend flow.

For Places without a saved access path, the shared `RouteDirectionsLayer` currently renders one line. Although it can be reused as the geometry renderer, it currently recognizes alternatives only for its Route `destination === 'access'` flow, which PlacePage does not use. Integrating Place alternatives there would require a Place-specific opt-in/response interpretation; do not infer Route alternatives from Place fields or silently activate Route-specific behavior.

## 5. Zero, one, and multiple paths

- **No backend alternatives / one primary path:** Keep the current one-line behavior, with the overlay identifying the recommended path if that presentation is enabled for the supported response. No extra path or fake alternative should be generated.
- **One returned alternative:** Show the recommended approach and that one alternative, each with its own backend distance and optional duration.
- **Two returned alternatives:** Show the recommended approach and both alternatives; label alternatives in response order (Alternative 1, Alternative 2), unless a finalized contract specifies a different display ordering.
- **Malformed alternatives:** Reject or omit only according to a finalized API contract and explicit product behavior. Do not draw invalid geometry, use the saved path as a replacement, or fabricate fallback paths. The current Place validator has no alternatives validation and would need a strict schema extension before display.

The existing primary response contract verified in frontend code requires a matching requested profile (or the supported composite Driving response), a valid LineString geometry, and a finite non-negative `distance_km`; optional `access` geometry is checked if present. It does not validate or expose `duration_seconds` for Place responses.

## 6. Backend API dependency

The current frontend request is:

```text
POST /api/offward/places/{encoded-slug}/directions/
{
  "origin": { "lat": number, "lng": number },
  "profile": "walking" | "driving"
}
```

No Place-specific alternatives response contract is present in the frontend repository, and the validator does not require or validate `alternatives`. No exact response item fields, count, IDs, duration shape, ordering, fallback behavior, or profile support should be assumed from the Route contract. A backend/API owner must define these before implementation. Preserve the current Driving behavior unless that finalized contract explicitly changes it.

To add the experience safely, the backend contract must specify which Place walking request phases return alternatives (direct Place versus access-marker target), how many approaches may be returned, their validation fields and duration semantics, and how primary/recommended geometry relates to the alternatives. Frontend deployment must not assume an older backend has the extension; it should follow the agreed compatibility/deployment strategy rather than silently treating a missing required field as an empty list.

## 7. Route alternatives comparison and reusable concepts

The current Route implementation is in [RouteDirectionsLayer.jsx](../../src/features/map/components/RouteDirectionsLayer.jsx), [RoutePage.jsx](../../src/pages/RoutePage.jsx), [MapView.jsx](../../src/features/map/components/MapView.jsx), and [map.css](../../src/features/map/map.css). It:

- validates a response-level list of alternatives in the Route API service before rendering;
- converts each returned GeoJSON LineString to Leaflet positions;
- shows all recommended/alternative polylines together, with distinct colors and selected/unselected weights, opacity, and dash styling;
- uses a wider, transparent Leaflet polyline as a touch target and handles click/tap locally;
- keeps response geometry in the directions layer and selection in RoutePage state;
- shows the selected name/distance/optional duration in an overlay inside MapView;
- fits the initial bounds once, guarding against repeated GPS-driven fitting;
- leaves the shared watcher and arrival detection independent from path selection.

These are useful behavioral patterns, not drop-in Place integration: Route API validation, Route request keys, and the Route-specific `destination === 'access'` distinction do not describe the Place API or journey phases. Do not refactor or move Route code solely for reuse.

## 8. Mobile usability considerations

- Use a large transparent clickable Leaflet stroke so narrow lines are selectable by touch, and keep the rendered stroke visible enough to distinguish nearby paths.
- Native Leaflet click events support touch; prevent path event bubbling from triggering unrelated map/entity interactions.
- Keep the map overlay compact, legible at narrow widths, and clear of basemap controls, Sections, Place/access markers, and attribution. Avoid obscuring the Place label or the selected approach when practical.
- Expose selected and recommended status with text/accessible announcements as well as color/line styling. Do not announce GPS updates.
- Preserve current mobile map sizing and the existing full-width responsive directions controls.
- Map line selection is inherently spatial; if paths overlap exactly, the frontend cannot make each line independently tappable at that segment. Test overlapping and near-overlapping approaches on real touch devices after implementation.

## 9. Exact files potentially affected by a future implementation

No application files were changed for this audit. A minimal implementation would likely touch:

- [src/services/routeDirectionsApi.js](../../src/services/routeDirectionsApi.js) — validate the finalized Place alternatives contract and optional valid duration(s).
- [src/features/map/components/PlaceDirectionsLayer.jsx](../../src/features/map/components/PlaceDirectionsLayer.jsx) — retain response approaches, draw/select the multiple provider Walking lines, and fit their combined bounds once; keep saved geometry and Driving route separate.
- [src/features/map/components/RouteDirectionsLayer.jsx](../../src/features/map/components/RouteDirectionsLayer.jsx) — only if the Place-without-manual-access path remains on this shared layer; add narrowly scoped support without changing Route behavior.
- [src/pages/PlacePage.jsx](../../src/pages/PlacePage.jsx) — hold selected approach metadata and provide the map overlay without changing Directions/Track activation or analytics.
- [src/features/map/components/MapView.jsx](../../src/features/map/components/MapView.jsx) — only if a map-resident overlay capability is not otherwise available or already suitable.
- [src/features/map/map.css](../../src/features/map/map.css) and/or [src/index.css](../../src/index.css) — overlay layout, selected-state line styles, and mobile adjustments.

## 10. Smallest safe implementation plan

1. Agree and document the Place alternatives API contract with backend, including which Walking journey target(s) it applies to and optional duration fields. Do not infer from the Route contract.
2. Extend only the Place response validation for the agreed Walking shape; preserve current primary, Driving, and optional composite access validation.
3. In `PlaceDirectionsLayer`, display provider approaches only for the response and phase defined by that contract. Keep saved `access_geometry` as its own unchanged orange dashed leg. Preserve the existing cache, stale-result guard, abort lifecycle, and mode behavior.
4. For the no-manual-path flow, wire the same visual interaction narrowly into the current Place use of `RouteDirectionsLayer`, or use an equivalent Place-scoped renderer; do not alter Route behavior or duplicate the Directions activation system.
5. Keep selected path local to the active response. Render all approaches; apply selected/unselected styling; display selected distance/duration in an in-map overlay; fit bounds only when the response geometry first arrives.
6. Verify Directions/Track analytics, location watcher reuse, mode switching, request cancellation/cache behavior, saved geometry, zero/one/multiple paths, error/loading states, overlapping paths, and mobile controls after implementation.

## Verification performed for this audit

- Read the existing Place frontend audit and Route directions audit; neither is a current Place Directions alternatives audit.
- Inspected the current Place page, Place and Route directions layers, shared MapView, Place marker layer, location hook/marker, API validation/error mapping, and relevant CSS.
- No application or backend files were changed. No tests, builds, or lint were run.
