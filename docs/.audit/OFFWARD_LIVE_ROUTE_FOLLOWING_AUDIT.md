# Offward Live Route Following Frontend Audit

**Audit date:** 22 October 2026  
**Scope:** Read-only review of the public Route and Place detail maps, shared map/location components, and their directions flows. Frontend only. No application code, dependencies, tests, builds, or linting were changed or run.

## Executive summary

Offward already has the core GPS and map primitives needed for live following: `useUserLocation` watches the browser's GPS, `RouteUserLocationLayer` renders the actual coordinates and reported accuracy, and its optional follow mode recenters the Leaflet map whenever the position changes.

The public Route map always renders the saved Route geometry independently of directions. However, visitors currently have no control to start GPS tracking on its own: tracking starts through **Directions to start**, which activates `RouteDirectionsLayer` and can request OpenRouteService (ORS) directions. The existing **Recenter** control is only available after a location/directions flow has started. Once tracking is active, the Route map can continuously follow the visitor, and manual map movement suspends following until Recenter is pressed.

The Place detail map likewise has a reusable live GPS marker and renders its manually authored access path during its directions flow. GPS continues through the walking stage, and the path remains visible, but tracking is coupled to **Directions to place**. The Place map hard-codes location following off and has no Recenter control. When the manual path is active, ORS is used only for the visitor-to-access-marker leg when needed; the saved marker-to-Place walking path itself does not require an ORS request.

The smallest implementation is to add independent follow controls that start and stop the existing `useUserLocation` hook, then reuse `RouteUserLocationLayer` for the dot, accuracy circle, and map-follow behavior. For Place access paths, expose the existing saved geometry independently of directions so a follow-path action can display and follow it without activating the directions/routing logic. No second GPS system, new map library, or dependency is needed.

## 1. What currently works

- [`useUserLocation.js`](../../src/shared/hooks/useUserLocation.js) uses `navigator.geolocation.watchPosition` with high-accuracy mode, a 15-second timeout, and a 5-second maximum age.
- GPS positions are validated and retain the browser-reported latitude, longitude, accuracy, speed, and timestamp when valid.
- [`RouteUserLocationLayer.jsx`](../../src/features/map/components/RouteUserLocationLayer.jsx) places the marker at the supplied latitude/longitude and draws a Leaflet accuracy circle when accuracy is a finite positive number.
- Its `followEnabled` mode calls `map.setView` on every new position, without changing zoom. It also disables follow after supported manual map gestures; Recenter can re-enable it.
- The Route map's saved GeoJSON is passed to `MapView` whether or not directions are active. Directions are an additional overlay and do not supply or control the saved Route geometry.
- The Place map can display the manually authored access geometry as a dashed line and the directions marker. Its Place directions layer has a separate routing leg, so the saved access path is not an ORS-generated route.
- The map is based on Leaflet / React-Leaflet; no new mapping library is needed.

## 2. What is missing

- Neither public page has a standalone **Follow Route** / **Follow access path** action that starts GPS without entering its directions flow.
- On Route, **Directions to start** is the only current way to start GPS. It marks directions active and mounts the active directions layer, which can request ORS routing.
- On Place, **Directions to place** is the only current way to start GPS. It activates the journey state and may calculate a route to the access marker.
- Place location following is explicitly disabled (`followEnabled={false}`), and there are no Place Recenter or stop-tracking map controls.
- The Route marker's accuracy is communicated visually by the accuracy circle, not numerically. The marker is labeled “You are here”; no textual accuracy value or explicit low-accuracy warning is shown.
- GPS errors are surfaced by the shared hook and shown by the pages, but the retry action on the Route page is specifically the directions action. A standalone follow mode needs a retry that does not enter directions.
- The Place access path is currently rendered only while the Place directions layer is active. It therefore cannot remain visible as a standalone path-following mode without separating path display from routing activity.

## 3. Saved Route following behavior

### Geometry and GPS

