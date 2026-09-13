# OFFWARD MAP IMPLEMENTATION PLAN

## Status

Implementation plan based on the frontend and backend pre-implementation audits and the locked Offward canonical documents.

This plan is generic. It does not select or invent a first Country, Place, Route, Story, Video, Waypoint, Segment, or production dataset.

## Objective

Build one canonical geographical system that can represent and display any supported Offward Place, Route, Story, Video, Tour, Event, or country context without making public rendering depend on a live routing provider.

The system must support:

- Place markers
- persisted Route geometry
- ordered route-building Waypoints
- optional Waypoint-to-Place relationships
- ordered media-linked Route Segments
- route calculation during authenticated authoring
- explicit review and acceptance of calculated geometry
- lightweight discovery payloads
- full selected-Route payloads
- contextual maps across public surfaces
- progressive loading
- responsive and accessible interaction
- zero paid map dependency in v1

## Non-Goals

The initial implementation does not include:

- a selected production location or Route
- invented fixtures or seed content
- GPS recording requirements
- frame-accurate video/map synchronization
- a moving playback cursor
- PostGIS or GeoDjango
- public route calculation
- provider-specific data in domain models
- new public URLs for Waypoints or Segments
- changes to Science Workspace or gallery ownership
- ecommerce, pricing, checkout, or payments

## Existing Foundation to Preserve

### Backend

- Offward remains a bounded Django/DRF domain inside the existing Kata Wild backend.
- The namespace remains `/api/offward/...`.
- Existing UUID identities and public slugs remain stable.
- Existing public reads remain separate from authenticated management operations.
- Existing superuser-only Offward management authorization remains the authoring boundary unless changed by a separate authorization decision.
- `RoutePlace` remains the existing ordered editorial relationship between a Route and canonical Places. It is not repurposed as a routing Waypoint.
- Existing reusable media/Video attachment behavior remains available.
- Existing migrations are never rewritten.
- Normal database portability and SQLite fallback are preserved; PostGIS is not introduced.

### Frontend

- React, JavaScript, Vite, React Router, and Axios remain the stack.
- Existing public entity-oriented URLs remain unchanged.
- The shared Axios instance, CSRF behavior, session handling, and management access behavior remain intact.
- Provider-specific map code belongs only inside `src/features/map`.
- Public pages consume services/adapters rather than provider or HTTP details.
- Redux is not introduced.

## Resolved Architecture Decisions

### 1. Country is a hub, not a geographical constraint

The existing singular `Route.country` relationship is preserved initially as the Route's primary or owning Country hub.

It must not be interpreted as proof that every coordinate, Waypoint, Segment, or related Place lies inside that Country. No same-country validation is added to Route Places or Waypoints. This preserves support for cross-border Routes and avoids unnecessary schema change.

Country filtering returns Routes associated with that hub. Broader multi-country discovery can be extended later without changing Route geometry.

### 2. Existing `Route.path` is legacy compatibility data

The current unconstrained `Route.path` cannot become the canonical map contract.

The safe transition is additive:

1. inventory existing values
2. add a new nullable `geometry` field
3. validate all new geometry as GeoJSON `LineString`
4. keep `path` temporarily for backward compatibility
5. migrate only verified compatible values
6. move public and management contracts to `geometry`
7. remove `path` only in a later cleanup after all consumers and stored data are verified

No unknown `path` value is silently reinterpreted.

### 3. Route geometry is stored, provider-neutral data

Canonical Route and Segment geometry uses GeoJSON:

```json
{
  "type": "LineString",
  "coordinates": [[-6.2603, 53.3498], [-6.2500, 53.3450]]
}
```

GeoJSON coordinate order is always `[longitude, latitude]`.

Point fields exposed as objects may use:

```json
{
  "lat": 53.3498,
  "lng": -6.2603
}
```

Public rendering uses saved geometry and never calls OSRM or another routing provider.

### 4. Waypoints are separate from Places

