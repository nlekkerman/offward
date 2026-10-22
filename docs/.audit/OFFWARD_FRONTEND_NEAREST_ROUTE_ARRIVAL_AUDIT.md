# Offward Frontend Nearest Route Access & Arrival Transition Audit

**Scope:** Read-only audit of public Route navigation and tracking in the frontend repository. No implementation, refactoring, tests, builds, lint, analytics changes, or backend access were performed.

## Executive summary

The current public Route page has one **Directions** control, a separate **Track** control, and a Route-specific GPS arrival detector. Directions currently routes to the official Route start, not to the nearest Route point: the browser posts only the Route slug, current origin, and selected `walking` or `driving` profile; the backend is documented to select the canonical start waypoint. The returned routing-service GeoJSON is drawn as a temporary blue line on the Leaflet map. The saved Route LineString and Waypoint markers are rendered separately.

Arrival is already measured against the saved Route LineString, not the directions response endpoint. The detector requires three fresh, distinct readings with accuracy at most 20 m and distance at most 25 m from the LineString. However, it additionally requires a reported low speed for driving, which conflicts with the intended mode-independent arrival. When it fires, Directions geometry is removed and a one-time informational message is rendered; there are no arrival actions or start-tracking transition.

Nearest *geometric* Route access can be estimated from the saved LineString, but nearest geometric point, nearest waypoint, routable walking destination, and practical/legal entry point are different things. No current Route endpoint accepts a candidate destination, evaluates multiple candidate points, or returns snapping/access validation. A provider-neutral backend/API capability is needed to establish a reachable access point. The UI must not describe a geometrically closest point as safe, legal, or accessible based on geometry alone. If candidate access cannot be established, the existing official-start directions are the most compatible fallback, clearly identified as the official start.

## 1. Current public Route navigation flow

1. `RoutePage` loads the public Route detail with `getPublicRouteBySlug`. The response includes the saved `geometry` and ordered `waypoints`; the page separately validates and orders the Route-owned Waypoints.
2. The **Directions** button calls `startDirections`. If there is exactly one valid, Route-owned `type: "start"` waypoint, it records one `directions` interaction, starts or reuses the location watcher, resets the Route arrival detector, and changes navigation state to `approaching`.
3. `useUserLocation` starts `navigator.geolocation.watchPosition` with high accuracy, a 15-second timeout, and a 5-second `maximumAge`. Position objects retain latitude, longitude, reported accuracy, speed, and timestamp.
4. `RouteDirectionsLayer` waits for a position, checks that its straight-line distance to the official start is no more than 30 km, then calls `getRouteDirections(routeSlug, origin, mode, signal)`. The request can be aborted if directions are stopped, the mode changes, or the layer unmounts.
5. The directions response must contain the requested profile, a valid GeoJSON `LineString`, and a non-negative `distance_km`. Its coordinates are converted from GeoJSON `[longitude, latitude]` to Leaflet `[latitude, longitude]` and drawn as a temporary blue polyline in a dedicated Leaflet pane. Once available, the map fits the user position and this directions geometry. The layer does not request a new route for every GPS update; its mode ref suppresses duplicate requests within that mode/session.
6. In parallel, `RoutePage` processes each live position against the **saved Route LineString**. On confirmed arrival it changes state to `exploring`, enables map-follow, clears directions status, and deactivates `RouteDirectionsLayer`; deactivation aborts any pending request and clears the temporary directions result.
7. `stopDirections` changes navigation state to `idle`, restores following only if independent Track was already active, resets the selected mode to walking, and clears status. The page’s effect stops the location watcher when both Directions and independent Track are inactive. Route changes also reset arrival and stop the watcher; the hook clears it on unmount.

Directions status includes locating, routing, ready, too-far, and error states. Location permission/unavailability/timeout errors come from the hook and expose a retry action. If the Route has no valid map geometry, the page can still request directions to the official start, but the saved-route arrival detector receives no geometry and cannot confirm Route arrival.

## 2. Exact frontend files and responsibilities

