# OFFWARD_DECISIONS

## Status
Locked.

## Purpose
This file is the short canonical decision log for Offward.

It records decisions that materially shape the product, architecture, content model, backend boundary, and UI direction.

Future work should not silently override these decisions. If a locked decision changes, record the new decision explicitly.

## DEC-001 — Product Identity
**Status:** Locked  
**Decision:** Offward is a living travel platform built around places we actually explore, routes we test, stories we tell, and selected experiences people can join.  
**Reason:** Offward is broader than a tour company and should support content, exploration, expeditions, and selected tours.

## DEC-002 — Domain
**Status:** Locked  
**Decision:** The Offward domain is `offward.eu`.  
**Reason:** This is the selected public brand/domain.

## DEC-003 — Countries Are Hubs
**Status:** Locked  
**Decision:** Countries are content/exploration hubs, not products.  
**Reason:** Tours, routes, stories, videos, places, and expeditions can exist independently inside a country.

## DEC-004 — Current Country States
**Status:** Locked  
**Decision:**
- Bosnia — biker-focused tours; bookings/enquiries open
- Ireland — active exploration/content
- Spain — upcoming expedition  
**Reason:** These reflect the current real state of Offward.

## DEC-005 — Commercial Model
**Status:** Locked  
**Decision:** No public prices, online checkout, or online payment flow in v1. Payments are handled on site.  
**Reason:** Offward currently uses direct enquiry/contact rather than ecommerce.

## DEC-006 — Frontend Stack
**Status:** Locked  
**Decision:** React + JavaScript + Vite.  
**Reason:** This is the canonical frontend stack for Offward.

## DEC-007 — Routing
**Status:** Locked  
**Decision:** React Router handles frontend routing. Public routes are entity-oriented and independent from API route structure.  
**Reason:** Public URLs should be human-readable and stable.

## DEC-008 — HTTP Client
**Status:** Locked  
**Decision:** Axios is the only HTTP client. Direct `fetch()` usage is prohibited.  
**Reason:** One consistent API boundary simplifies current and future data access.

## DEC-009 — Frontend Architecture
**Status:** Locked  
**Decision:** Use a feature-first frontend architecture.  
**Reason:** Domain logic should stay grouped by feature and remain maintainable as the platform expands.

## DEC-010 — Static Data to API
**Status:** Locked  
**Decision:** Static local data is temporary and must follow the same conceptual shape expected from the future API.  
**Reason:** The frontend should transition to backend data without major UI rewrites.

## DEC-011 — Backend Location
**Status:** Locked  
**Decision:** Offward lives inside the existing Kata Wild Django/DRF backend project and deployment. No separate Offward backend service is created.  
**Reason:** Reuse existing deployed infrastructure while avoiding unnecessary duplication.

## DEC-012 — Backend Domain Boundary
**Status:** Locked  
**Decision:** Offward is a separate bounded domain inside Kata Wild and is not an extension of Science Workspace.  
**Reason:** Shared infrastructure may be reused while domain models, rules, and APIs remain independent.

## DEC-013 — API Namespace
**Status:** Locked  
**Decision:** Offward uses `/api/offward/...`.  
**Reason:** A dedicated namespace keeps the domain explicit and separate.

## DEC-014 — Public API Direction
**Status:** Locked  
**Decision:** Public read endpoints come first. Public user accounts are not required in v1.  
**Reason:** Initial Offward functionality is content discovery, maps, stories, videos, events, and tour enquiries.

## DEC-015 — Map Role
**Status:** Locked  
**Decision:** The map is a presentation/exploration layer over canonical Places and Routes. It does not own content.  
**Reason:** Places and Routes must remain reusable and independently addressable.

## DEC-016 — Map Provider Isolation
**Status:** Locked  
**Decision:** Provider-specific map code stays inside the dedicated map feature.  
**Reason:** Offward must be able to change map providers without rewriting pages or domain features.