`RouteWaypoint` is a subordinate Route entity used to shape and describe a Route.

Required fields:

- UUID
- parent Route
- explicit order
- latitude
- longitude
- type: `start`, `via`, `stop`, or `finish`
- optional label
- optional Place relationship

A technical via point does not require a Place record.

### 5. Segments are subordinate Route sections

`RouteSegment` represents an ordered section of one Route.

Required fields:

- UUID
- parent Route
- explicit order
- optional title and summary
- validated GeoJSON `LineString` geometry
- optional start Waypoint
- optional end Waypoint
- explicit publication/status behavior consistent with existing Offward conventions

Segment relationships reuse existing canonical content rather than duplicating it:

- reusable Video/media through a deliberate attachment relationship
- Stories through an explicit shallow relationship where required

No Note model is introduced until Offward has a real canonical Note requirement.

Segments do not receive independent public detail URLs in v1.

### 6. Route publication and map renderability are separate questions

A public Route is not automatically assumed to have geometry.

The implementation must expose whether the Route is map-renderable without inventing a new lifecycle unnecessarily. Initial behavior:

- a Route with valid accepted `geometry` may be rendered as a path
- a public Route without geometry remains valid editorial content but is omitted from path rendering
- public reads never calculate missing geometry
- geometry acceptance is an explicit authenticated action

If a dedicated geometry state becomes necessary, it must be introduced by a separate documented contract decision.

### 7. List and detail payloads are different

Route discovery/list responses remain lightweight. Full geometry, Waypoints, Segments, and related media are returned only for a selected Route or explicit map-detail request.

The implementation should prefer existing resource endpoints with deliberate summary/detail serializers before creating dedicated `/map/` endpoints. Dedicated endpoints are added only if measured payload or query requirements justify them.

## Target Backend Shape

```text
Route
├── country                    primary/owning hub; not containment
├── geometry                   nullable validated GeoJSON LineString
├── path                       temporary deprecated compatibility field
├── places                     existing RoutePlace editorial relations
├── waypoints                  ordered RouteWaypoint records
├── segments                   ordered RouteSegment records
└── media                      existing reusable media relationship

RouteWaypoint
├── route
├── order
├── latitude / longitude
├── type
├── label
└── place                      optional

RouteSegment
├── route
├── order
├── title / summary
├── geometry
├── start_waypoint             optional
├── end_waypoint               optional
├── stories                    optional explicit relationship
└── media/videos               reusable attachment relationship
```

## Target API Capabilities

Exact endpoint names are finalized during contract implementation, but the API must provide these capabilities.

### Public discovery

- lightweight Country availability data
- lightweight Place summaries
- lightweight Route summaries without full geometry by default
- generic filters such as Country, status, activity type, and context
- optional visible-bounds filtering later when justified by actual density

### Public Route detail

- stable Route ID and slug
- title, summary, activity type, status, and primary Country hub
- nullable saved GeoJSON geometry
- map-renderability indication derived from validated geometry availability
- ordered Waypoints
- ordered Segments
- canonical related Place IDs or shallow previews
- required shallow Story and media relationships

### Authenticated authoring

- create/update ordered Waypoints
- request candidate route calculation from provider-neutral Waypoint input
- return candidate GeoJSON without automatically publishing or overwriting accepted geometry
- explicitly accept candidate geometry
- manually supply or replace valid geometry
- create/update/reorder Segments
- associate existing reusable content with Segments
- preserve accepted geometry when descriptive Route fields are edited

## Geometry Validation Contract

Create one shared backend validator used by models/serializers/services/imports as appropriate.

Validate:

- value is an object
- `type` is exactly `LineString`
- `coordinates` is an array
- at least two coordinate positions exist
- every position contains at least longitude and latitude
- coordinate values are finite numbers and not booleans
- longitude is between -180 and 180
- latitude is between -90 and 90
- canonical output contains provider-neutral GeoJSON only

Do not attempt computational proof that Segment geometry is a perfect subset of Route geometry in v1. Validate ownership, structure, and endpoints; use author review for approximate Segment placement.

