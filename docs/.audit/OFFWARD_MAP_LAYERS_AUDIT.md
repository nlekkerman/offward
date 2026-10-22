# Offward Map Layer Switcher Architecture Audit

**Audit date:** 22 October 2026  
**Scope:** Read-only review of the existing frontend and publicly documented tile-provider terms. No application code, dependencies, backend, tests, builds, or linting were changed or run.

## Executive summary

Offward already uses Leaflet 1.9 and React-Leaflet 5. The main public Route and Place maps share a `MapView` component and one OSM tile configuration, but Explore, small route previews, and management authoring maps each own separate `MapContainer` instances. There is no existing layer selector.

The least disruptive technical design is to switch only the active basemap `TileLayer`, without changing the mounted `MapContainer` or any route, marker, directions, tracking, drawing, viewport, or popup layers. Route and Place can receive this through their shared `MapView`; Explore needs a small, separate integration because it does not use `MapView`.

The provider requirement is the blocking decision:

- **Standard / OSM:** keep the existing provider, but align its URL with the current OSM tile policy before release.
- **Terrain / OpenTopoMap:** the map is free to use, including commercially, under CC BY-SA with attribution and share-alike obligations. Its public tile service has no guaranteed availability and no published numeric request quota was found; its own page warns against heavy use and provides no availability guarantee.
- **Satellite:** the reviewed sources do **not** establish a high-detail global satellite tile service that can be safely guaranteed to remain €0 with no billing or overage risk. Esri World Imagery has strong coverage and detail, but the official ArcGIS basemap pricing is metered above a free allowance. NASA GIBS is publicly available without a paid plan, but the reviewed satellite visualizations are science products with limited native resolution/zoom and are not equivalent to detailed imagery for local route/place exploration.

**Recommendation:** approve a public-first selector only after deciding whether a limited-resolution NASA imagery layer is acceptable as “Satellite.” If not, do not launch the Satellite option until a provider with suitable imagery and verifiable hard-zero-cost terms is identified. Do not use a paid provider as automatic fallback.

## 1. Existing map architecture

### Leaflet integration and shared configuration

`package.json` directly depends on `leaflet` (`^1.9.4`) and `react-leaflet` (`^5.0.0`); Leaflet CSS is imported by [`map.css`](../../src/features/map/map.css). Leaflet remains the rendering engine throughout the inspected implementation.

The shared OSM attribution and URL are defined in [`tileConfig.js`](../../src/features/map/tileConfig.js) as `MAP_TILE_LAYER`. The same configuration is used by the following independent map mounts:

| Map surface | Current structure | Current overlays / purpose |
|---|---|---|
| Public Route detail | [`MapView.jsx`](../../src/features/map/components/MapView.jsx), mounted by [`RoutePage.jsx`](../../src/pages/RoutePage.jsx) | Route and segment geometries, endpoints/waypoints, related Places, route directions, live location, selected-entity overlays, and Route-specific controls |
| Public Place detail | The same `MapView.jsx`, mounted by [`PlacePage.jsx`](../../src/pages/PlacePage.jsx) | Place marker/label, Place driving and walking directions, access-path geometry, directions marker and popup, and user location |
| Explore | [`ExploreMapBrowser.jsx`](../../src/features/explore/ExploreMapBrowser.jsx) | Route geometries or Place markers, selection and viewport fit; it owns a separate `MapContainer` |
| Route preview cards | [`RouteMiniMap.jsx`](../../src/features/map/components/RouteMiniMap.jsx) | Non-interactive decorative Route line only; zoom controls and map interaction are disabled |
| Management Route editor | [`RouteAuthoringMap.jsx`](../../src/features/map/components/RouteAuthoringMap.jsx), mounted by [`RouteMapEditorPage.jsx`](../../src/pages/manage/routes/RouteMapEditorPage.jsx) | Waypoint/segment editing, manual path drawing, waypoint dragging, candidate and preview geometries |
| Management Place Access editor | [`PlaceAccessAuthoringMap.jsx`](../../src/pages/manage/places/PlaceAccessAuthoringMap.jsx) | Place and access-start markers, accepted/candidate geometry, and manual drawing |
| Management coordinate picker | [`PlaceCoordinatePicker.jsx`](../../src/features/map/components/PlaceCoordinatePicker.jsx), used by [`EntityFormPage.jsx`](../../src/features/management/EntityFormPage.jsx) | Click-to-place coordinate selection and selected-Place marker |