## DEC-017 — Media Reuse
**Status:** Locked  
**Decision:** Media is reusable and may attach to multiple entities.  
**Reason:** A video or other media item may relate to a Place, Route, Story, Tour, or Event without duplication.

## DEC-018 — UI Direction
**Status:** Locked  
**Decision:** Offward uses a minimal, cinematic, map-first UI direction.  
**Reason:** The platform should feel like real exploration and travel reporting, not ecommerce or mass-tourism catalogues.

## DEC-019 — Real Content Only
**Status:** Locked  
**Decision:** Do not invent fake content or empty catalogue sections to make the platform look larger.  
**Reason:** Credibility comes from real places, routes, stories, videos, and experiences.

## DEC-020 — State Management
**Status:** Locked  
**Decision:** Redux is not part of v1. TanStack Query may be added later only if server-state complexity justifies it.  
**Reason:** Keep the initial architecture lean while preserving a clear path for growth.

## DEC-021 — Canonical Route Geometry
**Status:** Locked  
**Decision:** Published Routes store their accepted geometry as provider-neutral GeoJSON `LineString` data. Public visitors render saved geometry and never calculate an existing Route on page load.  
**Reason:** Public maps must remain fast and available independently from a routing provider.

## DEC-022 — Waypoints and Places Are Different
**Status:** Locked  
**Decision:** Routes use explicitly ordered Route Waypoints. A Waypoint may reference a canonical Place but does not have to.  
**Reason:** Technical points used to shape a road must not create fake Places or pollute the content model.

## DEC-023 — Route Segments
**Status:** Locked  
**Decision:** A Route may contain ordered Route Segments that associate Videos, Stories, notes, or other media with an approximate section of the saved Route. The complete associated Segment may be highlighted during media selection or playback. Frame-accurate moving-map synchronization is out of scope for v1.  
**Reason:** Offward needs a clear visual connection between road sections and recorded content without depending on constant speed or GPS-timestamp synchronization.

## DEC-024 — Route Authoring
**Status:** Locked  
**Decision:** An editor may create a Route by placing start, finish, and optional via/stop Waypoints. An isolated routing adapter calculates a candidate road-following path, the editor reviews it, and Offward saves the accepted GeoJSON. Recorded GPS tracks may be supported later but are not required.  
**Reason:** Routes must be creatable from approximate pins and physical landmarks even when no GPS track was recorded.

## DEC-025 — V1 Map Technology
**Status:** Locked  
**Decision:** Leaflet with React Leaflet is the v1 rendering implementation, OpenStreetMap is the initial geographical data source, and road calculation uses an isolated OSRM-compatible adapter. Provider-specific code remains inside the map/routing boundaries.  
**Reason:** This supplies real roads, interactive maps, and route calculation without coupling Offward to Google Maps or a paid SDK.

## DEC-026 — Zero-Cost Map Dependency
**Status:** Locked  
**Decision:** V1 introduces no paid map or routing dependency. Provider attribution and usage policies remain mandatory, and tile/routing configuration must remain replaceable.  
**Reason:** Offward's current operating constraint is no map-service cost while keeping a clean migration path if traffic or provider policy later requires a change.

## DEC-027 — Progressive Map Loading
**Status:** Locked  
**Decision:** Europe views load lightweight country/content summaries; country selection loads country-scoped Place and Route summaries; full Route geometry, Waypoints, Segments, and media load only for the selected Route or page context.  
**Reason:** The application must scale across Ireland, Bosnia, Spain, and future countries without loading every detailed geographical object at once.

## DEC-028 — One Contextual Map System
**Status:** Locked  
**Decision:** Explore, Country, Route, Story, Video, and Place surfaces reuse one canonical map system configured with context-specific data and interaction. They do not implement independent map models.  
**Reason:** Geography should remain consistent and reusable while each surface displays only what matters to its current context.

## Change Rule
If a locked decision is changed later:
1. do not silently edit history
2. add a new decision entry
3. reference the superseded decision
4. explain why the change was made