| File | Relevant symbols and responsibility |
|---|---|
| `src/pages/RoutePage.jsx` | `getOrderedRouteWaypoints`, `canonicalStartWaypoint`, `handleLocationUpdate`, `startDirections`, `stopDirections`, `startFollowing`, `stopFollowing`, `retryLocation`, `handleTravelModeChange`; renders controls, `MapView`, arrival status, and map layers. |
| `src/services/routesApi.js` | `getPublicRouteBySlug`; fetches and returns public Route detail without geometry/waypoint transformation. |
| `src/services/routeDirectionsApi.js` | `getRouteDirections`, `getStraightLineDistanceKm`, `MAX_LOCAL_DIRECTIONS_KM`; validates Route slug, origin, profile, POSTs the Route directions request, and validates the response. |
| `src/features/map/components/RouteDirectionsLayer.jsx` | `RouteDirectionsLayer`, `DirectionsViewportController`; requests, aborts, converts, fits, and draws temporary approach geometry. |
| `src/features/map/components/MapView.jsx` | `MapViewContent`; composes the saved Route, waypoint, segment, location, directions, viewport, and basemap layers. |
| `src/features/map/components/RouteLayer.jsx` | Renders the saved Route GeoJSON independently of directions. |
| `src/features/map/components/RouteEndpointLayer.jsx` | Renders saved Waypoint markers and the official-start highlight while Directions is approaching. |
| `src/features/map/components/RouteUserLocationLayer.jsx` | Renders the live marker/accuracy circle and follows or recenters the map. |
| `src/shared/hooks/useUserLocation.js` | `useUserLocation`; one-shot location (`locate`), watch lifecycle (`start`/`stop`), coordinate validation, callback forwarding, errors, and `clearWatch` cleanup. |
| `src/features/map/routeProximity.js` | `getDistanceToRouteMeters`, `createRouteArrivalDetector`; nearest-LineString distance and arrival confirmation. |
| `src/services/analytics.js` | `trackInteraction`; validates and emits the existing Route Directions and Track activation events. |
| `src/pages/PlacePage.jsx`, `src/features/map/components/PlaceDirectionsLayer.jsx` | Separate Place directions/access behavior. Place APIs accept a distinct composite walking-access response shape; it is not a Route access capability. |
| `src/index.css`, `src/features/map/map.css` | Existing map action, mode, map sizing, mobile control, and focus styling. |

## 3. Current destination selection

`RoutePage` accepts a start only when exactly one raw Route waypoint has `type === "start"`, belongs to the current Route (`route_id === route.id`), has an ID, and has valid numeric coordinates. This differs intentionally from display ordering: `getOrderedRouteWaypoints` filters to Route-owned waypoints and sorts by `order`, while the start lookup checks the canonical explicit start rather than treating the first displayed waypoint as a start.

The `RouteDirectionsLayer` receives only the canonical start coordinates for its 30 km local-distance guard. `getRouteDirections` posts to `/api/offward/routes/{slug}/directions/` with `{ origin, profile }`; it does not send a destination coordinate, Route geometry candidate, or waypoint ID. The README documents that the backend selects the canonical start waypoint. Therefore the current flow targets the official starting waypoint, not the first waypoint merely by array order, and does not select a nearest Route point.

The “Directions are unavailable” guard is also tied to a unique valid Route-owned start. Under current API behavior, that remains necessary for the official-start fallback and `Go to Start`.

## 4. Nearest reachable access feasibility

### What the saved Route data provides

- Public Route detail includes a GeoJSON `LineString` in `route.geometry`; coordinates use `[longitude, latitude]`.
- The page passes this authoritative geometry to `MapView` only when it is renderable. `RouteLayer` draws it directly, independently from directions.
- Public detail includes waypoint coordinates `{ lat, lng }` and ordering. Waypoints are suitable landmarks, but they are sparse editorial points, not an exhaustive representation of entrances or pedestrian network access.
- `getDistanceToRouteMeters` already measures the minimum distance from a GPS position to the saved LineString, including segment interiors and endpoints. It returns a distance, not the corresponding closest coordinate, and does not perform route/network reachability evaluation.

### The four different meanings of “nearest”

1. **Nearest geometric point:** the closest projection onto any saved LineString segment (or a sampled/derived point on that line). This is computable from Route geometry, but may be on a cliff, across a river, behind a fence, on a private road, or otherwise inaccessible.
2. **Nearest waypoint:** the closest saved waypoint coordinate. It is easy to calculate but can be much farther than an interior LineString point and is not necessarily an entrance.
3. **Nearest point reachable by walking:** a candidate at which the walking network can produce a route from the visitor’s origin, with an acceptable snap and an endpoint that actually corresponds to the intended Route. No existing Route API capability establishes this.
4. **Nearest practical/legal entry point:** requires trustworthy entry/access information and suitable network/legal data. A route geometry or successful network path alone cannot guarantee public access, lawful entry, sidewalk availability, safe crossings, or real-world conditions.

