# OFFWARD_CONTENT_MODEL

## Status
Locked.

## Purpose
This document defines the canonical content shapes used by Offward.

Static frontend data used today should follow the same conceptual shape expected from the future API so the UI can transition from local data to backend data with minimal change.

## Country
```js
{
  id,
  slug,
  code,        // IE, BA, ES
  name,
  summary,
  status,      // active, upcoming, inactive
  heroMediaId
}
```

## Place
```js
{
  id,
  slug,
  countryId,
  name,
  summary,
  body,
  coordinates: {
    lat,
    lng
  },
  mediaIds: [],
  visitedAt,
  status
}
```

## Route
```js
{
  id,
  slug,
  countryId,
  title,
  summary,
  activityType,   // motorcycle, hiking, car, boat, cycling...
  geometry: {     // GeoJSON LineString; final saved route path
    type: "LineString",
    coordinates: [[lng, lat]]
  },
  waypointIds: [], // ordered route-building/navigation points
  segmentIds: [],  // ordered selectable sections of this route
  placeIds: [],    // related canonical Places; not the route geometry
  mediaIds: [],
  status
}
```

## Route Waypoint
```js
{
  id,
  routeId,
  order,
  coordinates: {
    lat,
    lng
  },
  placeId,       // optional canonical Place reference
  label,         // optional author-facing or public label
  type           // start, via, stop, finish
}
```

A waypoint may reference a canonical Place, but it does not have to. This allows an editor to place routing points directly on a real road without creating fake Places merely to shape the path.

## Route Segment
```js
{
  id,
  routeId,
  order,
  title,
  summary,
  geometry: {    // GeoJSON LineString representing this section
    type: "LineString",
    coordinates: [[lng, lat]]
  },
  startWaypointId,
  endWaypointId,
  storyIds: [],
  mediaIds: [],
  status
}
```

A Route Segment is a stably identifiable subordinate section inside a Route used to associate a Video, Story, note, or other media with the approximate road section it documents. It does not require an independent public URL in v1. Segment geometry is not synchronized to video playback time in v1.

## Story
```js
{
  id,
  slug,
  countryId,
  title,
  excerpt,
  body,
  publishedAt,
  placeIds: [],
  routeIds: [],
  eventIds: [],
  mediaIds: [],
  status
}
```

## Video
```js
{
  id,
  slug,
  title,
  provider,       // e.g. cloudflare later
  providerId,
  thumbnail,
  duration,
  publishedAt,
  status
}
```

## Tour
```js
{
  id,
  slug,
  countryId,
  title,
  summary,
  routeIds: [],
  placeIds: [],
  mediaIds: [],
  enquiryOpen,
  status
}
```

No price field is required in v1.

## Event / Expedition
```js
{
  id,
  slug,
  countryId,
  type,
  title,
  summary,
  startsAt,
  endsAt,
  status,         // upcoming, active, completed
  routeIds: [],
  placeIds: [],
  mediaIds: []
}
```

## Partner
```js
{
  id,
  slug,
  name,
  website,
  logoMediaId,
  summary,
  status
}
```

## Canonical Rules

- `id` is stable and must not depend on display text.
- `slug` is human-readable and URL-safe.
- Relationships use entity IDs rather than duplicated nested objects.
- Dates use ISO 8601.
- Coordinates use `{ lat, lng }`.
- GeoJSON geometry uses standard `[lng, lat]` coordinate order.
- Route geometry is a saved GeoJSON `LineString`; visitors do not calculate it on page load.
- Waypoint order and segment order are explicit.
- Route Waypoints may optionally reference Places, but route shaping must not require creation of a Place.
- Route Segments belong to one Route and must represent a section of that Route.
- `placeIds` express canonical content relationships; they do not replace waypoints or geometry.
- `status` is explicit and must not be inferred from unrelated fields.
- Media is referenced by ID.
- Country-specific fields such as `bosniaTourType` are prohibited.
- API-specific nesting is not part of the canonical frontend model.
- Backend-only implementation fields are not part of the frontend canon.
- New fields should be generic enough to support multiple countries and activity types.
- Static data today should match the conceptual shape expected from future API responses.

## Locked Principle
**Static data today must be shaped like future API data tomorrow.**