All seven surfaces above currently render a `TileLayer` configured with the shared OSM layer, but only the public Route and Place detail maps share the same map component. `MapView` owns a single `MapContainer`, and accepts map child layers as `mapChildren`; its normal UI overlays are rendered beside the container inside the map wrapper. Explore and each management map construct their own map and tiles directly.

### Controls, dependencies, state and lifecycle

- There is **no** `LayersControl` or other basemap selector in the inspected code.
- Most maps use Leaflet's default zoom control. The read-only [`RouteMiniMap.jsx`](../../src/features/map/components/RouteMiniMap.jsx) explicitly disables zoom controls.
- OSM attribution is passed to each tile layer and displayed through Leaflet's built-in attribution control. No separate shared attribution-control component was found.
- Public Route tracking and recenter UI are rendered by [`RoutePage.jsx`](../../src/pages/RoutePage.jsx), with map-follow and GPS marker behavior in [`RouteUserLocationLayer.jsx`](../../src/features/map/components/RouteUserLocationLayer.jsx). Its `recenterRequest` and `locationFollowing` state live in the page; the layer recenters with `map.setView`.
- Public Place directions and Place Access directions state live in [`PlacePage.jsx`](../../src/pages/PlacePage.jsx). [`PlaceDirectionsLayer.jsx`](../../src/features/map/components/PlaceDirectionsLayer.jsx) and [`RouteDirectionsLayer.jsx`](../../src/features/map/components/RouteDirectionsLayer.jsx) request and draw directions and fit bounds through `useMap`.
- [`MapViewportController.jsx`](../../src/features/map/components/MapViewportController.jsx), [`MapResizeController.jsx`](../../src/features/map/components/MapResizeController.jsx), [`RouteAuthoringMap.jsx`](../../src/features/map/components/RouteAuthoringMap.jsx), and the editor-specific viewport components operate on the already-mounted Leaflet map.
- React state for route, Place, Explore selection, GPS/directions and editing is held by the relevant page/editor components. Leaflet's center and zoom are manipulated through its map instance and viewport controllers; `MapContainer`'s `center` and `zoom` are initial values, not a controlled viewport.
- Map errors are bounded at the React rendering level with [`MapErrorBoundary.jsx`](../../src/features/map/components/MapErrorBoundary.jsx). A tile HTTP/network failure is not a React render error and does not inherently trigger a useful fallback message.

### Current OSM URL-policy note

