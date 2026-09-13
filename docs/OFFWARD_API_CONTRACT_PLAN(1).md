# OFFWARD_API_CONTRACT_PLAN

## Status
Locked.

## Purpose
This document defines the canonical backend/API direction for Offward before Django implementation begins.

The goal is to keep frontend content models and backend resources aligned while allowing the backend to remain richer internally where needed.

## Core Backend Direction
- Django
- Django REST Framework
- Offward is implemented inside the existing Kata Wild Django backend project.
- Offward uses the same deployed Kata Wild API/backend service and infrastructure.
- No separate Offward backend service or deployment is introduced.
- Offward exists as its own bounded Django app/domain area inside Kata Wild.
- Offward must not be mixed into Science Workspace models or APIs.
- Public read endpoints come first.
- Authenticated content-management/admin workflows may be added later.

## Canonical API Namespace

```text
/api/offward/countries/
/api/offward/places/
/api/offward/routes/
/api/offward/stories/
/api/offward/videos/
/api/offward/tours/
/api/offward/events/
/api/offward/partners/
```

## Detail Access
Public detail resources should be human-readable and slug-addressable where appropriate.

Examples:

```text
/api/offward/places/muckross-abbey/
/api/offward/routes/killarney-loop/
/api/offward/events/spain-2027/
```

Backend entities should still maintain stable internal identifiers such as IDs or UUIDs.

## Frontend/Backend Contract Principle
**Frontend content models and backend API resources should map cleanly, but backend models are free to be richer internally.**

The frontend should receive only the data it needs in stable, canonical shapes.

## Relationship Rules
- Relationships should use stable IDs and/or slugs.
- Avoid unnecessarily large deeply nested payloads.
- Related entities should remain independently addressable.
- The API should not duplicate canonical content purely for convenience.
- Serializer nesting should remain deliberate and shallow.

## Filtering Direction
List endpoints should be designed so future filtering can be added without changing resource semantics.

Examples:

```text
?country=ireland
?status=active
?activity_type=motorcycle
?event=spain-2027
```

Exact filter names may be refined during implementation, but filters must remain generic and country-agnostic.

## Map Data
The map consumes canonical Place, Route, Route Waypoint, and Route Segment data.

Canonical geometry rules:
- Place and Waypoint coordinates use latitude/longitude fields in the canonical API representation.
- Route and Route Segment geometry is returned as GeoJSON `LineString` data.
- GeoJSON coordinate arrays use `[longitude, latitude]` order.
- Saved Route geometry is authoritative for public rendering.
- Public clients do not call a routing provider to redraw an existing Route.
- Waypoints and Segments are subordinate Route resources in v1; they do not require independent public detail URLs.

Potential future options include:
- using normal Place/Route endpoints with filters or lightweight serializers
- adding dedicated lightweight map endpoints if payload size or performance justifies it

Possible future endpoints:

```text
/api/offward/map/places/
/api/offward/map/routes/
```

Dedicated map endpoints are not locked as mandatory in v1.

Whether normal resource endpoints or dedicated map endpoints are used, the API must support progressive map loading without returning the entire Offward geography graph.

Required query capability direction:

```text
?country=ireland
?bounds=west,south,east,north
?include_geometry=false
?route=killarney-loop
```

Exact parameter naming may be finalized during implementation, but the contract must support:
- lightweight Europe/country summaries
- country-scoped Place and Route discovery
- visible-bounds filtering when justified by map density
- summary results without full route geometry
- full Route detail including geometry, Waypoints, Segments, and required preview relationships

## Route Authoring and Calculation

Road-following route calculation is an authenticated authoring concern, not a public read concern.

Canonical direction:
- editors submit ordered Waypoint coordinates
- an isolated routing integration calculates a candidate path
- the editor reviews or adjusts the candidate
- Offward saves the accepted route as provider-neutral GeoJSON
- public clients consume the saved result

The initial routing integration should be compatible with OSRM while remaining replaceable. Routing-provider URLs, response shapes, and credentials must not leak into public serializers or frontend domain models.

Route recalculation must be explicit. Editing descriptive Route content must not silently replace saved geometry.

## Route Segment Media

A full Route detail response may expose ordered Segments with:
- stable ID
- title and summary where present
- GeoJSON geometry
- start/end Waypoint references where present
- related media preview identifiers/data required by the page

Selecting or playing related media may cause the frontend to highlight the complete associated Segment. Time-synchronized playback coordinates are not required in v1.

## Media
Video/media provider details may be managed by the backend.

The frontend should receive only the playback and display data it needs, such as:
- provider
- provider ID or playback identifier
- playback URL where appropriate
- thumbnail
- duration
- title
- publication status

Cloudflare Stream integration details must remain isolated from general frontend components.

## Tours
Public Tour API behavior for v1:
- no required public price field
- no checkout endpoint
- no online payment model
- direct enquiry/contact only
- tour availability/status may be exposed

## Events / Expeditions
Events must support explicit lifecycle states such as:
- upcoming
- active
- completed

Events may relate to:
- Countries
- Routes
- Places
- Stories
- Videos
- Partners

Dates must be explicit rather than inferred.

## Partners
Partners may represent:
- sponsors
- collaborators
- local businesses
- tourism organizations
- media partners
- other external participants

Partner relationships must remain flexible rather than tied to one product type.

## Authentication
For v1:
- public content is readable without authentication
- public user accounts are not required
- authenticated content management may reuse existing project authentication infrastructure later

Authentication for Offward must not depend on Science Workspace membership or authorization rules.

## Pagination
List endpoints should be pagination-ready even when initial datasets are small.

Pagination behavior should be consistent across resource families.

## API Versioning
Do not introduce `/v1/` unless a real versioning need appears.

Canonical namespace for now:

```text
/api/offward/...
```

## Error Handling Direction
API errors should use consistent response shapes across Offward endpoints.

The frontend should be able to normalize errors through the shared Axios/service layer.

Exact error schema may be defined during implementation.

## Backend Boundary
**Offward is a separate bounded domain inside the existing Kata Wild Django backend, not a separate backend and not an extension of Science Workspace.**

Offward reuses the existing Kata Wild API host, deployment, authentication infrastructure where appropriate, database infrastructure, and shared backend utilities, while keeping its domain models and API namespace independent.

This means:
- separate app/domain ownership
- separate API namespace
- no importing Science-specific business concepts into Offward
- shared infrastructure may be reused where appropriate
- domain rules remain independent

## Locked Principles
- Django + DRF are the backend stack.
- Offward lives inside the existing Kata Wild backend project and deployment.
- Offward uses the existing Kata Wild API/backend service.
- No separate Offward backend is created.
- Offward uses `/api/offward/...`.
- Offward is a separate bounded domain inside Kata Wild.
- Public reads come first.
- Slugs are public-facing; stable IDs/UUIDs remain internal.
- Relationships stay shallow and independently addressable.
- Filters remain generic and country-agnostic.
- Map data comes from Places and Routes.
- Route geometry and Route Segment geometry use GeoJSON `LineString` data.
- Public clients render stored geometry and never calculate existing Routes on page load.
- Route calculation is isolated as an authenticated authoring operation.
- Map reads support progressive, scoped loading rather than returning all geographical detail at once.
- No public prices, checkout, or payment API in v1.
- Public auth is not required in v1.
- Pagination readiness is expected.
- API versioning is deferred until actually needed.