`RoutePage` passes the validated saved Route geometry to `MapView` without conditioning it on `directionsActive`. The Route line therefore remains displayed independently of directions.

When **Directions to start** is activated, `RoutePage` starts `useUserLocation` and makes `RouteDirectionsLayer` active. When a valid position arrives, `RouteUserLocationLayer` renders that raw GPS coordinate as the marker and uses the reported accuracy as the radius of its circle. The marker is not snapped to the Route geometry.

The hook continues watching while active. Its position updates continue to update the marker and accuracy circle while walking, regardless of whether the visitor is inside the current map viewport.

### Following and recentering

- The Route page keeps a `locationFollowing` state and passes it to both `MapView` and `RouteUserLocationLayer`.
- The map automatically follows only while that state is true. Current **Directions to start** does not initially enable continuous following.
- Once tracking has started and a position is available, **Recenter** enables following and recenters. The same layer then recenters on each subsequent GPS update.
- Arriving at the Route can set following on automatically through the existing arrival detector.
- A drag, wheel/zoom interaction, zoom-control interaction, multi-touch gesture, or supported keyboard movement disables follow. The GPS watcher and marker remain active. If the visitor moves far enough that their marker leaves the visible map, the map stays where it is until they press Recenter; future positions do not pan the map while follow is off.
- The Recenter button cannot start tracking: it is unavailable before the GPS/directions state exposes the map controls and is disabled until a position exists.

### ORS independence

GPS updates are delivered to the arrival detector and map layer. In directions mode, `RouteDirectionsLayer` can request a route from the current position to the start, but its per-mode request guard prevents every watch update from causing another ORS request. A standalone follow action must not activate this directions layer; then saved-route following requires no ORS request.

## 4. Place access-path following behavior

The manually authored geometry and access-start marker are passed to `PlaceDirectionsLayer`. That layer displays the saved dashed access path while its `active` prop is true, which today is tied to Place directions being active.

During the existing directions flow:

- GPS remains active until **Stop directions**, Place change, or component unmount.
- The live marker and accuracy circle remain rendered from `userPosition`, including during the `walking-after-driving` phase.
- For a manually authored path, the initial location determines whether the journey begins with a walking leg or a driving leg. If farther away, ORS may calculate the visitor-to-marker leg. Once walking the saved access path, there is no route profile and no additional ORS request for that leg.
- The saved walking path stays displayed while directions are active, including during the walking stage.
- The Place directions viewport fits the origin, route/path, marker, and Place when its routing/path data is ready. This is a fit operation, not continuous GPS following.
- There is no Place recenter control. `RouteUserLocationLayer` receives the live position but is always passed `followEnabled={false}`; manual map movement has no effect on follow state.

To follow the saved path without ORS, the page needs to start the existing location hook independently and display the static access geometry without activating the portion of `PlaceDirectionsLayer` that requests directions. The map can then use the shared location layer's follow and recenter behavior.

## 5. Existing GPS components that can be reused

| Existing component | Reusable behavior |
|---|---|
| [`useUserLocation.js`](../../src/shared/hooks/useUserLocation.js) | Single shared `watchPosition` implementation, coordinate validation, permission/unavailable/timeout errors, and watcher lifecycle. Use its existing `start`/`stop`; do not add a second watcher. |
| [`RouteUserLocationLayer.jsx`](../../src/features/map/components/RouteUserLocationLayer.jsx) | Actual-position marker, reported-accuracy circle, map recenter-on-update, and automatic follow suspension after manual movement. Already used by both public detail pages. |
| [`MapView.jsx`](../../src/features/map/components/MapView.jsx) | Shared public Leaflet map. Its `followEnabled` prop is already passed to `MapViewportController`, suppressing competing data-driven viewport fits while following. |
| [`MapViewportController.jsx`](../../src/features/map/components/MapViewportController.jsx) | Already respects `followEnabled`, so Place can use it when follow state is wired through `MapView`. |
| [`PlaceDirectionsLayer.jsx`](../../src/features/map/components/PlaceDirectionsLayer.jsx) | Existing saved-path geometry conversion and drawing, access marker, and current directions behavior. Adjust its presentation/routing separation rather than creating another GPS or map system. |

