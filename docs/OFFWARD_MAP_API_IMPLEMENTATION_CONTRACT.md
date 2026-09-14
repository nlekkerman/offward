# OFFWARD MAP API IMPLEMENTATION CONTRACT

## Status
Locked for Phase 2 backend implementation.

## Purpose
This document is the proposed backend/API contract for the generic Offward map system. It defines the resource shapes, validation rules, compatibility policy, and authoring flow required before implementation proceeds.

This contract is intentionally additive and compatibility-first. It does not implement code, modify migrations, or alter canonical product documents.

## Contract Invariants
The following facts are treated as established and are not open for reinterpretation in Phase 1:

- Offward uses Django and Django REST Framework.
- Offward remains inside the existing Kata Wild backend.
- Offward uses `/api/offward/...`.
- Public detail resources use slugs.
- Internal identities use UUIDs.
- The only Route geometry field is `geometry`.
- Repository-local SQLite contains no `Route` table or `Route` data.
- Existing migrations must not be rewritten.
- `RoutePlace` is an ordered editorial relationship between a Route and canonical Places.
- `RoutePlace` must not become a routing Waypoint.
- The existing singular `Route.country` remains the primary or owning Country hub initially.
- `Route.country` does not establish strict geographical containment.
- Cross-border Routes remain possible.
- No same-country validation is added for Route Places or Waypoints.
- New canonical Route geometry uses GeoJSON `LineString`.
- GeoJSON coordinates use `[longitude, latitude]`.
- Route geometry is saved and provider-neutral.
- Public requests never calculate Route geometry.
- `RouteWaypoint` is a new subordinate Route entity.
- A Waypoint has coordinates and may optionally reference a Place.
- `RouteSegment` is a new subordinate Route entity.
- A Segment represents an approximate section of one Route.
- A Segment may relate reusable media and Stories to that Route section.
- Waypoints and Segments do not receive independent public URLs in v1.
- Routes without geometry may remain valid editorial content.
- A Route without valid geometry is not rendered as a path.
- No dedicated geometry lifecycle field is introduced unless the contract proves one is necessary.
- Road calculation is authenticated authoring behavior.
- Candidate calculation and accepted geometry are separate.
- Descriptive Route updates must never recalculate or overwrite accepted geometry.
- No PostGIS or GeoDjango.
- No paid map dependency.
- No particular country, town, Place, Route, Story, Video, Waypoint, or Segment drives the contract.

---

## 1. Terminology

### Place
A canonical content entity representing a real location or place of interest. A Place is a first-class Offward content record and is not defined by route-building logic. A Place may be referenced by a Route as an editorial relation and may also be referenced by Route Waypoints, but a Place is not automatically created for every technical route-shaping point.

### Route
A canonical Offward journey or path entity. A Route belongs to a primary or owning Country hub, may contain ordered Waypoints and ordered Segments, may have canonical editorial RoutePlace relations, and may expose saved accepted geometry as a GeoJSON `LineString`. A Route is the canonical public entity for a path; the path is not the rendering source in new map behavior.

### RoutePlace
The existing ordered editorial relationship between one Route and canonical Places. It is an editorial association used to attach canonical Places to a Route. It is not a routing Waypoint and does not represent a route coordinate. `RoutePlace` is ordered by `position` and remains separate from map geometry.

### RouteWaypoint
A subordinate Route entity created to shape and describe a Route. Each Waypoint belongs to exactly one Route, has an explicit order, has coordinates, and may optionally reference a canonical Place. Waypoints can be used by authoring to establish route geometry and by the map UI to show route stops and approximate route structure. A Waypoint is not independently public in v1.

### RouteSegment
A subordinate Route entity representing an ordered approximate section of one Route. A Segment is not a separate Route or public entity. It has geometry and may relate reusable media and Stories to that approximate section. Segment geometry is validated separately and is not required to be computationally identical to the full Route geometry.

### Route geometry
The accepted saved map geometry for a Route, represented as GeoJSON `LineString` data. This is the canonical public rendering source for a route path: `{"type":"LineString","coordinates":[[lng,lat],...]}`. Route geometry is saved in provider-neutral form and is never calculated by the public API at read time.

### Segment geometry
The saved geometry for a RouteSegment, represented as GeoJSON `LineString` data. Segment geometry describes an approximate section of the parent Route and may not perfectly match the full Route geometry. It is validated structurally but not proven as a perfect subset in v1.

### candidate geometry
A route geometry produced by an authenticated route-calculation request using ordered Waypoints. Candidate geometry is not automatically accepted or persisted. It is reviewed by an author and may later be accepted explicitly.

### accepted geometry
The saved, validated Route geometry stored on the Route itself and used for public map rendering. Accepted geometry is persisted only after explicit acceptance and validation.

### map-renderable Route
A Route with a valid accepted `geometry` value that can be rendered as a path on the public map. A Route without valid `geometry` is valid editorial content but is not rendered as a path.

### Route summary
A lightweight object for list/discovery endpoints. It contains only fundamental identity, publication metadata, and summary fields required for a list card or map discovery result. It does not include full geometry, Waypoints, Segments, or full relationship graphs.

### Route detail
A full selected-Route object used after the user chooses a specific Route. It includes canonical Route fields, ordered Waypoints, ordered Segments, and required shallow relationship metadata. It remains shallower than the full content graph and does not recursively embed full Place, Story, Video, Tour, or Event objects.

### public read
An unauthenticated request that returns Offward content to the end user. Public reads remain independent of management or routing-provider authorization.

### authenticated authoring operation
A request that requires the existing Offward management permission boundary, including route calculation, geometry acceptance, and creation/reordering of subordinate Route entities. These operations are never public.

---

## 2. Canonical Model Contract

### 2.1 Route additions
The following concrete Django model additions are required on `Route`:

- `geometry`: `models.JSONField(null=True, blank=True, default=None)` storing GeoJSON `LineString` data.
- `map_revision`: `models.PositiveIntegerField(default=0)` as the concurrency token.
- `route_places`: existing editorial relation retained.
- `waypoints`: ordered subordinate `RouteWaypoint` records.
- `segments`: ordered subordinate `RouteSegment` records.

#### Exact field contract

`Route.geometry`
- Concrete Django Field: `models.JSONField(null=True, blank=True, default=None)`
- Default: `None` (`null` in JSON).
- Blank: allowed as `null` or omitted in serializers.
- Null/blank/default behavior: `None` means no accepted geometry is stored. Omitted in update requests means preserve existing geometry value; explicit `null` clears accepted geometry only through an operation authorized to replace or clear accepted geometry. `[]` is always invalid.
- Canonical format: GeoJSON `LineString` object.
- Coordinates: array of positions; each position is `[longitude, latitude]`.
- Minimum positions: at least 2 positions.
- Validation: strict GeoJSON validation as defined in section 4.
- Relationship to geometry: `geometry` is the only Route geometry field and is authoritative for public rendering.
- Map renderability behavior: a Route is considered renderable only when `geometry` is present and valid.

`Route.map_revision`
- Concrete Django Field: `models.PositiveIntegerField(default=0)`
- Default: `0`.
- Increment rules: increment by 1 ONLY when:
  1. the Waypoint collection changes (via atomic collection replacement)
  2. accepted Route geometry changes or is explicitly cleared
