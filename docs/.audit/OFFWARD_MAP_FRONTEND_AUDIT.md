# Offward Frontend Map Pre-Implementation Audit

**Audit date:** 2026-09-12  
**Scope:** The current frontend repository only: React/Vite configuration, routing, public pages and services, static-data boundaries, feature structure, management surfaces, authentication, CSS, and HTTP/provider boundaries.  
**Method:** Read-only review of the current repository and these canonical documents only:

- `docs/OFFWARD_DECISIONS(1).md`
- `docs/OFFWARD_MAP_CANON(1).md`
- `docs/OFFWARD_CONTENT_MODEL(1).md`
- `docs/OFFWARD_INFORMATION_ARCHITECTURE(1).md`
- `docs/OFFWARD_FRONTEND_ARCHITECTURE(1).md`
- `docs/OFFWARD_UI_CANON(1).md`
- `docs/OFFWARD_ROUTING_CANON(1).md`
- `docs/OFFWARD_API_CONTRACT_PLAN(1).md`

No other repository or external source was used. The report does not require or reference a product-canon document outside this source set.

## Assessment Summary

The existing frontend is a suitable foundation for waiting on the backend map contract. React, JavaScript, Vite, React Router, Axios, feature-first folders, public entity-oriented URLs, a dedicated `features/map` boundary, and general responsive CSS are already aligned with the intended architecture. No provider-specific map implementation or direct `fetch()` usage was found.

The repository does contain implemented structures that will eventually need correction or completion: the management Route shape (`path` plus Place stops) is not the canonical frontend Route model, one management form performs direct Axios requests, and most public entity pages do not yet resolve their slugs or produce entity-level 404 results. These are real implementation issues, but none prevents defining the backend contract. The management form should be aligned after the backend contract is authoritative rather than changed speculatively now.

## Current Architecture

### Application and routing

`package.json:1-22` establishes React, JavaScript, Vite, React Router DOM, and Axios. `src/app/App.jsx:1-5` composes the application through `RouterProvider`, while `src/app/router.jsx:1-35` owns the public router. The public paths are generic and entity-oriented: `/explore`, `/countries/:countrySlug`, `/places/:placeSlug`, `/routes/:routeSlug`, `/stories/:storySlug`, `/videos/:videoSlug`, `/tours/:tourSlug`, and `/events/:eventSlug`. Management is separated under `manage/*` in `src/app/manageRouter.jsx:1-60`.

### Data and service boundaries

`src/services/apiClient.js:1-51` provides one shared Axios instance, credentials, CSRF handling, and request configuration. `src/services/countriesApi.js:1-22` uses that client for public country reads. `src/services/placesApi.js:1-5`, `src/services/routesApi.js:1-5`, `src/services/storiesApi.js:1-5`, `src/services/videosApi.js:1-5`, `src/services/toursApi.js:1-5`, and `src/services/eventsApi.js:1-5` currently expose local data through service functions. The public pages do not import the static data modules directly; `CountryPage` calls a service at `src/pages/CountryPage.jsx:3-31`.

The static entity modules currently export empty arrays, for example `src/data/places.js:1` and `src/data/routes.js:1`. This provides no content-shape evidence, but it also does not force a location-specific or provider-specific design. Canonical content must be supplied later through the service boundary after the backend model and payload shape are defined.

### Features, pages, and presentation

The repository has the canonical feature directory scaffold, including `src/features/map`, and populated management feature code. Public entity pages are currently thin route shells. `src/pages/CountryPage.jsx:1-59` has country loading, error, and null handling; `src/pages/PlacePage.jsx:1-9`, `src/pages/RoutePage.jsx:1-9`, `src/pages/StoryPage.jsx:1-9`, `src/pages/VideoPage.jsx:1-9`, `src/pages/TourPage.jsx:1-9`, and `src/pages/EventPage.jsx:1-9` currently render `RoutePlaceholder` with the route parameter.

`src/index.css:1-391` supplies the existing visual foundation, general layout rules, management responsive breakpoints, and a small-screen breakpoint. It does not contain map-specific behavior, which is expected before map implementation begins.

### Authentication and management separation

`src/services/authApi.js:1-106` keeps session normalization, CSRF, login/logout, and Offward management access behind the shared API client. `src/app/manageRouter.jsx:1-60` keeps authenticated management routing separate from public routing. This is compatible with the canonical separation between public reads and later authenticated authoring.

## Compatibility Review

### Compatible foundation

