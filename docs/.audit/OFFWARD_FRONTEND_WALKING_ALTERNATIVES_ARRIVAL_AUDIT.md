# Offward Frontend Walking Alternatives & Arrival Audit

**Date:** 2026-10-26  
**Scope:** Read-only inspection of Route navigation, directions validation, GPS arrival, map controls, and styles. Only this audit document is created; no application code, backend code, tests, builds, lint, or dependencies were changed or run.

## Executive summary

The requested audit file did not exist at inspection time. The current Route page supports Walking and Driving directions, but does not receive or select multiple returned paths. Walking currently uses a Route access-directions endpoint and Driving uses the standard Route directions endpoint. Both frontend response validators describe one approach geometry, and `RouteDirectionsLayer` retains and draws one result.

There is no final implemented **alternatives API contract** in the frontend repository. The current access-directions response has an `evaluated_candidates` count and a single selected `access` plus a single `approach`; that is not a collection of route alternatives. A selector or client-side switching behavior must not be implemented until the backend contract identifies the exact alternatives response schema, applicable profiles, and error/fallback behavior.

Route arrival is detected from the live GPS watcher and the saved Route LineString, independently of whether an ORS directions request succeeds. This is confirmed by the current call flow. Arrival still depends on valid renderable Route geometry and three fresh, sufficiently accurate readings near it. The reported Android failure cannot be attributed to a particular condition without device logs or captured GPS readings. The displayed “routing service returned invalid directions” message is specifically mapped from an HTTP 502 response by the walking access-directions client; it does not prove which backend/provider failure produced that status.

## Files and existing audit reviewed

- [`RoutePage.jsx`](../../src/pages/RoutePage.jsx)
- [`routeDirectionsApi.js`](../../src/services/routeDirectionsApi.js)
- [`RouteDirectionsLayer.jsx`](../../src/features/map/components/RouteDirectionsLayer.jsx)
- [`routeProximity.js`](../../src/features/map/routeProximity.js)
- [`useUserLocation.js`](../../src/shared/hooks/useUserLocation.js)
- [`MapView.jsx`](../../src/features/map/components/MapView.jsx), [`RouteUserLocationLayer.jsx`](../../src/features/map/components/RouteUserLocationLayer.jsx), and map layers/styles in [`map.css`](../../src/features/map/map.css) and [`index.css`](../../src/index.css)
- [`OFFWARD_FRONTEND_NEAREST_ROUTE_ARRIVAL_AUDIT.md`](./OFFWARD_FRONTEND_NEAREST_ROUTE_ARRIVAL_AUDIT.md) and [`OFFWARD_LIVE_ROUTE_FOLLOWING_AUDIT.md`](./OFFWARD_LIVE_ROUTE_FOLLOWING_AUDIT.md)
- Current API/map planning documents, including [`OFFWARD_MAP_API_IMPLEMENTATION_CONTRACT.md`](../OFFWARD_MAP_API_IMPLEMENTATION_CONTRACT.md) and [`OFFWARD_API_CONTRACT_PLAN(1).md`](../OFFWARD_API_CONTRACT_PLAN(1).md)

The earlier nearest-route audit contains material statements that no longer match the implementation: current state uses `arrived`/`to-start` and renders the three arrival actions, rather than the previously described `exploring` state with only an informational message. Its description of directions only targeting the official start is also incomplete: current Walking starts at `access`, while Driving targets the official start. The earlier audit's statement that Driving arrival requires low reported speed does not match the current detector, which ignores its mode argument.

## 1. Current directions lifecycle