## 6. Smallest possible frontend implementation

1. Add a Route follow action that starts `useUserLocation` and enables `locationFollowing`, independently of `directionsActive` and `RouteDirectionsLayer`. Preserve the saved geometry and existing dot/accuracy layer. Keep Recenter available when a position exists, and ensure retry and stop controls work without invoking directions.
2. Add a Place access-path follow action that starts the same `useUserLocation` hook independently of `directionsActive`. Keep the saved access path and marker visible in this mode while ensuring its activation does not trigger the ORS effects in `PlaceDirectionsLayer`.
3. Add Place follow/recenter state and controls. Pass the follow state to `RouteUserLocationLayer` and `MapView.followEnabled`; use the existing manual-movement callback pattern so the visitor can pan freely and explicitly resume following with Recenter.
4. Reuse the current watcher for both modes. Keep stopping behavior explicit and rely on the hook's existing cleanup on stop, browser geolocation error, route/place change, and unmount.
5. Keep location feedback accessible. Existing permission-denied, unavailable, timeout, and unsupported-browser messages can be reused; add no success-shaped fallback when location is not available. The existing accuracy circle can remain the visual accuracy cue; a numerical accuracy message would be an optional UX enhancement, not a prerequisite for following.

## 7. Files likely to change

- [`src/pages/RoutePage.jsx`](../../src/pages/RoutePage.jsx) — add independent Route follow/start-stop UI and keep its state separate from directions; preserve recenter and surface standalone retry behavior.
- [`src/pages/PlacePage.jsx`](../../src/pages/PlacePage.jsx) — add independent access-path tracking/follow state and map controls; enable `MapView` and location-layer follow behavior.
- [`src/features/map/components/PlaceDirectionsLayer.jsx`](../../src/features/map/components/PlaceDirectionsLayer.jsx) — make the saved access geometry/marker displayable independently from active directions/routing.
- [`src/features/map/map.css`](../../src/features/map/map.css) — only if the added Place control layout needs responsive styling; existing location-control styles can likely be reused.

`useUserLocation.js`, `RouteUserLocationLayer.jsx`, `MapView.jsx`, and `MapViewportController.jsx` already implement the core reusable functionality and may not need modification.

## 8. GPS accuracy, lifecycle, and mobile limitations

- **Actual versus snapped position:** The marker uses the browser-provided `latitude` and `longitude` directly; no route-matching or snapping operation is present.
- **Accuracy:** A circle is drawn using the browser-reported accuracy in meters when the value is valid and greater than zero. A missing/invalid accuracy omits the circle. The visitor is not given a numeric estimate or an explicit indication of poor accuracy.
- **Permission and availability:** The hook reports unsupported browser, permission denied, location unavailable, and timeout errors. Geolocation errors stop the watcher and clear the current position.
- **Cleanup:** `clearWatch` is called when the visitor stops tracking, on geolocation error, and on component unmount. Route/place page changes also stop the location flow.
- **Routing requests:** The location hook itself makes no routing requests. Route directions are separate and guarded against repeated requests for every GPS update. Place directions use fixed initial origin / route-profile requests; walking the saved access path does not require an ORS request.
- **Mobile:** The implementation uses the standard browser Geolocation API and Leaflet touch map, so it can work on supported mobile browsers. Browser geolocation generally requires a secure context (HTTPS, except localhost) and user permission. Availability and accuracy depend on the browser, device, OS settings, and location signal. Mobile browsers may throttle or suspend location updates when the page is backgrounded or the device sleeps; this is web-page tracking, not guaranteed background/native navigation. The map follow behavior can also be intentionally suspended by the visitor's map gestures and resumed with Recenter.