- The locked React + JavaScript + Vite stack is already in place.
- React Router owns route composition and public URLs are independent from API URL structure.
- Public routes are generic and country-agnostic in the router; no country-specific route branch was found in `src/app/router.jsx:18-34`.
- The shared Axios client and existing service modules provide the intended migration boundary from local data to API data.
- The feature-first directory structure provides a safe home for a provider-independent map interface and an isolated provider implementation.
- The empty `src/features/map` boundary can safely contain future `MapView`, adapters, hooks, utilities, Leaflet/React Leaflet integration, OpenStreetMap attribution, and provider event translation.
- No `fetch()` call was found under `src`; the HTTP search found Axios use only in service modules and one management form.
- No Leaflet, React Leaflet, MapLibre, Mapbox, routing-provider, or other map-provider code was found outside the map boundary.
- Existing CSS provides a general responsive base without imposing a conflicting map model.
- Local/lifted/router state remains available for future selected Route and selected Segment state without requiring Redux.

### Future implementation, not a finding

The following capabilities are not implemented and are expected future work. Their absence does not constitute a defect, blocker, high-severity finding, or architectural failure in this pre-implementation audit:

## Planned Map Functionality — Intentionally Not Yet Implemented

- provider-independent `MapView`
- Leaflet and React Leaflet rendering
- OpenStreetMap tiles and attribution
- Place markers and previews
- saved GeoJSON `LineString` Route rendering
- canonical Route Waypoints and ordered Route Segments
- selected Route and selected Segment state
- complete-Segment highlighting
- contextual map configuration for entity pages
- scoped or progressive map requests and lightweight summaries
- full selected-Route detail loading
- compact and expanded map presentation
- touch, keyboard, loading, empty, error, and map-specific accessibility behavior
- public route calculation

These must be implemented later in the generic order described at the end of this report, using real content selected separately by the product owner.

## Genuine Findings

### F-001 — Management Route shape is not the canonical frontend Route model

- **Severity:** high
- **Classification:** genuine contradiction
- **Repository evidence:** `src/features/management/entityConfig.js:27-42` defines Route defaults with `path` and `places`, while `src/features/management/EntityFormPage.jsx:10-25` normalizes Route relationships into `{ place_id, position }` objects. `src/features/management/EntityFormPage.jsx:223-236` serializes that `path` value as an opaque string or parsed value, and `src/features/management/EntityFormPage.jsx:513-540` renders only ordered Place selectors.
- **Relevant canonical rule:** The Content Model and Map Canon require a Route with saved GeoJSON `LineString` `geometry`, ordered `waypointIds`, ordered `segmentIds`, separate `placeIds`, and provider-neutral relationships. Decisions DEC-021, DEC-022, DEC-023, and DEC-024 distinguish Route geometry, Waypoints, Segments, and canonical Places.
- **Concrete impact:** The current management payload cannot author or represent coordinate-only Waypoints, Waypoint types, ordered Segments, or segment-linked media. If treated as the public canonical model, it would conflate content Places with technical route-shaping points and prevent reliable map-facing normalization.
- **Recommended action:** After the backend Route contract is approved, introduce an explicit adapter or revise the management Route form so backend-specific fields do not become the public frontend map model. Keep `geometry`, Waypoints, Segments, and `placeIds` distinct. Do not change this form speculatively before the backend contract exists.

### F-002 — Direct Axios requests exist in a management presentation feature

- **Severity:** medium
- **Classification:** genuine contradiction
- **Repository evidence:** `src/features/management/EntityFormPage.jsx:1-4` imports `apiClient`, and `src/features/management/EntityFormPage.jsx:76-116` calls management relationship endpoints directly. CRUD access is already abstracted by `src/services/management/entityApi.js:1-30`.
- **Relevant canonical rule:** The Frontend Architecture HTTP Boundary Rules prohibit direct Axios calls from pages and general presentation components. HTTP concerns and endpoint strings belong in service modules.
- **Concrete impact:** Endpoint paths and response-shape handling are coupled to the form component. This is outside the public map path, but it makes service normalization and later management-model changes harder to isolate.
- **Recommended action:** Move relationship-option loading into a management service module when management work is next scheduled. It is not an immediate prerequisite for defining the public map contract.

### F-003 — Public entity resolution is incomplete and inconsistent

- **Severity:** medium
- **Classification:** genuine contradiction
- **Repository evidence:** `src/app/router.jsx:19-32` provides stable entity-oriented routes. `src/pages/CountryPage.jsx:3-46` resolves a country through `getCountryBySlug` and renders `NotFoundPage` for a null result. In contrast, `src/pages/PlacePage.jsx:1-9`, `src/pages/RoutePage.jsx:1-9`, `src/pages/StoryPage.jsx:1-9`, `src/pages/VideoPage.jsx:1-9`, `src/pages/TourPage.jsx:1-9`, and `src/pages/EventPage.jsx:1-9` render placeholders without resolving their slugs.
- **Relevant canonical rule:** Routing Canon requires independently addressable entity URLs and unknown entity slugs to resolve to 404. Frontend Architecture assigns page-level loading/error/empty orchestration to pages and data access to services.
- **Concrete impact:** The existing public URL shapes are suitable, but most detail routes cannot yet distinguish a real entity, an empty state, a failed request, and an unknown slug. This will matter when contextual map data is attached to entity pages.
- **Recommended action:** Add generic slug-resolution methods and consistent loading, error, empty, and not-found handling when the corresponding backend read contracts are defined. Preserve the current public paths; do not introduce location-specific routes.

