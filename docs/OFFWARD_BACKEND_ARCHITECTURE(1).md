# OFFWARD_BACKEND_ARCHITECTURE

## Status
Locked.

## Purpose
This document defines the canonical backend architecture for the Offward domain inside the existing Kata Wild Django/DRF backend.

The goal is to keep Offward clearly separated, easy to navigate, and maintainable as Countries, Places, Routes, Stories, Videos, Tours, Events, Partners, and related domain logic grow.

## Backend Location
Offward lives inside the existing Kata Wild backend project and deployment.

It is:
- not a separate backend
- not a Science Workspace extension
- a separate bounded Django domain inside Kata Wild
- mounted under `/api/offward/...`

## Canonical Folder Structure

```text
offward/
├── __init__.py
├── apps.py
├── urls.py
│
├── models/
│   ├── __init__.py
│   ├── country.py
│   ├── place.py
│   ├── route.py
│   ├── story.py
│   ├── video.py
│   ├── tour.py
│   ├── event.py
│   └── partner.py
│
├── serializers/
│   ├── __init__.py
│   ├── country.py
│   ├── place.py
│   ├── route.py
│   ├── story.py
│   ├── video.py
│   ├── tour.py
│   ├── event.py
│   └── partner.py
│
├── views/
│   ├── __init__.py
│   ├── countries.py
│   ├── places.py
│   ├── routes.py
│   ├── stories.py
│   ├── videos.py
│   ├── tours.py
│   ├── events.py
│   └── partners.py
│
├── selectors/
│   ├── __init__.py
│   ├── countries.py
│   ├── places.py
│   ├── routes.py
│   ├── map.py
│   ├── stories.py
│   ├── videos.py
│   ├── tours.py
│   ├── events.py
│   └── partners.py
│
├── services/
│   ├── __init__.py
│   ├── publishing.py
│   ├── media.py
│   ├── routing.py
│   └── relations.py
│
├── integrations/
│   ├── __init__.py
│   └── routing.py
│
├── management/
│   ├── __init__.py
│   └── commands/
│       ├── __init__.py
│       └── seed_countries.py
│
└── migrations/
    ├── __init__.py
    └── ...
```

The exact service files may evolve as real domain actions appear. Empty architectural layers should not be created purely for decoration.

`Route`, `RouteWaypoint`, and `RouteSegment` may remain together in `models/route.py` while cohesive. Split them only if the module crosses the normal file-size/responsibility threshold.

## File Size Rule
**Application files should normally remain below approximately 400 lines of code.**

If a file approaches or exceeds this size:
- split it by domain responsibility
- do not continue adding unrelated logic
- prefer smaller focused modules over large general-purpose files

The 400-line limit is an architectural warning threshold, not a reason to split cohesive code unnaturally.

## Responsibility Rules

### `models/`
Owns database schema and model-level invariants.

Models should contain:
- fields
- constraints
- indexes
- relationships
- small cohesive model behavior where appropriate

Models should not contain:
- HTTP behavior
- serializer concerns
- large orchestration workflows
- provider integrations
- unrelated cross-domain business logic

### `serializers/`
Owns API representation and request validation.

Serializers may:
- shape public API payloads
- validate API input
- expose canonical fields
- resolve simple relationship representation

Serializers should not become the main business-logic layer.

### `views/`
Owns the HTTP boundary.

Views may:
- enforce permissions
- parse request parameters
- call selectors/services
- return DRF responses
- handle HTTP-specific errors

Views should not contain:
- complex query logic
- large business workflows
- provider-specific integrations
- long data-transformation pipelines

### `selectors/`
Owns reusable read/query logic.

Selectors should contain:
- filtered querysets
- reusable retrieval functions
- optimized relation loading
- read-side domain logic

Examples:
- active Countries
- Places filtered by country
- published Stories for a Country
- Routes related to an Event
- lightweight map summaries scoped by country or visible bounds
- Route detail with explicitly prefetched Waypoints and Segments

### `services/`
Owns domain actions and write-side workflows.

Services should contain:
- create/update workflows
- publishing actions
- relation-management actions
- media-association workflows
- multi-model domain operations

Services should not be generic dumping grounds. Add a service module only when a real domain action needs one.

### `urls.py`
Owns routing only.

Keep URL declarations readable and explicit.

Do not place business logic in URL modules.

### `management/commands/`
Owns explicit operational/admin commands such as:
- idempotent canonical seed data
- one-off maintenance operations when appropriate

Seed commands should be safe to rerun where practical.

## Domain Separation
Offward may reuse shared Kata Wild infrastructure where appropriate, including:
- Django/DRF project configuration
- database infrastructure
- deployment infrastructure
- shared authentication infrastructure where later needed
- shared low-level utilities

Offward must not depend on Science Workspace business concepts.

Prohibited examples:
- importing Observation workflows into Offward
- requiring Science Workspace membership for public Offward reads
- using Science-specific role/capability rules as Offward domain rules
- storing Offward content inside Science models for convenience