## Implementation Phases

## Phase 0 — Read-Only Data Inventory

### Backend tasks

- inspect every existing `Route.path` value
- classify values as empty, coordinate arrays, GeoJSON-like objects, provider-shaped objects, or invalid/unknown
- count existing Routes and RoutePlace relationships
- identify existing cross-country RoutePlace relationships without treating them automatically as invalid
- inspect current public and management consumers of `path`
- record current API payloads that must remain temporarily compatible

### Deliverable

`docs/.audit/OFFWARD_MAP_DATA_INVENTORY.md`

### Gate

No schema change begins until the inventory establishes whether legacy data requires migration, preservation, or no-op handling.

## Phase 1 — Backend Contract Freeze

### Backend tasks

- define exact Route summary payload
- define exact Route detail payload
- define Waypoint read/write payloads
- define Segment read/write payloads
- define geometry acceptance behavior
- define map-renderability behavior for Routes without geometry
- define error shapes for invalid geometry, invalid order, missing relationships, and routing-provider failure
- define backward-compatibility behavior for `path`

### Frontend participation

- review payload names and shapes only
- confirm they can be normalized through existing service modules
- do not install map dependencies or modify pages

### Deliverable

`docs/OFFWARD_MAP_API_IMPLEMENTATION_CONTRACT.md`

### Gate

No models, migrations, or frontend map code begin until this contract is internally consistent and contains no location-specific assumptions.

## Phase 2 — Geometry Validation and Additive Schema

### Backend tasks

- add shared GeoJSON `LineString` validation
- add nullable `Route.geometry`
- add `RouteWaypoint`
- add `RouteSegment`
- add explicit ordering constraints and useful parent/order indexes
- add optional Waypoint-to-Place relationship
- add optional Segment boundary-Waypoint relationships
- add deliberate Story/media relationships without duplicating canonical content
- register new models in the package exports
- create new migrations without editing migration history

### Compatibility rules

- keep `Route.path`
- do not change existing public responses yet
- do not backfill unknown path data
- do not add same-country database constraints
- do not introduce PostGIS

### Verification gate

- migration applies cleanly on a current database copy
- migration reverses cleanly where technically supported
- existing Offward resources remain readable
- UUIDs, slugs, RoutePlace data, and media attachments remain unchanged
- validation rejects malformed and reversed/out-of-range geometry

## Phase 3 — Backend Read and Write Contracts

### Backend tasks

- introduce Route summary and Route detail serializers
- add optimized selectors for summaries and selected Route detail
- prefetch ordered Waypoints, Segments, RoutePlaces, and required related content
- expose `geometry` as canonical and keep any temporary `path` compatibility explicit
- add protected management persistence for Waypoints and Segments
- implement atomic reorder/update workflows
- ensure descriptive Route PATCH operations preserve geometry
- expose map-renderability without invoking a provider
- add generic filtering supported by existing data and measured needs

### Verification gate

- list responses remain lightweight
- detail responses are deterministic and ordered
- public retrieval performs no routing-provider request
- public permissions remain `AllowAny`
- authoring remains protected by existing Offward management authorization
- query counts remain controlled
- no recursive content graph is serialized

## Phase 4 — Routing Provider Integration

### Backend tasks

- create a provider-neutral routing interface
- implement the initial OSRM-compatible adapter behind `offward/integrations/routing.py`
- keep provider URL, timeout, response translation, and errors inside the integration boundary
- send ordered Waypoint coordinates to the adapter
- translate candidate results into validated GeoJSON
- return candidates without automatically changing accepted Route geometry
- implement explicit acceptance as a separate domain action
- make provider failure non-destructive

### Configuration rule

Provider configuration belongs in environment-backed backend settings only when the implementation actually requires it. Public frontend code never contains routing-provider credentials or authoring endpoints.

### Verification gate