- Non-increment rules: descriptive Route edits (updating title, summary, activity_type, status, country) must NOT increment `map_revision`. Segment-only edits must NOT increment `map_revision`.
- Purpose: this is the v1 optimistic concurrency token for route-calculation acceptance.
- Candidate response includes the current `map_revision`.
- Acceptance requests must include `expected_map_revision`.
- A mismatched revision fails with `stale_acceptance_request`.

#### Route geometry default and validity
- A new Route may be created without geometry (omitted geometry during Route creation sets `geometry = null`) and still be valid editorial content.
- A Route with `geometry = null` is valid and public but not map-renderable.
- A Route with no valid `geometry` remains part of the content model but does not render as a path.
- No route recalculation is performed on public reads.

### 2.2 RouteWaypoint
Exact proposed model field contract using concrete Django field types:

- `id`: `models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`
- `route`: `models.ForeignKey("offward.Route", on_delete=models.CASCADE, related_name="waypoints")`
- `order`: `models.PositiveIntegerField()`
- `latitude`: `models.DecimalField(max_digits=9, decimal_places=6)`
- `longitude`: `models.DecimalField(max_digits=9, decimal_places=6)`
- `type`: `models.CharField(max_length=20)` with allowed values: `start`, `via`, `stop`, `finish`
- `label`: `models.CharField(max_length=180, blank=True, null=True)`
- `place`: `models.ForeignKey("offward.Place", on_delete=models.SET_NULL, null=True, blank=True, related_name="waypoints")`
- `coordinates`: public API field object with `lat` and `lng` values derived from `latitude` and `longitude`.
- `created_at`: `models.DateTimeField(auto_now_add=True)`
- `updated_at`: `models.DateTimeField(auto_now=True)`

#### Database constraints
- `route_id` required.
- `order` required and unique within a given Route (`UniqueConstraint(fields=["route", "order"])`).
- `type` restricted to the allowed set.
- `latitude` and `longitude` must be valid decimal values within range.
- `place` may be null.
- A Route may have any number of `via` and `stop` Waypoints.
- A Route may contain at most one `start` and one `finish` at the same time in a valid authored route.

#### Indexes and constraints
- Keep the unique constraint on `(route, order)`.
- Keep an optional index on `(route, type)` for route-aware validation.
- Do not add separate redundant indexes for `(route, order)`, `place_id`, `start_waypoint_id`, or `end_waypoint_id` because Django foreign keys and the unique route-order constraint already cover standard access patterns.

#### Deletion behavior
- Deleting a Route cascades to deleting its Waypoints.
- Deleting a canonical Place must not delete the Waypoint; `place` uses `SET_NULL`, so the technical Waypoint survives without the Place reference.
- Deleting a Waypoint that is still used as a Segment boundary (`start_waypoint` or `end_waypoint`) is rejected with `PROTECT`.

#### Ordering behavior
- `order` is the canonical ordering field.
- Public and management read serializers must always return waypoints sorted ascending by `order`.
- Duplicate order values are invalid and produce `duplicate_order`.

#### Start/finish rule
A valid authored Route that is expected to have a road-following geometry must have exactly one `start` and exactly one `finish` Waypoint. This is a service-layer invariant for geometry-authoring and candidate route calculation only. It is not required for public renderability of a saved or imported Route without Waypoints. The backend must enforce the rule in authoring services and candidate validation.

### 2.3 RouteSegment
Exact proposed model field contract using concrete Django field types:

- `id`: `models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`
- `route`: `models.ForeignKey("offward.Route", on_delete=models.CASCADE, related_name="segments")`
- `order`: `models.PositiveIntegerField()`
- `title`: `models.CharField(max_length=220, blank=True, null=True)`
- `summary`: `models.TextField(blank=True, null=True)`
- `geometry`: `models.JSONField()` storing GeoJSON `LineString` (required, cannot be null, omitted, or `[]`).
- `start_waypoint`: `models.ForeignKey("offward.RouteWaypoint", on_delete=models.PROTECT, null=True, blank=True, related_name="+")`
- `end_waypoint`: `models.ForeignKey("offward.RouteWaypoint", on_delete=models.PROTECT, null=True, blank=True, related_name="+")`
- `needs_review`: `models.BooleanField(default=False)`
- `created_at`: `models.DateTimeField(auto_now_add=True)`
- `updated_at`: `models.DateTimeField(auto_now=True)`

No `status` field is introduced in v1. Segment visibility follows the parent Route; related Stories and media retain their own publication rules.

#### Database constraints
- `route_id` required.
- `order` required and unique within a Route (`UniqueConstraint(fields=["route", "order"])`).
- `geometry` required and must validate as GeoJSON `LineString`.
- `start_waypoint` and `end_waypoint` may be null.
- `start_waypoint` and `end_waypoint` must both belong to the same parent Route when provided.
- Segment title and summary may be empty or null.
- `needs_review` is a geometry compatibility state, not a publication status.

#### Indexes and constraints
- Keep the unique constraint on `(route, order)`.
- Foreign-key indexes for `route_id`, `start_waypoint_id`, and `end_waypoint_id` are created automatically by Django.
- Do not add an index on `(route, type)` for Segments because `RouteSegment` has no `type` field.
- Do not add redundant indexes without evidence of an implemented query requirement.

#### Deletion behavior
- Deleting a Route cascades to deleting its Segments.
- Deleting a Waypoint that is still referenced by a Segment boundary is rejected with `PROTECT`.
- The author must update or remove the Segment boundary before deleting the Waypoint.

#### Ordering behavior
- `order` is the canonical ordering field.
- Public and management read serializers must sort segments ascending by `order`.
- Duplicate order values are invalid and produce `duplicate_order`.

#### Story relationship
- A Segment may have a shallow explicit relationship to Stories through a `ManyToManyField` (`stories = models.ManyToManyField("offward.Story", related_name="segments", blank=True)`).
- The storage pattern must reuse existing canonical Story entities and not create a separate Story model for Segments.
- The relationship must be represented by IDs only (`story_ids`) in public detail payloads.

#### reusable Video/media relationship
- Segment media is not a duplicate local media model; it reuses existing canonical media entities through the existing `VideoAttachment` pattern via `GenericRelation`.
- The public detail payload exposes only shallow media references (`media_ids`) and must not recursively embed full media objects.
- The payload does not invent a new `Note` model.

#### Segment review state
- When accepted Route geometry changes, existing Segments remain stored but all existing Segments become `needs_review = true`.
- Unreviewed Segments (`needs_review = true`) perform no segment-highlighting behavior in the UI and are not publicly highlighted.
- Explicitly saving or reviewing a Segment resets `needs_review` to `false`.
- This is a geometry compatibility state and not publication status.


### 2.4 Exact API Endpoints Contract

All endpoints follow existing Offward backend URL conventions under `/api/offward/...`. Public read endpoints use slugs for entity detail access. Management endpoints use UUIDs and require authenticated Offward Management authorization.

#### Endpoint Summary Table