### Existing routing support and missing capability

The frontend has a routing service integration and an OSRM-compatible/provider-neutral routing direction in documentation. The current Route request, however, delegates destination selection to the backend’s canonical start and accepts only `walking` and `driving`. Its response provides route geometry, profile, and distance, but no snapped endpoint/access metadata. No frontend contract supports candidate points, multiple-destination evaluation, or a Route-specific saved access point. The actual provider’s snapping behavior and endpoint constraints cannot be verified from this frontend repository; do not assume they snap arbitrary coordinates to a safe or legal location.

Place directions demonstrate an existing *separate* pattern for a manually authored Place access marker/path and optional walking-access geometry. This is editorial data and a Place-specific API shape; it cannot be applied to a Route without adding Route access data and contract support.

### Feasibility conclusion and fallback

Reuse the existing routing provider only if the backend can evaluate candidate Route access points using its walking profile, report which destination it selected, and reject results whose snapped endpoint is not acceptably close to a candidate. Candidate evaluation should prefer walking-reachable candidates and rank by a product-defined walking cost, not just straight-line distance. Sampling every vertex is neither a guarantee of coverage nor evidence of access; candidate generation and acceptable snap distance need explicit rules. Any returned access is still a routing result, not a promise of legal/safe entry.

If the backend cannot establish a reachable candidate, fall back to directions to the unique official start through the existing endpoint and clearly label that destination as **Route start** rather than presenting it as the nearest access. If the official start cannot be routed either, keep the error visible and leave the visitor able to end Directions. Do not silently invent or persist access points.

## 5. Walking and travel modes

- Route Directions currently offers **Walking** and **Driving** only. `VALID_PROFILES` in `routeDirectionsApi.js` contains those two profiles; there is no cycling option in the Route page or service.
- The Route’s editorial `activity_type` list includes cycling and other activities, but those values do not enable routing profiles.
- Walking can be the profile used to rank candidate access points without silently replacing the visitor’s explicitly selected approach mode. The final directions request must continue to honor the user’s selected mode. If there is a conflict (e.g. a candidate reachable on foot but not by the selected driving profile), product/API behavior must be specified rather than switching modes automatically.
- Arrival is a geographic Route-access condition, not evidence of walking. It must not require low speed or an inferred travel mode. Current `routeProximity.js` does require driving speed at or below 1.5 m/s and rejects missing speed for driving, which would block some valid car arrivals and must be removed for the intended experience.
- Cycling is not currently a selectable route profile. Supporting it requires an explicit product/provider capability decision; arrival itself should still use the same geographic confirmation across profiles.

## 6. Existing GPS and arrival behavior

`useUserLocation` uses a single `watchPosition` per hook instance, with `enableHighAccuracy: true`, `timeout: 15000`, and `maximumAge: 5000`. It validates coordinates and retains accuracy, speed, and browser timestamp. `start` is idempotent while active; `stop`, geolocation errors, and unmount clear the browser watch. A location error clears position and deactivates the watcher; the Route navigation state remains active until the visitor retries or stops.

The Route arrival detector currently:

- calculates distance to the saved Route LineString, not the single directions endpoint;
- requires finite accuracy no greater than 20 m, a timestamp no older than 15 seconds, and distance no greater than 25 m;
- requires three distinct timestamps; duplicate timestamps do not count, and failed/stale/outside samples reset the consecutive count;
- requires low reported speed for `driving`, unlike walking;
- latches after arrival until `reset()` is called.

The page resets the detector on a new Directions activation, a travel-mode change, and Route loading. It does not reset merely because the visitor later moves away from the Route, so an arrival message is not repeatedly emitted while they remain in the same navigation state.

`navigationState` currently has `idle`, `approaching`, and `exploring` behavior. On arrival, only `approaching` runs the detector. The `exploring` state disables the directions layer (removing its temporary polyline) and displays the static text “You're on the route now. Let's wander Offward!” It does not render action buttons. `directionsActive` is false in `exploring`, although `directionsSessionActive` remains true because it is defined as any state other than `idle`; consequently the location watch remains active. The Directions button now appears inactive and can start another approach if activated.

No Permissions API or page-visibility lifecycle handler is used. On tab suspension, no explicit reconciliation occurs; a later GPS fix is accepted only if its browser timestamp passes the 15-second freshness test. Device/browser watch cadence is not guaranteed. Three unique timestamps can arrive close together, so distinct readings alone do not guarantee meaningful time-separated confirmation.