## Supporting Observations

- The public service layer is uneven: countries use Axios while other domain services currently return empty local arrays. This is not a map contradiction because static data is permitted by DEC-010, but each service will need canonical normalization once API payloads exist.
- `src/pages/ExplorePage.jsx:6-38` treats an empty country result as a loading state, so a valid empty response cannot currently be distinguished from an in-flight request. This is a general async-state issue, not a blocker for backend map contract work.
- The current public pages are placeholders and therefore do not yet demonstrate the canonical content model. No production content or fixtures should be invented to address that gap.

## Current Frontend Readiness

The frontend architecture is ready to wait for the backend map contract. The stack, routing ownership, shared Axios boundary, feature-first organization, management/public separation, and empty map feature boundary are all suitable starting points. Existing code does not force a provider choice into pages, require all geography to load at once, or hard-code a location into the frontend architecture.

## Immediate Frontend Work Required

No application change is required immediately for map readiness. The immediate prerequisite is coordination: let the backend contract define canonical Place coordinates, Route GeoJSON, Waypoints, Segments, relationships, statuses, summary/detail payloads, filtering, and error shapes. The frontend should then add adapters and services against that contract. Do not install map dependencies, create fixtures, revise management forms, or build a location-specific slice before that contract is authoritative.

## Work That Must Wait

The following work must wait for backend models and API payloads:

- canonical data adapters and service methods
- summary versus full-detail request shapes
- country, bounds, viewport, and selected-context request parameters
- Route geometry, Waypoint, Segment, and media relationship mapping
- management-form translation or revision
- consistent entity not-found behavior based on API responses

Leaflet integration and map interaction may follow the contract; they should not define it.

## Genuine Existing Contradictions

The management Route form currently contradicts the canonical separation of `geometry`, Waypoints, Segments, and related Places. The management form also bypasses the service boundary for relationship reads. Public entity pages do not yet meet the canonical unknown-slug behavior consistently. These contradictions are real, but none blocks backend contract definition because the backend contract can establish the canonical model independently of the current management UI and placeholder pages.

## Non-Blocking Technical Debt

The uneven local service implementations, empty static datasets, placeholder public detail pages, and incomplete async-state distinction are foundation debt rather than evidence that the future map architecture is unsuitable. They should be addressed as the relevant public content and API work is implemented, without inventing production content or broadening the map scope.

## Existing Functionality to Preserve

- React, JavaScript, Vite, React Router, and Axios as the locked stack.
- Public entity-oriented URL patterns and country-agnostic router definitions in `src/app/router.jsx`.
- Separation between public routing and authenticated `manage/*` routing.
- The shared Axios instance, CSRF/session behavior, and Offward access checks.
- Service ownership of public data access; no direct `fetch()` usage.
- The `src/features/map` boundary as the only future home for provider-specific map code.
- Independent Place, Route, Story, Video, Tour, and Event entity URLs.
- General CSS and responsive layout foundations unless map-specific requirements later justify additions.
- Management functionality and existing forms until the backend contract provides a reason and migration plan to change them.
- The absence of synchronized moving playback cursors in v1; the canon explicitly defers that behavior.

## Generic Future Implementation Order

1. Backend contract becomes authoritative.
2. Add frontend canonical data adapters and services.
3. Define the provider-independent map interface.
4. Add the Leaflet/React Leaflet provider implementation inside `features/map`.
5. Add generic Place and Route rendering using canonical coordinates and saved GeoJSON.
6. Add generic Waypoint and Segment rendering, selection, and complete-Segment highlighting.
7. Integrate the map into contextual pages through page-level state and feature components.
8. Add progressive loading with lightweight summaries and full selected-context detail.
9. Add responsive, touch, keyboard, attribution, loading, empty, and error behavior.
10. Verify the implementation with real content chosen separately by the product owner.

## Final Verdict

The frontend is a compatible pre-implementation foundation and can safely wait for the backend map contract. The missing map capabilities are absent because map work has not started; they are planned functionality, not defects or blockers. The actual incompatibilities are confined to existing management/public implementation details: the non-canonical management Route shape, direct Axios calls in the management form, and incomplete public entity resolution. Those issues should eventually be corrected, but none blocks backend contract work. The map implementation, canonical adapters, payload-specific loading, and management-model migration must wait until backend models and API payloads are defined. The existing `features/map` boundary can safely contain the future generic implementation without selecting a country, Place, Route, or content item.