| Operation | HTTP Method | Path | Authorization | Principal Status Codes |
|---|---|---|---|---|
| Public Route Summary List | `GET` | `/api/offward/routes/` | Unauthenticated | `200 OK`, `400 Bad Request` |
| Public Route Detail | `GET` | `/api/offward/routes/<slug:slug>/` | Unauthenticated | `200 OK`, `404 Not Found` |
| Route Waypoints Management Read | `GET` | `/api/offward/manage/routes/<uuid:uuid>/waypoints/` | Authenticated Management | `200 OK`, `401`/`403`, `404 Not Found` |
| Atomic Waypoints Replacement | `PUT` | `/api/offward/manage/routes/<uuid:uuid>/waypoints/` | Authenticated Management | `200 OK`, `400 Bad Request`, `401`/`403`, `404 Not Found` |
| Atomic Segments Replacement | `PUT` | `/api/offward/manage/routes/<uuid:uuid>/segments/` | Authenticated Management | `200 OK`, `400 Bad Request`, `401`/`403`, `404 Not Found` |
| Candidate Route Calculation | `POST` | `/api/offward/manage/routes/<uuid:uuid>/calculate-candidate/` | Authenticated Management | `200 OK`, `400 Bad Request`, `401`/`403`, `404 Not Found`, `504 Gateway Timeout` |
| Candidate Geometry Acceptance | `POST` | `/api/offward/manage/routes/<uuid:uuid>/accept-geometry/` | Authenticated Management | `200 OK`, `400 Bad Request`, `401`/`403`, `404 Not Found` |

#### Endpoint Details

##### 1. `GET /api/offward/routes/`
- Authorization: Public read (unauthenticated)
- Query Parameters:
  - `country`: optional Country slug or UUID filter
  - `status`: optional publication status filter (`active`)
  - `activity_type`: optional activity type string filter
  - `include_geometry`: optional boolean (`true`/`false`, default `false`). When `true`, includes GeoJSON `geometry` in summary items; omitted when `false`.
- Deterministic Ordering: `title` ascending, then UUID ascending (`ordering = ["title", "uuid"]`).
- Success Response: `200 OK` (Array of Route summary objects matching Section 6)
- Error Response: `400 Bad Request` with `invalid_filter` error code if malformed or unsupported filters (e.g. `bounds`) are passed.

##### 2. `GET /api/offward/routes/<slug:slug>/`
- Authorization: Public read (unauthenticated)
- Path Parameter: `slug` (string)
- Success Response: `200 OK` (Route detail object matching Section 7, including `is_map_renderable`, `map_revision`, ordered `waypoints`, and ordered `segments` with `needs_review`)
- Error Response: `404 Not Found` if the route slug does not exist or is inactive under public visibility rules.

##### 3. `GET /api/offward/manage/routes/<uuid:uuid>/waypoints/`
- Authorization: Authenticated (Offward Management authorization: `IsAuthenticated`, `IsOffwardSuperuser`)
- Path Parameter: `uuid` (parent Route UUID)
- Behavior: Read-only query returning the Route's persisted Waypoints ordered by `order`. Returns `[]` when the Route has no Waypoints. Causes zero database mutations. Does not modify or return `map_revision`.
- Success Response: `200 OK` (Bare array of persisted Waypoint objects serialized with `RouteWaypointPublicSerializer`)
  ```json
  [
    {
      "id": "55555555-5555-4555-8555-555555555555",
      "route_id": "11111111-1111-4111-8111-111111111111",
      "order": 1,
      "type": "start",
      "coordinates": {
        "lat": 44.5678,
        "lng": 11.2345
      },
      "label": "Trailhead",
      "place_id": "33333333-3333-4333-8333-333333333333",
      "created_at": "2026-09-13T12:00:00Z",
      "updated_at": "2026-09-13T12:00:00Z"
    }
  ]
  ```
- Error Responses: `401 Unauthorized` / `403 Forbidden` (non-superuser), `404 Not Found` (unknown Route UUID).

##### 4. `PUT /api/offward/manage/routes/<uuid:uuid>/waypoints/`
- Authorization: Authenticated (Offward Management authorization)
- Path Parameter: `uuid` (parent Route UUID)
- Request Body:
  ```json
  {
    "waypoints": [
      {
        "id": "d01ab8a9-e9cf-4f3d-81eb-7522f3fdda73",
        "order": 1,
        "type": "start",
        "coordinates": { "lat": 44.5678, "lng": 11.2345 },
        "label": "Start",
        "place_id": null
      },
      {
        "order": 2,
        "type": "via",
        "coordinates": { "lat": 44.5765, "lng": 11.2456 },
        "label": "Waypoint",
        "place_id": "7d5d1f27-b0f2-4d87-9094-98ea5f6eabf5"
      },
      {
        "id": "20e81b34-4c65-4c8d-a7b3-c08fb4d4687e",
        "order": 3,
        "type": "finish",
        "coordinates": { "lat": 44.6001, "lng": 11.2678 },
        "label": "Finish",
        "place_id": null
      }
    ]
  }
  ```
- Behavior: Performs atomic collection replacement inside a single database transaction. Items with existing IDs are updated; items without IDs are created; existing items omitted from the payload are deleted; IDs belonging to another route are rejected. Increments parent `Route.map_revision` upon completion.
- Success Response: `200 OK` (Array of updated Waypoint objects)
- Error Responses: `400 Bad Request` (`duplicate_order`, `waypoint_invalid_type`, `waypoint_invalid_coordinates`, `waypoint_place_not_found`), `401 Unauthorized` / `403 Forbidden`, `404 Not Found`.

##### 5. `PUT /api/offward/manage/routes/<uuid:uuid>/segments/`
- Authorization: Authenticated (Offward Management authorization)
- Path Parameter: `uuid` (parent Route UUID)
- Request Body:
  ```json
  {
    "segments": [
      {
        "id": "2862d5c9-fc43-4d0e-93b0-128c9ce0fd93",
        "order": 1,
        "title": "Section title placeholder",
        "summary": "A placeholder segment summary.",
        "geometry": {
          "type": "LineString",
          "coordinates": [[11.2345, 44.5678], [11.2456, 44.5765]]
        },
        "start_waypoint_id": "d01ab8a9-e9cf-4f3d-81eb-7522f3fdda73",
        "end_waypoint_id": "b1d14bf0-a042-4f27-a180-9480d4d6b4f6",
        "story_ids": ["a2a65886-8d76-4c9f-b8d9-9d71232f9d31"],
        "media_ids": ["b8fe719e-ae80-4bca-8178-6f63c6f96e11"]
      }
    ]
  }
  ```
- Behavior: Performs atomic collection replacement inside a single database transaction. Segment geometry is required and cannot be null, omitted, or `[]`. Items with existing IDs are updated; items without IDs are created; omitted existing items are deleted; IDs belonging to another route are rejected. Does NOT increment parent `Route.map_revision`.
- Success Response: `200 OK` (Array of updated Segment objects including `needs_review`)
- Error Responses: `400 Bad Request` (`duplicate_order`, `geojson_*`, `segment_boundary_waypoint_not_found`, `segment_boundary_mismatch`, `segment_missing_related_entity`), `401 Unauthorized` / `403 Forbidden`, `404 Not Found`.

##### 6. `POST /api/offward/manage/routes/<uuid:uuid>/calculate-candidate/`
- Authorization: Authenticated (Offward Management authorization)
- Path Parameter: `uuid` (parent Route UUID)
- Request Body:
  ```json
  {
    "waypoints": [
      { "type": "start", "coordinates": { "lat": 44.5678, "lng": 11.2345 } },
      { "type": "via", "coordinates": { "lat": 44.5765, "lng": 11.2456 } },
      { "type": "finish", "coordinates": { "lat": 44.6001, "lng": 11.2678 } }
    ],
    "profile": "driving"
  }
  ```