- unauthorized calculation is rejected
- provider timeout/failure preserves stored geometry
- malformed provider responses are rejected
- candidate calculation does not persist automatically
- explicit acceptance persists only validated provider-neutral geometry
- public Route reads still work while the provider is unavailable

## Phase 5 — Frontend Contract Integration

### Frontend tasks

- replace local-array internals with Axios-backed public services as endpoints become available
- add normalizers/adapters for Place summaries, Route summaries, Route detail, Waypoints, Segments, Stories, and media
- keep endpoint strings and Axios calls inside service modules
- implement consistent loading, error, empty, and entity-not-found behavior
- preserve existing public URL patterns
- do not change management forms in this phase

### Verification gate

- pages do not import static entity arrays directly
- presentation components do not call Axios
- unknown entity slugs resolve consistently
- frontend canonical shapes do not expose legacy `path`
- no provider-specific types escape into page/domain features

## Phase 6 — Provider-Independent Map Foundation

### Frontend tasks

- define the public `MapView` interface inside `src/features/map`
- support Places, Routes, Waypoints, Segments, selected Route, selected Place, and selected Segment
- define provider-neutral callbacks for selection and viewport changes
- define compact and expanded modes
- preserve viewport and selection across expansion
- define map loading, empty, and error states

### Gate

The interface must be usable with canonical API data and must contain no Leaflet objects in its public props or page consumers.

## Phase 7 — Leaflet Rendering

### Frontend tasks

- install compatible stable versions of Leaflet and React Leaflet
- keep all imports inside `src/features/map`
- configure OpenStreetMap tiles and required attribution
- render Place markers
- render saved Route GeoJSON
- render Waypoints according to presentation rules
- render Segment geometry
- implement selected/subdued Route styles
- implement complete-Segment highlighting
- never calculate routes during public rendering

### Verification gate

- map renders without paid SDKs or keys
- attribution remains visible
- provider code does not leak into pages
- invalid or missing geometry fails gracefully
- selection callbacks return canonical IDs, not Leaflet objects

## Phase 8 — Contextual Public Maps

Integrate the shared map progressively:

1. selected Route context
2. Place context
3. Country context
4. Explore overview
5. Story context
6. Video context
7. Tour and Event contexts when real relationships require them

The order describes dependency complexity, not a chosen production Place or Route.

### Loading behavior

- overview loads lightweight availability summaries
- Country context loads scoped Place and Route summaries
- selected Route loads full geometry, Waypoints, Segments, and required previews
- Story, Video, Place, Tour, and Event contexts load only referenced geography
- full geometry for every Route is never loaded by default

### Verification gate

- the same map system works across contexts
- no country or location is hard-coded
- multiple Routes can be selected without equal visual emphasis
- canonical entity URLs remain stable

## Phase 9 — Management Map Authoring UI

### Frontend tasks

- move existing direct management Axios relationship calls behind management services
- adapt the Route management form to the authoritative backend contract
- keep RoutePlace editorial relationships separate from Waypoints
- allow ordered start, via, stop, and finish Waypoints
- allow coordinate-only Waypoints and optional Place association
- request candidate routing geometry
- display candidate and currently accepted geometry distinctly
- require explicit acceptance
- support Segment creation and reordering
- support attachment of existing Stories and media
- never silently overwrite accepted geometry during descriptive edits

### Verification gate

- existing Route management remains functional through the transition
- no fake Place is required to shape a Route
- failed calculation loses no accepted data
- reordering is atomic and deterministic
- management UI uses the same provider-neutral geometry contract as public reads

## Phase 10 — Media and Segment Experience

### Frontend tasks

- present selected Video/media above or beside the map according to viewport
- map selected media to its Route Segment
- highlight the complete associated Segment
- keep the remaining Route visible but secondary
- remove or replace highlighting when selection changes
- provide accessible media/Segment selection outside the map canvas

### Explicit exclusion

Do not add a moving vehicle cursor, GPS-time interpolation, or frame-accurate playback synchronization.

## Phase 11 — Responsive, Accessibility, and Performance Hardening