## 7. Recommended lightweight arrival confirmation

Reuse `getDistanceToRouteMeters` and the saved `route.geometry`, plus `position.accuracy` and `position.timestamp` already provided by `useUserLocation`. Keep arrival independent of the requested directions endpoint and travel mode.

Recommended condition:

1. Require a valid published Route LineString and coordinates.
2. Require a fresh, finite GPS timestamp and acceptable reported accuracy. The current 15-second and 20 m caps are reasonable starting values; validate the thresholds on target devices rather than treating reported accuracy as proof.
3. Require the position to be within a product-approved Route corridor (the current 25 m threshold is an existing measurable baseline).
4. Confirm with multiple unique fixes separated by a small minimum elapsed interval and within a bounded confirmation window. This prevents three rapid callbacks from one poor estimate from immediately triggering arrival.
5. Latch the arrival for the current Route destination until the visitor explicitly changes destination or ends Directions. Moving away after arrival should not repeatedly prompt.
6. Do not use speed, movement mode, or `activity_type` to qualify arrival.

The current local segment-distance helper is reusable for arrival; its current implementation is a lightweight local planar projection with longitude-wrap handling. It does not calculate a snapped route, a safe entry, or a legal access point. GPS data should remain transient in memory and must not be recorded, transmitted, or persisted for analytics.

## 8. Recommended arrival notification UI

Use one temporary, contextual, non-modal status/action panel with the requested heading **“You've reached the Route!”** and the three actions:

1. **Start Tracking**
2. **Go to Start**
3. **End Directions**

Prefer existing button/feedback styling and a normal-flow placement adjacent to the Route map controls or immediately around the map section. Do not put interactive content inside a clipped map wrapper or over Leaflet zoom/basemap controls. The current `route-arrival-notice` has no matching styling rule in `src/index.css` or `src/features/map/map.css`; it is only a `<p role="status">` supplied as a `MapView` child, with no focus behavior or actions. It is not an existing action-card pattern to reuse unchanged.

Keep the panel non-modal and do not steal focus on arrival—especially because visitors may be driving. Announce arrival once through a polite status/live region; the buttons remain reachable by keyboard and screen reader. Each action needs a visible focus indicator, a clear accessible name, and a touch target of at least 44 px. On small screens, stack or wrap the actions, keep all three visible without hiding map controls, and ensure the panel can scroll/be reached without being clipped. Do not dismiss solely on a timer; dismissal occurs through an explicit action or destination/session change.

## 9. Proposed state transitions for the three actions

Represent destination/session state explicitly enough to distinguish **approaching an access point**, **arrival actions pending**, and **navigating to the official start**. Keep the user-selected routing mode separate from the arrival detector state.

### Start Tracking

- Consume/dismiss the arrival prompt once.
- Deactivate approach directions so `RouteDirectionsLayer` aborts any in-flight request and removes only its temporary approach polyline.
- Set independent Route tracking active and map-follow on; do not call `stopLocation` while transitioning.
- Reuse the existing `useUserLocation` watcher and current position. `startFollowing` already avoids calling `startLocation` when `locationActive` is true; preserve that behavior to prevent duplicate watchers.
- Emit exactly one `track` interaction for the explicit Start Tracking activation. Do not count the automatic arrival transition itself.
- Keep the saved Route geometry, saved waypoints, segments, and markers unchanged. There is no current earlier-segment completion mechanism to invoke; do not create one.
- If no watcher is active (e.g. permission changed or watcher failed), handle startup failure explicitly. The existing `startFollowing` sets Track active before geolocation success and can leave a success-shaped active button despite a denied/unavailable location; the transition should not claim live tracking is active when no watcher started.

### Go to Start

- Dismiss the Route-access prompt and switch the Directions destination to the validated canonical start waypoint; use the existing `getRouteDirections` service and preserve the selected mode.
- Keep the same watcher and navigation session. Do not call the default `startDirections` path in a way that emits a second Directions event or starts another watcher.
- Reset destination-specific arrival confirmation and stop running the Route-access detector while the official-start destination is active. Otherwise the visitor still standing on the Route can immediately re-trigger the same access prompt.
- Acknowledge reaching the official start only after a fresh, accurate, repeated GPS confirmation near that canonical waypoint (using an explicit product threshold). Do not show the same Route-access prompt repeatedly while the visitor continues toward the start. Whether reaching the start should show a separate acknowledgement, the same three actions, or simply remain in navigation is a product decision.
- A manual End Directions action remains available. Destination changes must reset the relevant arrival latch; user mode changes should not silently change the destination.