- Behavior: Requests candidate road-following geometry from the routing service adapter. Does not persist the candidate or alter `Route.geometry`. Returns current `map_revision`.
- Success Response: `200 OK`
  ```json
  {
    "map_revision": 4,
    "candidate_geometry": {
      "type": "LineString",
      "coordinates": [
        [11.2345, 44.5678],
        [11.2456, 44.5765],
        [11.2678, 44.6001]
      ]
    },
    "distance_meters": 2340,
    "duration_seconds": 210
  }
  ```
- Error Responses: `400 Bad Request` (`geojson_*`, `no_route_found`, `routing_provider_invalid_response`), `504 Gateway Timeout` (`routing_timeout`), `401 Unauthorized` / `403 Forbidden`, `404 Not Found`.

##### 7. `POST /api/offward/manage/routes/<uuid:uuid>/accept-geometry/`
- Authorization: Authenticated (Offward Management authorization)
- Path Parameter: `uuid` (parent Route UUID)
- Request Body:
  ```json
  {
    "candidate_geometry": {
      "type": "LineString",
      "coordinates": [
        [11.2345, 44.5678],
        [11.2456, 44.5765],
        [11.2678, 44.6001]
      ]
    },
    "expected_map_revision": 4
  }
  ```
- Behavior:
  1. Opens single database transaction and locks Route row with `select_for_update()`.
  2. Compares `expected_map_revision` with `Route.map_revision`. If mismatched, aborts transaction and returns `400 Bad Request` with `stale_acceptance_request`.
  3. Validates `candidate_geometry` immediately before saving.
  4. Saves `Route.geometry = candidate_geometry`.
  5. Increments `Route.map_revision += 1`.
  6. Sets `needs_review = True` on all existing Segments belonging to this Route.
  7. Leaves previous accepted geometry untouched on any failure.
  8. Never modifies `Route.path` and never recalculates geometry.
- Success Response: `200 OK`
  ```json
  {
    "id": "8f1a5d40-6e4e-4bf7-962c-5e4b2d3fd7f1",
    "geometry": {
      "type": "LineString",
      "coordinates": [[11.2345, 44.5678], [11.2456, 44.5765], [11.2678, 44.6001]]
    },
    "is_map_renderable": true,
    "map_revision": 5,
    "updated_at": "2026-05-01T12:22:00Z"
  }
  ```
- Error Responses: `400 Bad Request` (`stale_acceptance_request`, `geojson_*`), `401 Unauthorized` / `403 Forbidden`, `404 Not Found`.

---

## 3. Route Geometry Policy

This is the required geometry policy for the generic Offward map system.

### Required behavior
1. New map operations use only `geometry`.
2. Route rendering is based solely on `geometry`.
3. Legacy path values are never interpreted as geometry.
4. The geometry field is the only Route geometry field in all public and management payloads.

### Policy decisions
- `geometry` is the canonical field for all new map behavior.
- Unknown or legacy path payloads are never automatically interpreted.
- New frontend map contracts must not consume any legacy path value.
- Management and public APIs expose the canonical geometry-only contract.

### Exact compatibility behavior
- Public list responses expose only the canonical `geometry` contract.
- Public detail responses expose only the canonical `geometry` contract.
- Management responses expose only the canonical `geometry` contract.
- New geometry-based create/update flows write `geometry` only.
- No compatibility sync is performed between `geometry` and a legacy path value.
- A route is map-renderable only when `geometry` is valid.

---

## 4. GeoJSON Validation Contract

The backend must use a shared validation function for both `Route.geometry` and `RouteSegment.geometry`.

### 4.1 Required object structure
A geometry value must be a JSON object with:

- `type`: exact string value `"LineString"`
- `coordinates`: list of coordinate positions

Any other type is invalid.

### 4.2 Coordinate container rules
- `coordinates` must be an array.
- A `LineString` requires at least 2 positions.
- Each position must itself be an array of exactly 2 numeric values in `[longitude, latitude]` order.
- Additional altitude values are rejected in v1. A position with 3 values is invalid unless a future contract explicitly approves 3D geometry.
- The backend must reject booleans and non-finite values.
- Each numeric value must be a real finite number (`int`/`float` but not `bool`).
- Longitude is required to be within [-180, 180].
- Latitude is required to be within [-90, 90].
- `NaN`, `Infinity`, and `-Infinity` are invalid.
- Empty arrays, nested arrays of wrong shape, and objects instead of arrays are invalid.
- `null`, `[]`, and omitted geometry are handled by the model semantics: `null`/omitted means no accepted geometry, while missing geometry in a create request is not a validation error if the Route is being kept editorial-only.

### 4.3 Malformed inputs
Reject the following explicitly with field-level validation errors:
- wrong top-level type
- missing `coordinates`
- coordinates not array
- too few points
- non-numeric values
- boolean values used as coordinates
- out-of-range longitude or latitude
- nested shape mismatch
- altitude values included
- incomplete positions
- empty coordinate array

### 4.4 Validation error codes
The backend must expose stable codes in API validation errors. Required codes for geometry validation are:

- `geojson_invalid_type`
- `geojson_missing_coordinates`
- `geojson_coordinates_invalid`
- `geojson_too_short`
- `geojson_coordinate_invalid`
- `geojson_longitude_out_of_range`
- `geojson_latitude_out_of_range`
- `geojson_non_finite_number`
- `geojson_boolean_not_allowed`
- `geojson_altitude_not_allowed`

### 4.5 Field-level error response shape
The generic field validation response shape is:

```json
{
  "errors": [
    {
      "code": "geojson_longitude_out_of_range",
      "field": "geometry.coordinates[1][0]",
      "message": "Longitude must be between -180 and 180.",
      "details": {
        "index": 1
      }
    }
  ]
}
```

### 4.6 Segment geometry validation
Segment geometry must validate identically to Route geometry, except that Segment geometry is permitted to be approximate and does not need to be computationally proven to be a subset of the parent Route in v1. Segment geometry is accepted if it is valid GeoJSON `LineString` data and belongs to the same Route as its parent segment.

---

## 5. Route Map-Renderability Contract

### Rule
A Route is map-renderable only when it has valid accepted `geometry`.

### Required behavior
- Public Route with valid `geometry`: rendered as a path on the map.
- Public Route with `geometry = null`: valid editorial content; not rendered as a path.
- Public Route with invalid legacy `path`: not rendered as a path; no automatic interpretation of `path`.
- Inactive Route: excluded from public list/detail/map responses by the existing public selector rule. It must not appear in public route discovery results.
- Upcoming Route: same rule as above; publication and renderability are independent. An upcoming Route may be visible editorially without a path only when the public selector allows it; otherwise it is excluded by the current public visibility rules.
- Accepted candidate geometry: not rendered until explicitly accepted.
- Candidate geometry not yet accepted: not stored as `Route.geometry` and never public-rendered as the accepted Route path.

### Explicit map-renderability field
The API must serialize `is_map_renderable` explicitly as a boolean field on Route summary and detail responses.

Reason: this is a client-stable contract and avoids frontend heuristics that must interpret null, empty, or malformed legacy values. The contract keeps map-renderability explicit and is safer than deriving it from `geometry` on the client without a shared rule.

`is_map_renderable` is computed as:

```text
true only if geometry is present and valid GeoJSON LineString data
false otherwise
```

This field is not a new lifecycle field and does not create a geometry state machine. It is a derived API convenience for rendering decisions.

---

## 6. Public Route Summary Contract

The Route summary is the lightweight discovery object used by list and discovery endpoints. It remains intentionally shallow.