1. `RoutePage` finds a canonical start only when exactly one raw waypoint is a valid, Route-owned `type: "start"` with a nonempty string ID and valid numeric latitude/longitude. The Directions button is unavailable without it, even for Walking access directions.
2. Starting Directions records one `directions` interaction, resets arrival state, starts the shared `useUserLocation` watcher if needed, and enters `approaching`.
3. The initial destination is `access` for Walking and `start` for Driving. A mode change requests a new destination/mode result. The walking `access` destination is rejected by the layer if paired with a non-walking mode.
4. When a live position is available, `RouteDirectionsLayer` makes one request for the current route/request ID/destination/mode key. For `access`, it calls `getRouteAccessDirections`; otherwise, it calls `getRouteDirections`. Start-bound requests also enforce a 30 km straight-line limit. Access requests have no equivalent local distance guard in this layer.
5. The layer aborts an old request when its request key changes, ignores stale/aborted results, converts one GeoJSON LineString to Leaflet coordinates, stores one navigation result, and draws one blue non-interactive polyline. The saved Route geometry and markers are rendered separately by `MapView`.
6. Changing modes or destination/request ID requests another route. There is no selected-alternative state or client-side switch that can retain and display another path from the same response.

Directions, You, Track, mode controls, and feedback are rendered alongside the map in `RoutePage`. The Directions and Track controls are separate; Track and Directions can both be active if the visitor manually starts Track during Directions.

## 2. Existing single-approach validation and API shapes

### Standard Route directions

`getRouteDirections` posts to:

```text
POST /api/offward/routes/{encoded-slug}/directions/
{ "origin": { "lat": number, "lng": number }, "profile": "walking" | "driving" }
```

Its response validator requires an object with `profile` equal to the requested profile, a GeoJSON `LineString` with at least two valid `[longitude, latitude]` coordinates, and a finite non-negative `distance_km`. The current layer reads one `geometry` and one `distance_km`. The validator does not describe, validate, or expose a list of alternatives.

### Walking Route access directions

Walking `access` posts to:

```text
POST /api/offward/routes/{encoded-slug}/access-directions/
{ "origin": { "lat": number, "lng": number }, "profile": "walking" }
```

The frontend validator requires the following fields and constraints:

```text
{
  profile: "walking",
  route_id: the current Route ID,
  map_revision: integer >= 0,
  access: {
    type: "route_geometry" | "official_start",
    coordinates: { lat: valid latitude, lng: valid longitude },
    selection: nonempty string,
    snapped_coordinates: { lat: valid latitude, lng: valid longitude },
    destination_displacement_meters: finite number >= 0
  },
  approach: {
    geometry: valid GeoJSON LineString,
    distance_km: finite number >= 0,
    duration_seconds?: finite number >= 0
  },
  fallback: {
    used: boolean,
    reason: null when used is false; otherwise one of
      "geometry_missing" | "geometry_invalid" | "geometry_stale" |
      "no_candidate_within_radius" | "no_routable_candidate"
  },
  evaluated_candidates: integer from 0 through 3
}
```

The validator additionally requires `access.type === "official_start"` exactly when `fallback.used === true`. It validates one `access` and one `approach`; `evaluated_candidates` is a bounded count, not an alternatives array. Additional response properties are not explicitly rejected by this validator, but no frontend behavior for alternative properties exists. This is a description of frontend validation only; backend implementation was not inspected.

## 3. Alternatives contract dependency and integration point

**The final implemented alternatives API contract is not available in this frontend repository.** The existing map/API planning documents do not define a Route directions alternatives response. The active frontend validators and layer likewise define only one selected route path. No alternatives response shape should be inferred from `evaluated_candidates`, `access.selection`, or Place directions.

Before implementation, the backend contract must specify at minimum:

- Which endpoint(s) and profiles return alternatives, including whether Walking access and Driving both support them.
- The exact top-level response and alternatives collection field; maximum/guaranteed count and behavior when only one or no option is available.
- Stable alternative identity, display label/order, profile, geometry, distance, and whether duration or access/fallback metadata is included.
- Whether returned geometries are already evaluated/routable, and the semantics of access candidate selection, snap/displacement, fallback, and map revision.
- Error and partial-result behavior, including malformed/unavailable individual alternatives and compatibility during rollout.