### End Directions

- Dismiss arrival UI, set navigation/destination state to idle, abort pending routing, and let `RouteDirectionsLayer` remove only the temporary approach geometry.
- Preserve the saved Route LineString and waypoint markers.
- If independent Track is active, preserve its watcher, live position, location marker, and current follow preference. Otherwise stop the directions-only watcher and return to normal map mode; the current hook’s `stop()` also clears its in-memory position and error.
- Do not start Track or emit a Track interaction.

## 10. GPS watcher and cleanup risks

- Directions and Track currently share one `useUserLocation` instance on `RoutePage`. That is a useful basis for reusing a live fix, but transition state updates must not call both `stopLocation` and `startLocation` in the same transition.
- The effect stops location only when both `independentTracking` is false and `navigationState` is `idle`. Arrival changes state to `exploring`, so the watcher intentionally remains alive today; the transition should explicitly decide whether it remains until an action.
- Starting independent tracking while approach Directions is still active currently leaves both states active. The new Start Tracking action must end Directions first, then preserve the existing watcher.
- Browser permission may be revoked or an error may occur after Directions begins. The hook clears the watch and position while the UI retains navigation state and an error; retries should be explicit and must not double-count activation analytics.
- Geolocation callbacks may pause in a background tab, be delayed, or have stale timestamps. The detector should reject stale fixes and reset its confirmation sequence; do not infer an arrival from stale retained React state.
- `RouteDirectionsLayer` aborts outstanding network requests on deactivation and cleanup. A destination switch should abort the old request before accepting a result for the new destination; protect against stale responses by associating request results with the current destination/session.
- Route changes already reset navigation, detector, location, and mode. Preserve this cleanup when introducing extra arrival/destination state.

## 11. Analytics interaction risks

`RoutePage.startDirections` emits `trackInteraction('directions', 'route', route.id)` once after its valid-start guard. `startFollowing` emits `trackInteraction('track', 'route', route.id)` when called with its default `countActivation=true`; retries pass `false`. `trackInteraction` accepts only recognized interaction names and valid Route/Place UUIDs. It sends action/content metadata only—no GPS coordinates.

Keep events tied to deliberate button activations, not component renders, GPS callbacks, arrival detection, rerouting, or dismissal. Start Tracking should emit one `track` event; it should not re-enter the analytics-counting Directions handler. Go to Start is a destination change within an already active Directions session; do not emit a second Directions event unless product analytics explicitly defines each destination leg as a separate activation. Avoid duplicate events if a pending request is retried or a destination action is re-entered. No analytics code or event payload change is part of this audit.

## 12. API/backend dependencies

Frontend-visible API facts:

- Route detail comes from `GET /api/offward/routes/{slug}/` through `getPublicRouteBySlug`.
- Current Route directions use `POST /api/offward/routes/{slug}/directions/` with origin and `walking`/`driving` profile. README states that the backend selects the canonical start and owns routing-provider credentials.
- Frontend response validation expects only the requested profile, LineString geometry, and distance. It cannot confirm the network-snapped destination or access quality.
- Existing Route authoring/API docs make saved Route geometry provider-neutral GeoJSON and identify public Route geometry as authoritative. They do not define a public Route-access candidate endpoint or access-point model.
- Place directions have their own API response validation for a composite driving leg plus optional walking access geometry; it does not make those capabilities available to Route directions.

Implementation therefore depends on a backend/API contract for candidate generation/evaluation, selected candidate identity/coordinate, routing profile, network-snapped endpoint and snap distance (or equivalent validation), route distance, no-candidate/error outcomes, and an explicit official-start fallback. If practical/legal entry must be asserted, that additionally needs maintained access data and appropriate network/legal semantics; routing geometry alone is insufficient. Provider credentials and provider response formats must remain server-side.

## 13. Complexity and limitations