### Exact fields
- `id`: Route UUID
- `slug`: public slug
- `title`: string
- `summary`: nullable string
- `country_id`: UUID of primary Country hub
- `country`: Country slug
- `activity_type`: string or enum value
- `status`: publication state
- `is_map_renderable`: boolean
- `geometry`: included only when `include_geometry=true`

### Required summary policy
- The initial summary payload is limited to exactly: `id`, `slug`, `title`, `summary`, `country_id`, `country`, `activity_type`, `status`, `is_map_renderable`, and optional `geometry` only when `include_geometry=true`.
- No Waypoints, no Segments, no relationship graph, no timestamps, no `place_count`, no media preview arrays, and no extra summary fields are included in the initial summary payload.
- `path` is not used by new frontend contracts and must not be part of the canonical summary contract for new clients.
- If legacy compatibility requires it, `path` may remain in legacy public responses during the transition window, but it is not part of the canonical summary contract.
- Route list ordering is exact: `title` ascending, then UUID ascending.

### Exact JSON example

```json
{
  "id": "8f1a5d40-6e4e-4bf7-962c-5e4b2d3fd7f1",
  "slug": "route-slug-placeholder",
  "title": "Route title placeholder",
  "summary": "A placeholder summary for a route without a specific country or content selection.",
  "country_id": "4dd49f2d-8d6c-4d60-9ff7-26f449d47532",
  "country": "country-slug",
  "activity_type": "cycling",
  "status": "active",
  "is_map_renderable": true,
  "geometry": {
    "type": "LineString",
    "coordinates": [[11.2345, 44.5678], [11.2456, 44.5765], [11.2678, 44.6001]]
  }
}
```

---

## 7. Public Route Detail Contract

The public Route detail response includes the canonical Route object plus ordered subordinate route structure and shallow related data.

### Exact field contract
- `id`
- `slug`
- `country_id`
- `country`
- `title`
- `summary`
- `activity_type`
- `status`
- `geometry`: nullable GeoJSON `LineString`; explicit `null` if absent
- `is_map_renderable`: boolean
- `map_revision`: integer revision token used for candidate acceptance concurrency
- `route_places`: ordered editorial relation to canonical Place IDs only; no deep recursion
- `waypoints`: ordered list of Waypoints
- `segments`: ordered list of Segments
- `media_ids`: reusable media identifiers associated with the Route
- `story_ids`: shallow Story references associated with the Route, if applicable
- `created_at`, `updated_at`

### Nested depth
The maximum nesting depth allowed on the public detail response is 2 levels:
- Route
  - Waypoints
  - Segments
  - route_places
  - media/stories ids

No nested full object graph is allowed. The payload must not recursively embed full Place, Story, Video, Tour, or Event objects.

### Public detail JSON example

```json
{
  "id": "8f1a5d40-6e4e-4bf7-962c-5e4b2d3fd7f1",
  "slug": "route-slug-placeholder",
  "country_id": "4dd49f2d-8d6c-4d60-9ff7-26f449d47532",
  "country": "country-slug",
  "title": "Route title placeholder",
  "summary": "A placeholder summary for a route without a specific country or content selection.",
  "activity_type": "cycling",
  "status": "active",
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [11.2345, 44.5678],
      [11.2456, 44.5765],
      [11.2567, 44.5890],
      [11.2678, 44.6001]
    ]
  },
  "is_map_renderable": true,
  "map_revision": 4,
  "route_places": [
    {
      "place_id": "7d5d1f27-b0f2-4d87-9094-98ea5f6eabf5",
      "position": 1
    }
  ],
  "waypoints": [
    {
      "id": "d01ab8a9-e9cf-4f3d-81eb-7522f3fdda73",
      "route_id": "8f1a5d40-6e4e-4bf7-962c-5e4b2d3fd7f1",
      "order": 1,
      "type": "start",
      "coordinates": {
        "lat": 44.5678,
        "lng": 11.2345
      },
      "label": "Start",
      "place_id": null,
      "created_at": "2026-01-15T09:00:00Z",
      "updated_at": "2026-05-01T12:22:00Z"
    },
    {
      "id": "b1d14bf0-a042-4f27-a180-9480d4d6b4f6",
      "route_id": "8f1a5d40-6e4e-4bf7-962c-5e4b2d3fd7f1",
      "order": 2,
      "type": "via",
      "coordinates": {
        "lat": 44.5765,
        "lng": 11.2456
      },
      "label": "Waypoint",
      "place_id": "7d5d1f27-b0f2-4d87-9094-98ea5f6eabf5",
      "created_at": "2026-01-15T09:00:00Z",
      "updated_at": "2026-05-01T12:22:00Z"
    },
    {
      "id": "20e81b34-4c65-4c8d-a7b3-c08fb4d4687e",
      "route_id": "8f1a5d40-6e4e-4bf7-962c-5e4b2d3fd7f1",
      "order": 3,
      "type": "finish",
      "coordinates": {
        "lat": 44.6001,
        "lng": 11.2678
      },
      "label": "Finish",
      "place_id": null,
      "created_at": "2026-01-15T09:00:00Z",
      "updated_at": "2026-05-01T12:22:00Z"
    }
  ],
  "segments": [
    {
      "id": "2862d5c9-fc43-4d0e-93b0-128c9ce0fd93",
      "route_id": "8f1a5d40-6e4e-4bf7-962c-5e4b2d3fd7f1",
      "order": 1,
      "title": "Section title placeholder",
      "summary": "A placeholder segment summary.",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [11.2345, 44.5678],
          [11.2456, 44.5765]
        ]
      },
      "start_waypoint_id": "d01ab8a9-e9cf-4f3d-81eb-7522f3fdda73",
      "end_waypoint_id": "b1d14bf0-a042-4f27-a180-9480d4d6b4f6",
      "needs_review": false,
      "story_ids": ["a2a65886-8d76-4c9f-b8d9-9d71232f9d31"],
      "media_ids": ["b8fe719e-ae80-4bca-8178-6f63c6f96e11"],
      "created_at": "2026-01-15T09:00:00Z",
      "updated_at": "2026-05-01T12:22:00Z"
    }
  ],
  "media_ids": ["b8fe719e-ae80-4bca-8178-6f63c6f96e11"],
  "story_ids": ["a2a65886-8d76-4c9f-b8d9-9d71232f9d31"],
  "created_at": "2026-01-15T09:00:00Z",
  "updated_at": "2026-05-01T12:22:00Z"
}
```

---

## 8. Waypoint Contracts

### 8.1 Public read shape
The public Route detail response includes waypoints in a shallow shape:

```json
{
  "id": "uuid",
  "route_id": "uuid",
  "order": 1,
  "type": "start",
  "coordinates": {
    "lat": 44.5678,
    "lng": 11.2345
  },
  "label": "Start",
  "place_id": "uuid-or-null",
  "created_at": "2026-01-15T09:00:00Z",
  "updated_at": "2026-05-01T12:22:00Z"
}
```

`place_id` is optional. It may be null if the Waypoint is purely technical.

### 8.2 Subordinate write strategy: atomic collection replacement only
Standalone individual Waypoint create, update, or delete endpoints are not supported in v1. The single v1 write strategy for Waypoints on a Route is atomic collection replacement via `PUT /api/offward/manage/routes/<uuid:uuid>/waypoints/`.

### 8.3 Waypoint item payload shape
When supplying items within the atomic collection replacement payload, each item follows this shape:

```json
{
  "id": "d01ab8a9-e9cf-4f3d-81eb-7522f3fdda73",
  "order": 1,
  "type": "start",
  "coordinates": {
    "lat": 44.5678,
    "lng": 11.2345
  },
  "label": "Start",
  "place_id": null
}
```

`id` is included when updating an existing Waypoint; `id` is omitted when adding a new Waypoint. `route_id` is not included in individual item bodies because the parent Route is established by the endpoint path.

### 8.4 Collection replacement behavior
- Items with existing IDs included in payload: update existing entries.
- Missing existing IDs omitted from payload: delete the missing items.
- Items without IDs: create new items.
- Items with IDs belonging to a different Route: reject entire request with validation error.
- All operations execute within a single database transaction.
- Either the complete replacement succeeds or nothing changes.
- Parent `Route.map_revision` increments by 1 upon successful replacement.

### 8.5 Validation errors
Required validation codes:

- `waypoint_invalid_type`
- `waypoint_invalid_coordinates`
- `duplicate_order`
- `waypoint_place_not_found`
- `waypoint_invalid_order`

### 8.6 Optional Place behavior
- `place_id` is optional.
- A Waypoint may be coordinate-only and still be valid.
- A Waypoint may reference a canonical Place when an author intentionally maps an approximate point to an existing canonical content location.
- There is no same-country validation between a Waypoint's coordinates and the Route's Country hub.

### 8.7 Relationship deletion behavior
- Deleting a Waypoint must not delete the parent Route.
- Deleting a Waypoint referenced by a Segment boundary (`start_waypoint` or `end_waypoint`) is rejected with `PROTECT`.
- The author must first update or remove the Segment boundary before deleting the Waypoint.
- Deleting a `place_id` from a Waypoint clears only the nominal Place reference; the Waypoint remains valid.

### 8.8 Atomic vs incremental write strategy
v1 strategy: atomic collection replacement for all Waypoints on a single Route. Reason: it preserves ordering, avoids partial updates, and provides predictable validation across all route waypoints in one transaction.


---

## 9. Segment Contracts

### 9.1 Public read shape
```json
{
  "id": "uuid",
  "route_id": "uuid",
  "order": 1,
  "title": "Section title placeholder",
  "summary": "A placeholder segment summary.",
  "geometry": {
    "type": "LineString",
    "coordinates": [[11.2345, 44.5678], [11.2456, 44.5765]]
  },
  "start_waypoint_id": "uuid-or-null",
  "end_waypoint_id": "uuid-or-null",
  "needs_review": false,
  "story_ids": ["uuid"],
  "media_ids": ["uuid"],
  "created_at": "2026-01-15T09:00:00Z",
  "updated_at": "2026-05-01T12:22:00Z"
}
```

Every public Segment response includes `needs_review`. Unreviewed Segments (`needs_review = true`) do not highlight in the UI until reviewed and saved.

### 9.2 Subordinate write strategy: atomic collection replacement only
Standalone individual Segment create, update, or delete endpoints are not supported in v1. The single v1 write strategy for Segments on a Route is atomic collection replacement via `PUT /api/offward/manage/routes/<uuid:uuid>/segments/`.

### 9.3 Segment item payload shape
When supplying items within the atomic collection replacement payload, each item follows this shape:

```json
{
  "id": "2862d5c9-fc43-4d0e-93b0-128c9ce0fd93",
  "order": 1,
  "title": "Section title placeholder",
  "summary": "A placeholder segment summary.",
  "geometry": {
    "type": "LineString",
    "coordinates": [[11.2345, 44.5678], [11.2456, 44.5765]]
  },
  "start_waypoint_id": "uuid-or-null",
  "end_waypoint_id": "uuid-or-null",
  "story_ids": ["uuid"],
  "media_ids": ["uuid"]
}
```

`id` is included when updating an existing Segment; `id` is omitted when adding a new Segment. Segment geometry is required and cannot be null, omitted, or `[]`. `route_id` is not accepted in item bodies because the parent Route is implied by the endpoint path.

### 9.4 Collection replacement behavior
- Items with existing IDs included in payload: update existing entries.
- Missing existing IDs omitted from payload: delete the missing items.
- Items without IDs: create new items.
- Items with IDs belonging to a different Route: reject entire request with validation error.
- All operations execute within a single database transaction.
- Either the complete replacement succeeds or nothing changes.
- Segment-only collection replacement does NOT increment parent `Route.map_revision`.

### 9.5 Geometry requirements
- Must be valid GeoJSON `LineString`.
- Must contain at least 2 positions.
- Must use `[longitude, latitude]` order.
- Cannot be null, omitted, or `[]`.
- No requirement for computational subset proof against parent Route geometry in v1.

### 9.6 Boundary Waypoint behavior
`start_waypoint_id` and `end_waypoint_id` are optional. When present, they must belong to the same parent Route. Segment boundary mismatch is invalid.

### 9.7 Story relationship shape
- `story_ids` is a list of canonical Story IDs stored via `ManyToManyField`.
- Story objects are not recursively embedded.

### 9.8 Reusable media relationship shape
- `media_ids` is a list of reusable media IDs managed via `VideoAttachment` (`GenericRelation`).
- Media objects are not recursively embedded.

### 9.9 Validation errors
- `geojson_invalid_type`
- `geojson_too_short`
- `segment_boundary_waypoint_not_found`
- `segment_boundary_mismatch`
- `duplicate_order`
- `segment_missing_related_entity`
- `segment_invalid_order`

### 9.10 Relationship to Route geometry
Accepting replacement Route geometry does not silently modify Segments. The acceptance response marks all existing Route Segments `needs_review = true`. Existing Segments remain stored but are not assumed to match the revised Route automatically.

---

## 10. Public Filtering Contract

The initial public filtering contract supports these query parameters for discovery endpoints:

- `country`: Country UUID or slug, used as a primary Country hub filter only
- `status`: publication status filter
- `activity_type`: generic activity filter
- `include_geometry`: boolean, default false for list/discovery endpoints
- `bounds`: visible bounds filter only if the implementation explicitly supports it; otherwise reject it with a clear invalid-filter error

### Required behavior
- Country filtering remains a hub/content filter, not geographical containment validation.
- A Route may belong to a Country hub yet cross into other geographies without violating the contract.
- `include_geometry` is accepted only as a boolean.
- `bounds` is not required in v1 and may be rejected if unsupported.
- Unsupported or malformed filters must return `400 Bad Request` with the stable error code `invalid_filter`.

### Invalid filter behavior
```json
{
  "errors": [
    {
      "code": "invalid_filter",
      "field": "bounds",
      "message": "Visible bounds filtering is not supported in the current Route discovery contract.",
      "details": {
        "value": "west,south,east,north"
      }
    }
  ]
}
```

### Additional filter rules
- `country` accepts only a valid Country identifier or slug in the configured namespace.
- `status` must be restricted to the defined route publication states.
- `activity_type` accepts only a known value from the configured domain vocabulary.
- Invalid or unknown values produce `400` and not silent fallback.

---

## 11. Summary and Detail Serializer Boundary

### Serializer boundary
- `RouteSummarySerializer`: public list/discovery serializer.
- `RouteDetailSerializer`: public selected detail serializer.
- `RouteWaypointSerializer`: public nested waypoint serializer.
- `RouteSegmentSerializer`: public nested segment serializer.
- `RoutePlaceSummarySerializer`: shallow editorial Place relationship serializer.