The existing URL template is `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`. The current [OSMF tile usage policy](https://operations.osmfoundation.org/policies/tiles/) specifies the canonical unsharded URL `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, requires visible attribution, honoring cache headers, and prohibits bulk prefetching/offline use. It describes availability as best-effort with no SLA, and notes service access may be withdrawn. The current subdomain template should therefore be reviewed and aligned with the provider's currently documented URL as part of a production change.

## 2. Provider comparison

Terms and service details below were checked against the linked official provider pages on 22 October 2026. “Free” describes published service/licensing terms, not guaranteed future availability.

| Candidate | URL / integration | Attribution and license | Free-use, quotas, registration and charge risk | Production, coverage and zoom |
|---|---|---|---|---|
| **OpenStreetMap Standard** (existing) | Current code: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`. OSMF's current canonical form: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. | Keep visible `© OpenStreetMap contributors` attribution linking to [OSM copyright](https://www.openstreetmap.org/copyright). OSM data is open; the public tile service has its own use policy. | No API key or registration. The tile service is donation/sponsorship-funded, not an unlimited commercial tile product. No fixed numeric request ceiling was found; users must honor caching, avoid bulk downloads/prefetch, and keep the browser `Referer` available. No paid overage mechanism is published, but service access is best-effort and can be withdrawn. | Policy supports normal interactive website viewing subject to its terms, but gives no SLA. Global OSM coverage varies by data quality; normal OSM raster zoom is commonly available through z19, but that is not a service guarantee in the policy. Existing use can remain the Standard choice. |
| **OpenTopoMap** (Terrain candidate) | Public raster tiles: `https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png` with subdomains `a`, `b`, `c` (the project's page documents `{a|b|c}.tile...`). | [OpenTopoMap](https://opentopomap.org/about) states that the rendered map is CC BY-SA 3.0; its page requires clear attribution and share-alike availability. Underlying data includes OpenStreetMap and SRTM; retain both the OpenTopoMap and OSM credit links in the visible attribution and review the share-alike obligation for the rendered output. | No key, account or registration identified. The map license itself permits commercial use without license fees. The tile service asks that use not overload its servers (e.g. mass downloads) and asks users to notify the project; no numerical rate limit, contractual quota, or SLA was found. No published paid overage, but outages/withdrawal remain possible. | Intended as a topographic global map based on OSM and SRTM; actual detail and elevation coverage vary, especially where source data is limited. The official page does not state a guaranteed maximum zoom or numeric quota. Do not promise a zoom ceiling until the current tile range and provider guidance are confirmed; do not prefetch tiles. This is a plausible €0 Terrain choice with material availability and licensing caveats. |
| **NASA GIBS** (no-charge satellite imagery candidate) | Public OGC WMTS/REST service, e.g. `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/` plus the layer, time, tile-matrix set and tile coordinates. NASA documents public WMTS access and the available layer catalog at [GIBS Access Basics](https://nasa-gibs.github.io/gibs-api-docs/access-basics/) and [Available Visualizations](https://nasa-gibs.github.io/gibs-api-docs/available-visualizations/). A WMTS tile matrix layer is not necessarily a drop-in `{z}/{x}/{y}` XYZ template; implementation must use the documented WMTS URL scheme or a verified compatible layer endpoint. | NASA's [open-data guidance](https://www.earthdata.nasa.gov/engage/open-data-services-software-policies) promotes full and open sharing. GIBS asks for an acknowledgement: “Imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).” Check individual layer metadata for any additional source credits. | Public service; no API key, payment card, billing account or paid plan is advertised for the documented WMTS endpoint. No numeric per-site request ceiling was found in the reviewed GIBS docs; retain reasonable interactive request behavior and expect service availability to be outside Offward's control. No paid overage model was found in the reviewed materials. | Global scientific imagery is available in product-specific projections, times and tile matrices; each product has its own native resolution and maximum level. GIBS documentation explicitly describes pre-determined resolutions and variable matrix limits. These are remote-sensing visualizations, often daily/dated and relatively coarse, not a guaranteed detailed aerial/satellite basemap suitable for identifying local roads, trails or Place access. **Not verified as a suitable direct replacement for high-resolution public map imagery.** |
| **Esri World Imagery / ArcGIS basemap services** (quality benchmark, not recommended under €0 constraint) | Official service metadata and tile service: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`. Supported production integration should use Esri's documented basemap service/API-key flow rather than assume a bare REST URL is an unrestricted free endpoint. | Preserve source credits from the layer/service metadata; ArcGIS basemap integrations require visible attribution. Credits vary by region and imagery source, so a fixed hand-written credit risks being incomplete. | ArcGIS Location Platform's [official pricing page](https://location.arcgis.com/pricing/) currently lists **2 million free basemap tiles, then USD $0.15 per 1,000 tiles**. The supported API-key flow requires an ArcGIS account/key. The free allowance is not a permanent unlimited grant; the published metered tier creates a charge path. No hard-stop, no-card, no-overage configuration was verified. Do not use for Offward unless Esri provides a contract/configuration that guarantees hard €0, with billing and overage disabled. | The [official World Imagery service metadata](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer?f=pjson) describes one-meter-or-better imagery in many areas and lower-resolution satellite coverage worldwide; source resolution and coverage vary by region. Global map coverage with detailed areas, not uniform high resolution. This is the best fit for expected visual quality but fails the strict verifiable no-charge condition as reviewed. |

### Satellite decision

No suitable, high-detail global satellite basemap was verified that meets all of Offward's conditions simultaneously: production use, legal authorization, adequate public-site coverage, no API/usage charge exposure, and no paid fallback or overage path.

NASA GIBS is the viable zero-billing candidate only if Offward explicitly accepts a science-imagery layer with product-specific date/resolution/zoom limits. It should not be labeled or marketed as a detailed satellite view until a specific layer's coverage and native resolution are confirmed as fit for Place and route use. Esri World Imagery is a more conventional imagery option, but its currently published free allowance followed by per-tile pricing means it cannot be approved under the stated €0 condition.

## 3. How a TileLayer change affects existing behavior

Changing which raster tiles are displayed does not change Leaflet's vector overlays or geometry coordinates. The existing route lines, segments, Place/waypoint markers, directions markers/popups, GPS marker and accuracy circle, and editor drawings are separate React-Leaflet layers. They can stay mounted above the selected raster layer.

The safe behavior is:

1. Keep one `MapContainer` mounted with its current props and lifecycle.
2. Replace/update only its one active `TileLayer`; do not key or conditionally remount the `MapContainer`.
3. Keep all existing overlay/controller components in place and in their current order.
4. Give each provider configuration its own URL, attribution and limits; keep exactly one selected basemap active.
5. Do not automatically switch to another external provider on tile errors. That could make a billed provider or a provider with different terms an unannounced fallback.

With that boundary:

- **Route geometries and segments:** remain the same `GeoJSON`/`Polyline` layers and are not recalculated by a basemap choice.
- **Place and waypoint markers:** remain mounted, selectable and draggable where already supported.
- **Directions markers, popups, walking/driving directions:** remain independent overlays; the existing directions requests and results are unrelated to tile choice.
- **Live GPS tracking and recenter:** keep `RouteUserLocationLayer`, `followEnabled`, `recenterRequest`, and the existing Route controls mounted. A basemap choice must not alter following state or trigger viewport fitting.
- **Map center and zoom:** Leaflet keeps the current viewport when only a tile layer is changed. Do not change a `MapContainer` `key` or rerun the initial viewport/fit logic as a side effect of layer selection.
- **Manual Route and Place Access drawing:** keep authoring event handlers, drawing points, drag state and controller layers mounted; a selector click must not be interpreted as a map click, waypoint add, or drawing point.
- **Mobile gestures:** keep the same Leaflet drag/touch/zoom configuration. Ensure the selector is touch-sized, keyboard-operable and does not intercept map gestures except on its own control surface.

## 4. Recommended implementation architecture

This section is a proposal only; no implementation has been made.

### Shared configuration and state

- Replace the single `MAP_TILE_LAYER` object with a small basemap configuration in the existing map feature (prefer extending `tileConfig.js` rather than introducing a new package). Each supported entry should include a stable ID, human label, URL/integration details, required attribution, and any provider-native zoom constraints.
- Use one active layer at a time. Avoid transparent stacked basemaps or a third-party layer-control plugin.
- Keep the selected public basemap in a small shared hook/state helper and persist only the validated layer ID in `sessionStorage`. Initialize from that value; use Standard for missing/invalid storage and for provider options withheld by the no-charge decision. Scope this preference to the browser tab/session and do not add server or account state.
- Share a small accessible selector between public map surfaces. It should use buttons or a labeled select with a visible selected state, keyboard support and an accessible name.

### Tile replacement and attribution

- Mount exactly one `TileLayer` per map and update/recreate that **layer only** when the selected ID changes. A key on the `TileLayer` is acceptable if needed to re-create it with the new provider attribution; do not put the key on `MapContainer`.
- Use provider-supplied attribution exactly, and keep Leaflet's attribution control visible. If an implementation updates `url` in place, explicitly update attribution too; a URL-only update must not leave OSM credits displayed for Terrain/Satellite or leave stale provider credits.
- Set provider-specific `maxNativeZoom`/`maxZoom` based on verified terms and metadata. Do not request above a provider's published matrix/zoom.
- Keep the current no-new-dependency approach. NASA WMTS, if selected, will need a supported WMTS URL pattern; do not treat every provider as an interchangeable XYZ template.

### Failure handling and UI placement

- Surface tile failures with a small non-blocking “Basemap temporarily unavailable” status and a way to select another permitted free layer. Do not hide missing tiles as a success, silently auto-fallback to an unapproved service, or introduce any provider that can bill.
- Keep attribution visible on tile failure.
- On Route detail, do not overlay the selector on the existing top-right Route sections control. On mobile, account for the lower Route detail panel and existing location controls. In Explore, account for the map's reduced scroll-wheel zoom and dedicated reset button. Put the selector in a map-corner control area that remains distinct from Leaflet zoom, attribution, and page-specific overlays at all responsive widths.
- If implemented as a Leaflet control or a clickable overlay inside the map container, stop its pointer/click propagation so a layer-selection tap cannot pan the map, select content, add a waypoint, or add a manual drawing vertex. Keep touch targets at least as usable as current map controls.

## 5. Scope recommendation

| Surface | Recommendation | Reason |
|---|---|---|
| Public Route detail | Include in the first public phase through shared `MapView`. | This is the main interactive route map and shares its shell with Place detail. |
| Public Place detail | Include in the same phase through shared `MapView`. | Same shell, while directions marker/popup behavior needs direct compatibility validation. |
| Explore | Include in the public phase, but wire it separately. | It has its own `MapContainer` and viewport fit; do not assume the `MapView` change reaches it. Reuse only the basemap config, preference and selector. |
| Management Route editor | Defer to a separate approval/integration. | Its map handles waypoint dragging, map-click add mode and manual drawing; a selector control adds interaction risk during edits. It already has its own lifecycle and viewport logic. |
| Management Place Access editor | Defer with Route editor. | It uses clicks to choose an access start or add path vertices. Preventing selector clicks from entering drawing state needs dedicated authoring verification. |
| Management coordinate picker | Keep Standard initially; consider separately. | This is an editor form map whose core task is exact coordinate picking, not public basemap exploration. |
| Route mini preview cards | Keep Standard and omit the selector. | The map is decorative, tiny, aria-hidden and intentionally non-interactive; the control would obscure content without meaningful user benefit. |

Implementing public maps first and management maps later is safer than enabling the control on every `MapContainer` at once. The Route/Place shared shell provides reuse, while separately integrating Explore avoids a structural refactor. Keeping management unchanged preserves its click/drag/drawing affordances and avoids expanding the provider/legal review into editors. The basemap configuration can be shared across phases without requiring identical map component structures.

## 6. Files likely to change after approval

### Public-first phase

- [`tileConfig.js`](../../src/features/map/tileConfig.js) — shared provider configuration; correct the OSM URL template and add only approved, documented tile sources.
- [`MapView.jsx`](../../src/features/map/components/MapView.jsx) — public Route/Place TileLayer selection and shared selector placement without changing the map container lifecycle.
- [`ExploreMapBrowser.jsx`](../../src/features/explore/ExploreMapBrowser.jsx) — separate Explore integration using the shared provider preference and selector.
- [`map.css`](../../src/features/map/map.css) and, if needed, [`explore.css`](../../src/features/explore/explore.css) — responsive selector placement and interaction styling.
- A small selector or session-preference helper under `src/features/map/` may be warranted if the two public map shells cannot share the same UI/state cleanly. No new dependency is indicated.
- [`MapView` tests / map tests](../../src/features/map/) — add focused coverage for active-layer selection, attribution, persistence validation and preservation of overlays/viewport behavior where an existing test pattern is available.

### Later management phase, only if separately approved

- [`RouteAuthoringMap.jsx`](../../src/features/map/components/RouteAuthoringMap.jsx)
- [`PlaceAccessAuthoringMap.jsx`](../../src/pages/manage/places/PlaceAccessAuthoringMap.jsx)
- [`PlaceCoordinatePicker.jsx`](../../src/features/map/components/PlaceCoordinatePicker.jsx)
- Relevant authoring CSS and focused interaction tests.

`RouteMiniMap.jsx` should not be changed for the initial selector scope. The Route and Place page-level GPS/directions components should also remain untouched unless implementation evidence reveals a map lifecycle coupling.

## 7. Risks and compatibility concerns

1. **Satellite cannot yet meet the hard €0 guarantee.** Esri's free allowance is followed by published per-tile charges. NASA GIBS is free but its scientific products may not deliver the detail users expect. This needs product approval, not a code workaround.
2. **Terrain availability is best effort.** OpenTopoMap's own policy does not promise SLA or numeric request quota; its service can be overloaded or withdrawn. Standard OSM is also best effort and has strict tile usage rules.
3. **OpenTopoMap share-alike obligations.** Commercial use is permitted, but the CC BY-SA attribution and share-alike conditions need legal/product acceptance for Offward's displayed map. Preserve clear attribution rather than assuming OSM attribution alone is sufficient.
4. **Current OSM URL needs policy review.** The code uses a subdomain-sharded URL while current OSMF policy documents the unsharded canonical endpoint.
5. **Provider-specific zoom and coverage vary.** A fixed max zoom may yield blank tiles or over-zoomed imagery. Use verified native limits; include appropriate attribution source credits and only request supported matrices.
6. **Layer errors differ from React errors.** The existing React error boundary will not necessarily report a tile server's 404, throttling or network failure. Tile errors need an explicit, non-billing error state.
7. **Viewport controllers can be triggered by unrelated data changes.** A basemap update must not change dependencies or IDs used by `MapViewportController`, `ExploreViewport`, or editor viewport effects; otherwise the user could lose the current center/zoom even if the map instance remains mounted.
8. **Authoring control propagation.** Click-to-add and manual drawing maps are particularly sensitive to event bubbling. This is a reason not to roll the selector into management in the first phase.
9. **Responsive collisions.** Existing public Route section controls, Route location controls, detail overlay, Leaflet zoom and attribution already occupy map corners. Selector placement needs desktop and touch-screen review.
10. **Session persistence semantics.** `sessionStorage` is per tab and is cleared with that tab's session. It will not synchronize a layer change across open tabs; that is intentional for a minimal session-level preference.

## 8. Proposed implementation sequence

1. **Resolve provider and licensing decisions.** Decide whether OpenTopoMap's CC BY-SA/availability caveats are acceptable and whether a low-resolution NASA GIBS layer satisfies the requested Satellite meaning. Reject any billed or overage-capable source under the €0 condition.
2. **Verify approved provider endpoints and constraints.** Confirm attribution wording, tile/WMTS URL format, native zoom/matrix bounds, coverage, and current service terms before coding.
3. **Create shared public basemap data/state.** Add stable IDs and session preference validation; preserve Standard as the fallback default.
4. **Integrate shared Route/Place `MapView`.** Change only the active raster layer and add an accessible selector; keep all map controllers and overlay children mounted.
5. **Integrate Explore separately.** Reuse the configuration, preference and control without replacing its map or modifying its existing viewport-fit behavior.
6. **Add explicit tile failure feedback.** Show provider/network failure and let the user choose another permitted layer; do not configure a paid or automatic provider fallback.
7. **Validate interactions and attribution.** Confirm that each layer switch preserves current center/zoom, route and segment geometry, markers, popup, walking/driving directions, live GPS/follow/recenter, and mobile drag/touch behavior. Confirm attribution changes with the selected provider.
8. **Review public deployment and usage monitoring.** Ensure no prefetch/offline tile behavior is introduced and re-check provider policies before release.
9. **Treat management maps as a separately scoped phase.** Add a selector only after Route waypoint editing, Place Access picking/drawing and coordinate picking have targeted interaction verification.

## 9. Open decisions requiring approval

1. Is OpenTopoMap acceptable despite its CC BY-SA share-alike requirement, non-numeric fair-use expectations and lack of an availability guarantee?
2. Does “Satellite” permit a NASA GIBS scientific imagery layer with coarse/product-specific resolution and date/zoom limits, or must it provide detailed local aerial/satellite imagery?
3. If detailed satellite imagery is required, should Satellite be withheld until a genuinely no-billing/no-overage production source is found, or should the €0 constraint be revisited? This audit does not recommend bypassing official provider terms or using an unapproved endpoint.
4. Should the preference remain session-only (`sessionStorage`) as proposed, or should layer choice persist longer than one tab session?
5. Approve **public maps first** (Route, Place and separately wired Explore), with management editors and mini previews excluded from the initial scope?

## Final recommendation

**Option A — Minimal shared selector**

Add one reusable selector to the shared Route/Place `MapView`, use shared config/state and also add the control to Explore. This is the smallest code path for public maps, but it is easy to mistake `MapView` for a universal map abstraction and either omit Explore or unintentionally expand into management maps with different event/lifecycle behavior.

**Option B — Separate public and management integration**

Share basemap configuration, session preference and selector behavior across public Route/Place and Explore, while wiring Explore separately and leaving management maps and tiny previews unchanged until their own review.

**Option B is safer.** It follows the actual component boundaries, preserves editor click/drag/drawing workflows, avoids unnecessary controls on non-interactive previews, and allows provider licensing and mobile behavior to be validated on public maps before expanding scope. Neither option should expose a paid or potentially overage-billed satellite provider while the €0 condition remains non-negotiable.