Once agreed, the natural frontend integration points are:

1. Extend `routeDirectionsApi.js` to validate the agreed response and alternatives as a whole. Do not weaken existing geometry/profile validation or silently substitute an assumed field.
2. Retain that one response in the directions layer (or a single state owner shared with RoutePage) and track a selected alternative ID. Add a compact selector to the existing secondary controls adjacent to the mode control.
3. Change selection locally from the already-loaded alternatives; do not increment `directionsRequestId`, change destination/mode, or call either directions endpoint. Guard stale responses with the existing request key and abort behavior.
4. Render only the selected alternative's geometry and distance in the directions layer. Fit the map to the newly selected path as appropriate; never draw all candidates as competing highlighted navigation routes.

There is no need for another GPS system: the selector should not start, stop, or duplicate the existing location watcher.

## 4. Arrival behavior and Android report

### Confirmed current behavior

- `useUserLocation` supplies one high-accuracy `watchPosition` stream to RoutePage. Directions and independent Track reuse this hook and its watcher.
- While `navigationState === "approaching"`, each accepted watcher position is processed against `route.geometry` only when `route.is_map_renderable === true`. The code does not consult `directionsStatus`, response geometry, provider success, or `RouteDirectionsLayer` readiness before running arrival detection.
- The detector requires a valid LineString with at least two valid coordinates; a position timestamp no more than 15 seconds old; finite accuracy from 0 through 20 m; position within 25 m of the saved Route line; and three distinct qualifying fixes, at least 1 second apart and within a 15-second confirmation window. Repeated timestamps are ignored. Poor, stale, out-of-range, or invalid-geometry readings reset the confirmation sequence.
- The detector no longer uses speed or travel mode to gate arrival. Its `_mode` argument is explicitly unused.
- On arrival, RoutePage enters `arrived` and displays “You've reached the Route!” plus **Start Tracking**, **Go to Start**, and **End Directions**. The detector therefore recognizes proximity to any part of the saved Route line, not necessarily the official start.
- **Go to Start** sets the destination to `start`, increments the routing request ID, keeps the Directions session/watch active, resets arrival confirmation, and enters `to-start`. In that state the same detector checks proximity to a degenerate LineString at the canonical start coordinate; confirmed arrival displays “You've reached the Route start.”
- **End Directions** sets navigation idle and resets status. The existing effect stops the location watcher only when both Directions and independent Track are inactive.
- Arrival can still be detected if the directions request fails, provided the location watcher continues and the Route geometry/readings satisfy the detector. A GPS error clears the watch and current position; RoutePage offers a location retry while a Directions session remains active.

### Reported Android failure: confirmed causes versus hypotheses

The report that real Android testing failed to recognize Route arrival is recorded as a reported symptom, not independently reproduced in this read-only audit. No Android device logs, permission state, accuracy/timestamp samples, backend traces, or route payload from that test were available.

**Confirmed code-level conditions that can prevent recognition:**

- There is no usable arrival geometry when the Route is not marked renderable or its LineString fails `getDistanceToRouteMeters` validation.
- Any required fix is rejected if stale, missing a finite timestamp/accuracy, or above the 20 m accuracy threshold; distance must be at most 25 m.
- Three qualifying unique readings are required. One or two fixes, repeated timestamps, insufficient spacing/window timing, or a rejected fix resetting the sequence will not confirm arrival.
- A browser geolocation error stops the watcher and clears its position until retry succeeds.
- The geolocation watcher must be active; one-shot `locate` alone does not provide continuous arrival monitoring.

**Unresolved hypotheses for the Android observation:**

- Android/browser permission, device location settings, GPS availability, background throttling, or callback cadence prevented timely watcher fixes.
- Reported accuracy stayed above 20 m, timestamps were stale/repeated, or the user passed within the 25 m buffer without three qualifying readings.
- The tested Route payload had missing, stale, malformed, or non-renderable geometry.
- A route-crossing location or sparse line geometry affected the measured distance.