### Selector requirements
Selectors must do the following:
- `select_related("country")` for Country hub data
- `prefetch_related("route_places__place")` for shallow RoutePlace lookups
- `prefetch_related("waypoints")` for route detail
- `prefetch_related("segments")` for route detail
- `prefetch_related("media")` or equivalent reusable media relation
- `prefetch_related("stories")` or equivalent story relation if used by the route detail

### Maximum intended nesting
- Route detail uses maximum 2 levels: Route → Waypoints / Segments / route_places / IDs.
- No recursive embed of full Place, Story, Video, Tour, or Event objects.
- No deep graph serialization.

### Deterministic ordering
- Route list discovery ordering is title ascending, then UUID ascending.
- Waypoints: order by `order` ascending.
- Segments: order by `order` ascending.
- RoutePlace: order by `position` ascending.

### Avoiding N+1
- Route list query must use select/prefetch for Country hub and shallow related IDs.
- Route detail query must prefetch Waypoints, Segments, RoutePlaces, and required shallow relationships.
- Public detail must not execute one query per waypoint or segment.

---

## 12. Authenticated Route-Calculation Contract

Route calculation is not a public route read. It is an authenticated authoring operation.

### Core operation
The backend receives an ordered set of Waypoints with coordinates and optional Place references, and it returns a candidate Route geometry.

### Exact request shape
```json
{
  "waypoints": [
    { "type": "start", "coordinates": { "lat": 44.5678, "lng": 11.2345 } },
    { "type": "via", "coordinates": { "lat": 44.5765, "lng": 11.2456 } },
    { "type": "finish", "coordinates": { "lat": 44.6001, "lng": 11.2678 } }
  ],
  "profile": "driving"
}
```

### Validation rules
- At least 2 Waypoints are required to request a candidate route.
- Explicit route-authoring validation should require exactly one start and one finish for candidate generation.
- Waypoints are accepted in order as supplied.
- The server must not silently reorder them.
- Coordinate validation uses the same GeoJSON and latitude/longitude rules as the Route and Segment models.

### Provider-neutral service boundary
The provider-specific response must not leak into public or general domain APIs. The routing integration boundary maps provider output into standard internal data only.

### Candidate response shape
```json
{
  "map_revision": 4,
  "candidate_geometry": {
    "type": "LineString",
    "coordinates": [
      [11.2345, 44.5678],
      [11.2456, 44.5765],
      [11.2678, 44.6001]
    ]
  },
  "distance_meters": 2340,
  "duration_seconds": 210
}
```

No candidate is stored in the database. A provider name is not part of the public contract.

### Timeout handling
- Routing requests must have an explicit timeout.
- A timeout must produce a stable error code: `routing_timeout`.

### No-route results
- When the provider cannot find a route, the API must return a clear error code: `no_route_found`.

### Malformed provider responses
- If the provider returns invalid or malformed data, the backend must reject the candidate and return `routing_provider_invalid_response`.

### Authorization failure
- If the caller is not authorized, return `permission_denied` or the project-standard auth error shape. The operation must never be public.

### Provider independence
- Provider-specific URL, credentials, and transport details remain server-side only.
- They do not appear in public API responses.

---

## 13. Geometry-Acceptance Contract

Candidate calculation and accepted geometry are separate actions.

### Rule
A candidate geometry is not saved automatically. Candidate geometry must be reviewed and explicitly accepted before it becomes the accepted Route geometry.

### Exact lifecycle
1. An author creates or updates a Route's Waypoints.
2. The author requests candidate geometry.
3. The backend validates input and returns a candidate plus the current `map_revision`.
4. The author reviews the candidate.
5. The author explicitly accepts the candidate through POST /api/offward/manage/routes/<uuid:uuid>/accept-geometry/.
6. The acceptance request must include `expected_map_revision`.
7. The backend locks the Route row in a transaction and re-validates the candidate immediately before persistence.
8. If the revisions differ, the server returns `stale_acceptance_request` and leaves the previous accepted geometry unchanged.
9. If accepted, the candidate becomes `Route.geometry` and the Route `map_revision` increments.
10. If rejected or failed, the previous accepted geometry remains unchanged.

### Temporary storage
- Candidate geometry is not persisted as the accepted Route geometry unless the acceptance request explicitly saves it.
- Candidate geometry may be returned in a transient request/response but is not a stored state requirement in v1.

### Concurrency protection
- Acceptance requests must guard against stale updates.
- The required contract is optimistic concurrency using `map_revision` + `expected_map_revision` on the Route.
- A stale acceptance request must fail with `stale_acceptance_request`.

### Transactional behavior
- The persistence of accepted geometry must be atomic.
- The backend must validate the candidate immediately before save.
- If validation fails, the previous accepted geometry remains untouched.
- The backend must not partially persist a broken geometry.

### Segment review on Route geometry replacement
- When accepted Route geometry changes, all existing Segments remain stored but are marked `needs_review = true`.
- Unreviewed Segments are not publicly highlighted.
- Explicitly saving or reviewing a Segment resets `needs_review` to `false`.
- Accepting replacement Route geometry does not silently rewrite Segment geometry.

### Auditability expectations
- No new audit model is introduced in v1.
- The application logs author ID, Route ID, previous `map_revision`, new `map_revision`, and success/failure.
- The backend must never log full geometry or provider credentials.
- The implementation must preserve the prior accepted geometry on a failed acceptance.

### Response after successful acceptance
```json
{
  "id": "8f1a5d40-6e4e-4bf7-962c-5e4b2d3fd7f1",
  "geometry": {
    "type": "LineString",
    "coordinates": [[11.2345, 44.5678], [11.2456, 44.5765], [11.2678, 44.6001]]
  },
  "is_map_renderable": true,
  "map_revision": 5,
  "updated_at": "2026-05-01T12:22:00Z"
}
```

---

## 14. Management Route Update Contract

Ordinary Route create/update behavior must preserve existing data while making the new geometry model explicit.

### Required rules
- Omitted `geometry` must preserve the existing value.
- Descriptive edits must preserve the accepted geometry.
- Omitted Waypoints must be preserved.
- Omitted Segments must be preserved.
- Omitted RoutePlaces must be preserved.
- Omitted media relationships must be preserved.
- Explicit empty collections have clear meaning: an empty list replaces the list with no entries.
- `null` and omitted values are distinct: omitted means preserve; `null` means clear the field only when the create/update semantics explicitly allow clearing.
- Invalid geometry cannot be persisted.
- Relationship replacement is atomic.

### Exact update semantics
- Route update operations must never recalculate or overwrite accepted geometry as a side effect of descriptive edit operations.
- A descriptive update request that does not include `geometry` must not wipe or recalculate existing geometry.
- A management update that includes `waypoints` or `segments` must treat the request as a full relationship replacement for that route in one transaction.
- A management update that includes `route_places` must replace the RoutePlace set atomically.
- A management update that includes `media_ids` or `story_ids` must replace those relationships atomically if those relationship lists are explicitly passed.

### v1 write strategy for Route metadata, Waypoints, and Segments
- Route metadata uses ordinary `PATCH`.
- Waypoints use one atomic collection replacement operation.
- Segments use one atomic collection replacement operation.
- Existing item IDs are included when updating.
- Missing existing IDs mean deletion.
- Items without IDs mean creation.
- The entire request succeeds or nothing changes.

This is the safe v1 strategy because it prevents half-reordered routes and keeps Route metadata changes separate from subordinate graph changes.

---

## 15. Error Contract

The backend must expose a stable error envelope for all map-related failures.