- **Frontend-only arrival/actions after an access destination is supplied:** moderate. RoutePage already owns navigation state, the detector, the watcher, the directions layer, and analytics callbacks; the action UI and state transitions are localized but must coordinate cleanup and async routing.
- **Nearest geometric candidate:** moderate. A closest-point helper or bounded candidate generator can use LineString segments and existing distance math, but sampling/densification and coordinate projection rules need care.
- **Nearest reachable walking destination:** medium-to-high and backend-dependent. Requires candidate evaluation through the existing routing provider, response validation, rate/latency handling, an access/no-access result, and destination identity so the UI can explain where it routes.
- **Nearest practical/legal entry:** cannot be reliably implemented from the current Route LineString and sparse waypoints alone. Requires trusted Route access-point authoring/data and, depending on the claim, pedestrian/legal network evidence. No guarantee should be made from a snapped coordinate alone.
- **Cycling mode:** currently unsupported by the public Route directions UI and service. Provider/backend capability and product semantics must be decided separately.
- **GPS arrival:** existing helper provides useful baseline logic and tests, but driving-speed gating must be removed, confirmation spacing added, and start-destination arrival separated from Route-access arrival.
- **Existing documentation conflict:** `docs/.audit/route-directions-frontend-audit.md` describes an earlier state with no internal directions route/polyline. Current source includes `routeDirectionsApi.js` and `RouteDirectionsLayer.jsx`; use current code and README/API docs rather than that stale description.

## 14. Recommended smallest safe implementation plan

1. Agree the destination/API contract first: backend evaluates walking-reachable candidate access points using the existing routing provider, returns validated selected destination and approach geometry, and reports no-candidate distinctly. Define snap-distance and fallback behavior; do not derive “legal access” from the LineString.
2. Keep one Directions button and the current mode selector. On Directions activation, attempt candidate access selection with walking priority while preserving the visitor’s selected final routing profile. If no access is established, clearly fall back to the official start.
3. Extend Route navigation state minimally to distinguish the active destination and one-shot arrival prompt from official-start navigation. Preserve Route map, saved geometry, waypoint markers, Place navigation, and authoring behavior.
4. Reuse the current location hook, LineString distance helper, directions service boundary, temporary directions layer, and Track/analytics handlers. Add a destination-aware request abort/stale-result guard; do not create a second watcher.
5. Adapt arrival confirmation to reliable repeated proximity to saved Route geometry independent of speed/mode; keep one-time latching. For Go to Start, switch to a separate start-endpoint confirmation and suppress the Route-access prompt.
6. Present a non-modal temporary three-action panel using existing visual conventions; verify mobile visibility, keyboard operation, 44 px targets, map-control separation, and no unsolicited focus movement.
7. Implement each action as an idempotent state transition. Start Tracking must retain/reuse the position and watcher, End Directions must not start Track, and Go to Start must not re-count Directions by accident.
8. Only after backend contract confirmation, validate behavior with focused tests for destination choice/fallback, detector accuracy and repeated confirmations, destination-switch prompt suppression, watcher reuse/cleanup, permission failure, stale requests, and one-event-per-user-action analytics. No implementation or validation was performed in this audit.

## 15. Product decisions required before implementation

1. What precisely does “walking access has priority” mean when the visitor explicitly selects Driving: select a destination by walking-network cost but route to it in Driving mode, or prefer the closest candidate also reachable in the selected mode?
2. How are candidates generated and bounded (LineString vertices, densified intervals, authored access points, or a combination), and what walking-distance/snap-distance limits are acceptable?
3. What evidentiary standard is needed before calling a candidate “practically reachable” or a “legal/safe entry”? Should the UI use neutral “Route access point” wording and avoid safety/legal claims?
4. If no candidate is established, should Directions automatically fall back to the official start with an explicit notice (recommended), or ask the visitor to retry/end? What if the start also cannot be routed?
5. Should cycling be added as a selectable routing profile, and is it supported by the current backend/provider?
6. What Route-distance and GPS-accuracy thresholds qualify arrival, and what minimum spacing/confirmation window between fixes is acceptable?
7. What should happen at the official start after **Go to Start**: a quiet acknowledgment, a distinct start-arrival prompt, or no prompt? If a prompt appears, should it offer the same actions?
8. Should the temporary action panel live in the Route map section near the controls or in a clearly separated map overlay? The current map wrapper clips overflow, so placement inside the map container needs deliberate sizing/stacking.
9. Should **Go to Start** count as a second Directions analytics activation? The smallest consistent choice is one event for the initial Directions activation and no additional event for changing destination within the same session.
10. If the visitor has already independently activated Track before starting Directions, should **End Directions** preserve that Track session and map-follow preference? Current state semantics preserve independent tracking.