### Tasks

- touch-friendly selectors and previews
- keyboard-accessible non-map alternatives
- focus management for compact/expanded maps and previews
- stable responsive map dimensions
- visible loading/error/empty states
- route and marker alternatives that do not depend on hover
- lazy loading of map code where beneficial
- query-count and payload-size verification
- only add bounds filtering, clustering, or further spatial infrastructure when real density demonstrates the need

## Phase 12 — Real Content Entry and Release

Real production content is selected and supplied separately by the product owner after the generic system is ready.

Release preparation then includes:

- enter approved real Places and Routes
- create or calculate real geometry
- review and explicitly accept geometry
- add approved Waypoints and Segments
- attach existing approved Stories and media
- verify canonical URLs and social metadata
- verify mobile and desktop behavior
- verify public behavior with routing provider unavailable
- release incrementally

No seed command or fixture may invent public content merely to exercise the UI.

## Cross-Repository Execution Order

```text
Backend inventory
→ contract freeze
→ validation and additive schema
→ backend summary/detail and management contracts
→ routing adapter and acceptance workflow
→ frontend services and normalizers
→ provider-independent MapView
→ Leaflet renderer
→ contextual public integration
→ management authoring UI
→ media/Segment interaction
→ accessibility and performance hardening
→ approved real content
```

Backend and frontend changes are separate tasks and separate commits. A phase may be divided further, but later phases must not redefine contracts owned by earlier phases.

## Testing Strategy

Tests are written and run during implementation phases, not during audits.

### Backend coverage

- geometry validation
- Waypoint and Segment ordering constraints
- optional Waypoint-to-Place relationships
- cross-border coordinate and relationship support
- legacy `path` compatibility
- additive migrations
- summary/detail serializers
- permissions
- explicit geometry acceptance
- routing-provider timeout and malformed response handling
- public reads with provider unavailable
- query counts for summary and detail selectors

### Frontend coverage

- service normalization
- loading/error/empty/not-found states
- provider-independent map props and callbacks
- Route and Segment selection
- complete-Segment highlight
- compact/expanded state preservation
- touch and keyboard alternatives
- missing/invalid geometry behavior
- context-scoped requests
- absence of public routing-provider calls

## Stop Conditions

Stop implementation and return to contract review if:

- legacy `Route.path` contains unknown production data that cannot be classified safely
- an implementation requires rewriting existing migrations
- a change would repurpose or destroy `RoutePlace`
- a same-country constraint is proposed
- provider-specific payloads would enter canonical models or public serializers
- public rendering would require live route calculation
- a specific location is being used to redefine generic architecture
- invented production content is requested merely to fill the map
- PostGIS is proposed without measured need
- existing authentication, Science Workspace, gallery ownership, or public URL behavior would be changed incidentally

## First Authorized Implementation Task

The first coding task is not a model or map change.

Perform the read-only backend inventory in Phase 0 and create:

`docs/.audit/OFFWARD_MAP_DATA_INVENTORY.md`

It must report:

- every existing `Route.path` shape and usage
- number of Route records with empty and non-empty `path`
- existing consumers of `path`
- RoutePlace relationship counts and ordering behavior
- cross-country RoutePlace records as observations, not automatic errors
- current public and management Route payloads
- migration compatibility risks

After that inventory is reviewed, Phase 1 freezes the exact API implementation contract. No other backend or frontend change should start before those two gates are complete.

## Definition of Done

The map foundation is complete when:

- canonical provider-neutral geometry is persisted and validated
- Waypoints and Places remain separate concepts
- Segments connect reusable content to approximate Route sections
- public reads never depend on routing-provider availability
- authenticated authors can calculate, review, and explicitly accept geometry
- list/detail payloads load progressively
- the same isolated frontend map system works across relevant contexts
- selected Segments highlight without pretending to track exact playback position
- no location or country is hard-coded into architecture
- existing Offward, authentication, Science Workspace, media, migration, and public routing behavior remains intact