### Generic error envelope
```json
{
  "errors": [
    {
      "code": "geojson_longitude_out_of_range",
      "field": "geometry.coordinates[1][0]",
      "message": "Longitude must be between -180 and 180.",
      "details": {
        "index": 1
      }
    }
  ]
}
```

### Required error codes
- `geojson_invalid_type`
- `geojson_missing_coordinates`
- `geojson_coordinates_invalid`
- `geojson_too_short`
- `geojson_coordinate_invalid`
- `geojson_longitude_out_of_range`
- `geojson_latitude_out_of_range`
- `geojson_non_finite_number`
- `geojson_boolean_not_allowed`
- `geojson_altitude_not_allowed`
- `duplicate_order`
- `waypoint_place_not_found`
- `segment_boundary_waypoint_not_found`
- `segment_boundary_mismatch`
- `segment_missing_related_entity`
- `permission_denied`
- `routing_timeout`
- `routing_provider_unavailable`
- `no_route_found`
- `stale_acceptance_request`
- `internal_error`
- `invalid_filter`

### Example: malformed GeoJSON
```json
{
  "errors": [
    {
      "code": "geojson_invalid_type",
      "field": "geometry.type",
      "message": "Geometry type must be LineString.",
      "details": {
        "received": "Point"
      }
    }
  ]
}
```

### Example: duplicate order
```json
{
  "errors": [
    {
      "code": "duplicate_order",
      "field": "waypoints",
      "message": "Waypoint order values must be unique within a Route.",
      "details": {
        "duplicate_orders": [2, 2]
      }
    }
  ]
}
```

### Example: stale acceptance request
```json
{
  "errors": [
    {
      "code": "stale_acceptance_request",
      "field": "expected_map_revision",
      "message": "The Route was updated after the candidate was generated. Please reload and re-accept.",
      "details": {
        "route_id": "8f1a5d40-6e4e-4bf7-962c-5e4b2d3fd7f1",
        "expected_map_revision": 4,
        "current_map_revision": 5
      }
    }
  ]
}
```

### Example: routing timeout
```json
{
  "errors": [
    {
      "code": "routing_timeout",
      "field": "candidate_geometry",
      "message": "Route calculation timed out.",
      "details": {
        "timeout_seconds": 10
      }
    }
  ]
}
```

### Example: authorization failure
```json
{
  "errors": [
    {
      "code": "permission_denied",
      "message": "This route calculation requires Offward management authorization.",
      "details": {
        "operation": "route_calculation"
      }
    }
  ]
}
```

---

## 16. Compatibility and Rollout Contract

The required rollout sequence is:

1. add new schema fields (`geometry`, `RouteWaypoint`, `RouteSegment`)
2. preserve `path` in old public and management serializers
3. expose `geometry` in new route detail and authoring contracts
4. add Waypoint and Segment management endpoints and serializer patterns
5. introduce Route summary/detail serializers with explicit `is_map_renderable`
6. implement routing candidate calculation behind authenticated management authorization
7. implement explicit geometry acceptance to store accepted geometry
8. transition the frontend to `geometry` and remove `path` from new map contracts
9. deprecate `path`
10. eventually remove `path` only after verification and migration window closure

### Rollback behavior
- During early phases, rollback is safe when geometry is still additive and `path` remains in place.
- If a frontend or management client depends on `path`, do not remove it until the migration window has passed.
- If candidate generation or acceptance fails, the previous accepted geometry remains untouched.
- If a geometry validation error occurs, no write is persisted.
- Do not rewrite existing migrations or silently delete legacy `path` data.

---

## 17. Security Contract

- Public reads remain unauthenticated.
- Authoring remains protected by the existing Offward management permission boundary.
- Routing calculation is not public.
- Geometry acceptance is not public.
- Provider configuration remains server-side.
- Public API responses expose no provider credentials or internal provider errors.
- Science Workspace authorization is not introduced into Offward.

---

## 18. Open Questions

No contract questions remain unresolved by the supplied canonical documents and authoritative facts. All required Phase 1 decisions are fixed in this document.

---

## Final Contract Checklist

Use this checklist to confirm implementation compliance:

- [ ] `Route.geometry` exists as the canonical accepted geometry field.
- [ ] `Route.map_revision` exists and is incremented when Waypoints or accepted geometry change.
- [ ] `path` is preserved as a temporary compatibility field and not treated as canonical map data.
- [ ] `geometry` uses GeoJSON `LineString` and `[longitude, latitude]` coordinate order.
- [ ] `Route` may exist without valid geometry and remain valid editorial content.
- [ ] A Route with no valid geometry is not rendered as a path.
- [ ] `is_map_renderable` is explicit and derived from valid geometry only.
- [ ] `RouteWaypoint` exists as a subordinate Route entity with explicit order and optional `place_id`.
- [ ] `RouteWaypoint.type` allows only `start`, `via`, `stop`, and `finish`.
- [ ] `RouteWaypoint` has exactly one `start` and `finish` rule only for candidate route calculation, not for saved/imported Route renderability.
- [ ] `RouteWaypoint.place` uses `SET_NULL` and a deletion is rejected when still referenced by a Segment boundary.
- [ ] `RouteSegment` exists as a subordinate Route entity with ordered geometry and optional boundary Waypoints.
- [ ] `RouteSegment.needs_review` exists and is set when accepted Route geometry changes.
- [ ] `RouteSegment` does not receive a separate public URL in v1.
- [ ] Segment geometry is validated as GeoJSON `LineString` but is not required to be a perfect subset of the parent Route in v1.
- [ ] Public summary responses are exact and remain lightweight: `id`, `slug`, `title`, `summary`, `country_id`, `country`, `activity_type`, `status`, `is_map_renderable`, and optional `geometry` only when `include_geometry=true`.
- [ ] Public detail responses include Route geometry, ordered Waypoints, and ordered Segments without recursive full-object embedding.
- [ ] RoutePlace remains the editorial relationship and does not become a Waypoint.
- [ ] Country filtering remains a hub/content filter, not a strict geographic containment rule.
- [ ] `include_geometry` defaults to false for list/discovery endpoints.
- [ ] Unsupported bounds filtering is rejected with `invalid_filter`.
- [ ] Route candidate calculation is authenticated and separate from accepted geometry.
- [ ] Candidate geometry is explicit and not auto-saved.
- [ ] Candidate acceptance uses `map_revision` and `expected_map_revision` with stale rejection logic.
- [ ] Accepted geometry is validated immediately before persistence.
- [ ] Route update semantics preserve omitted data and never recalculate or overwrite accepted geometry during descriptive edits.
- [ ] Error responses use a stable error envelope and stable codes for route and geometry problems.
- [ ] The rollout preserves `path` during the transition, then deprecates it only after verification.
- [ ] Security boundaries prohibit public routing and public geometry acceptance.
- [ ] Accepting replacement Route geometry does not silently rewrite existing Segments; review remains required.
- [ ] The backend logs Route ID, author ID, previous/new `map_revision`, and success/failure without logging full geometry or provider credentials.

---

## Final Contract Status
Status: Locked for Phase 2 backend implementation.

This locked Phase 2 contract is the specification for the backend implementation of the Offward generic map system. It explicitly defines the compatibility boundary, geometry validation, route rendering rules, subordinate Route entity contracts, exact API endpoints, concrete model field types, and transition policy without inventing production content or implementation shortcuts. It is locked for Phase 2 backend implementation.