## Entity Module Rule
Each major Offward domain entity should normally have its own focused modules.

Examples:

```text
models/story.py
serializers/story.py
views/stories.py
selectors/stories.py
```

```text
models/video.py
serializers/video.py
views/videos.py
selectors/videos.py
```

This pattern applies to:
- Country
- Place
- Route
- Story
- Video
- Tour
- Event
- Partner

Not every entity requires its own service module unless it has real write-side/domain actions.

## Geospatial Storage Boundary

Offward stores provider-neutral geographical data:
- latitude/longitude for Places and Route Waypoints
- GeoJSON `LineString` geometry for Routes and Route Segments
- explicit ordering for Waypoints and Segments

The initial implementation does not require PostGIS. JSON/GeoJSON-compatible storage is sufficient for the first bounded dataset, provided validation enforces correct geometry types and coordinate order. A future spatial database decision must be driven by real querying or scale requirements rather than introduced pre-emptively.

Route geometry is persisted after authoring. Public reads must never depend on a live routing-provider request.

## Routing Integration Boundary

Road-following calculation belongs behind `integrations/routing.py` and is orchestrated through a focused routing service.

Provider-specific concerns include:
- request/response translation
- provider URL and configuration
- timeout and provider error handling
- conversion to validated GeoJSON

Domain services receive and return provider-neutral Waypoints and geometry. The initial adapter may target OSRM, but no provider-specific schema may leak into models, public serializers, or general views.

Route calculation is used only during authenticated content authoring. The accepted geometry is saved before publication.

## Map Read Boundary

Map reads should use selectors designed for scoped payloads. They must support country/context filtering first and visible-bounds filtering when dataset size justifies it.

Europe-level reads return lightweight country/content availability summaries. Full Route geometry, Waypoints, Segments, and media relationships are loaded only for selected Route/detail contexts.

## Import Rules
Package `__init__.py` files may re-export canonical public classes/functions where useful.

Avoid:
- circular imports
- wildcard imports
- hidden cross-domain coupling
- importing view-layer code into models/services
- importing serializer code into models

Dependency direction should generally remain:

```text
views
→ serializers / selectors / services
→ models
```

Not the reverse.

## Query Discipline
Reusable or non-trivial query logic should move into selectors rather than being duplicated across views.

Use:
- `select_related`
- `prefetch_related`
- explicit ordering
- explicit filtering

where appropriate and justified by actual API usage.

Do not prematurely optimize unused query paths.

## API Discipline
Offward endpoints remain under:

```text
/api/offward/...
```

Public API behavior should remain:
- explicit
- shallow
- stable
- domain-focused

Avoid huge serializers that recursively embed the full content graph.

## Public Read Direction
Public read endpoints are the first priority.

Public read access must remain independent from Science Workspace membership.

Authenticated content-management APIs may be added later when needed.

## Media Boundary
Offward media relationships must remain independent from existing gallery ownership unless a later explicit architecture decision changes this.

Provider-specific video/media integration should be isolated behind dedicated service/integration code rather than spread through models, serializers, and views.

## Migrations
Migrations remain standard Django migrations inside:

```text
offward/migrations/
```

Do not hand-edit migration state casually.

Model changes must be represented by migrations before deployment.

## Seed Data
Canonical seed data should use explicit management commands when needed.

Current example:

```text
python manage.py seed_countries
```

Seed commands should:
- be idempotent where practical
- preserve stable internal IDs
- avoid creating duplicate canonical records
- operate only on the intended Offward domain data

## Refactoring Existing Offward Files
The current first Offward implementation may still use flat files such as:

```text
offward/models.py
offward/serializers.py
offward/views.py
```

Before the domain grows substantially, these should be migrated into the canonical package structure defined here.

That refactor should:
- preserve API behavior
- preserve model identity and migration history
- avoid unnecessary schema changes
- avoid mixing the structural refactor with new feature implementation when possible

## Architecture Principle
**The Offward folder structure should make the domain visible before opening a file.**

A developer should be able to understand where Country, Place, Story, Video, Route, Tour, Event, and Partner behavior belongs simply by looking at the directory tree.

## Locked Principles
- Offward remains a bounded domain inside Kata Wild.
- Major domain entities get focused modules.
- Models, serializers, views, selectors, and services have explicit responsibilities.
- Application files should normally stay below approximately 400 lines.
- Large files are split by responsibility before they become maintenance problems.
- Views remain thin.
- Query logic belongs in selectors.
- Write-side workflows belong in services.
- Models remain focused on schema and model invariants.
- API serialization remains shallow and deliberate.
- Geographical domain data remains provider-neutral.
- Public route rendering uses persisted GeoJSON rather than live route calculation.
- Routing-provider code remains isolated in an integration adapter used by authenticated authoring workflows.
- PostGIS is deferred until demonstrated spatial-query or scale requirements justify it.
- Science Workspace business logic must not leak into Offward.
- Folder structure should clearly expose the Offward domain architecture.