These are plausible from the inspected gates but cannot be asserted as the cause without corresponding runtime evidence. There is no confirmed source-code condition making arrival contingent on ORS success.

## 5. “Routing service returned invalid directions” message

`getRouteAccessDirectionsError` maps an HTTP **502** from `/access-directions/` to the exact text:

> The routing service returned invalid directions. Please try again later.

This message identifies the HTTP status branch, not the underlying backend/provider cause. The frontend does not preserve or display enough of the 502 payload here to establish whether the provider returned malformed data, the backend rejected a result, or another backend condition produced the response.

This is distinct from a malformed successful response: if a 2xx access response fails the frontend validator, the thrown text is `Offward returned an invalid walking access directions response.` Standard directions validation failures instead say `Offward returned an invalid directions response.` Thus the exact reported “routing service returned invalid directions” wording is not proof that Android GPS caused the failure, nor is it the frontend's local alternatives validation.

## 6. Arrival actions, watcher reuse, and analytics

- **Start Tracking:** the arrival action is guarded by `arrivalActionTakenRef`, ends the Directions session, enables independent Track/following, and starts the watcher only if it is not already active. It records a Track interaction only if independent tracking was not already active.
- **Go to Start:** changes destination within the current Directions session, resets the arrival detector, and does not call the analytics-counting Directions activation handler.
- **End Directions:** ends the session, clears its temporary approach route through layer deactivation, and lets the existing effect stop the watcher unless independent Track is active.
- Initial Directions and explicit Track starts record their respective interaction events. Location/directions retries and travel-mode changes do not invoke those analytics calls. Arrival action latching and the `independentTracking` check prevent repeated Track analytics from the same arrival action or when Track is already on.
- The ordinary Track control can be activated while Directions is active; that is a separate deliberate Track activation and leaves Directions active. There is no shared analytics deduplication key or explicit debounce for rapid repeated button activation; existing protection is limited to the current UI/state guards and the arrival action ref.

## 7. Mobile usability and accessibility

The controls use semantic buttons and named groups; Directions/Track expose pressed state, Walking/Driving expose selected mode, and feedback uses status/alert roles. Focus-visible outlines exist. Mobile CSS makes the main map action buttons at least 44 px high and stacks the arrival actions with full-width buttons; arrival buttons are 44 px minimum. The existing map action bar is compact and may have narrow labels at small widths.

Walking/Driving mode buttons are reduced to a 38 px minimum height in the mobile media rules. Any alternatives selector should preserve visible selected state, provide a programmatic label and keyboard operation, maintain a comfortably large touch target (prefer at least 44 px), wrap or fit without obscuring map controls, and announce selection/status changes without announcing every GPS update. A native select or compact labeled radio group can be considered only after the number and labeling of backend alternatives are known.

## 8. Smallest implementation plan (after contract is provided)

1. Lock the exact alternatives response contract with backend, including Walking access versus Driving, stable IDs, geometry/distance fields, partial/fallback/error semantics, and compatibility.
2. Add exact schema validation to `routeDirectionsApi.js`; retain the existing single-route validators if older endpoints/responses remain supported.
3. Store the returned alternatives once per Directions request and a selected ID locally. Selecting another alternative must not issue a routing request or disturb the GPS watcher/session.
4. Add one compact, accessible selector to RoutePage's existing secondary controls; render and fit only the selected approach in `RouteDirectionsLayer`.
5. Keep arrival processing attached to the shared GPS watcher and saved Route geometry, independent of routing success. Validate the Android failure with captured device readings and Route payload before changing thresholds or geolocation lifecycle.
6. Preserve one analytics event per deliberate Directions/Track activation; do not count local alternative switching as a new routing activation unless analytics requirements explicitly define it.

