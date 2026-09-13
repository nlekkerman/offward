# OFFWARD_ROUTING_CANON

## Status
Locked.

## Purpose
This document defines the canonical public routing rules for Offward and explicitly separates public frontend routes from future backend API routes.

## Public Frontend Routes

```text
/
 /explore
 /countries/:countrySlug
 /places/:placeSlug
 /routes/:routeSlug
 /stories/:storySlug
 /videos/:videoSlug
 /tours/:tourSlug
 /events/:eventSlug
 /about
 /contact
```

## Examples

```text
/countries/ireland
/countries/bosnia
/countries/spain

/places/muckross-abbey
/routes/killarney-loop
/tours/bosnia-biker-season
/events/spain-2027
```

## Canonical Routing Rules

- Public URLs are lowercase.
- Slugs use hyphens.
- Spaces and underscores are not used in public slugs.
- Entity URLs should remain stable once published.
- Display names may change without forcing URL changes.
- Countries are hubs, not product folders.
- Bosnia, Ireland, Spain, or any other country must not be hard-coded into routing logic.
- Detail entities remain independently addressable.
- A Place may be reached from a map, Route, Story, Tour, Event, or Country page while keeping the same canonical Place URL.
- A Route may be reached from multiple contexts while keeping the same canonical Route URL.
- Unknown entity slugs resolve to a 404.
- Unpublished or removed content must not silently redirect to unrelated content.
- If a published slug changes later, a redirect should be created where appropriate.

## Canonical Principle
**URLs identify entities, not where the user happened to discover them.**

A Place can appear inside multiple Routes or contexts without requiring deeply nested public URLs.

## Avoid Deep Coupling
Avoid public routes such as:

```text
/countries/ireland/places/killarney/muckross-abbey
```

when the canonical entity can be represented simply as:

```text
/places/muckross-abbey
```

Hierarchy can still be shown in UI breadcrumbs without encoding every relationship into the URL.

Example:

```text
Ireland → Killarney → Muckross Abbey
```

## Frontend and Backend Separation
Public frontend routes and backend API routes are separate concerns.

**Public URLs are designed for users and SEO. API routes are designed for data access. They must not be coupled.**

Frontend route structure must not be derived mechanically from Django API structure.

## Future API Route Direction
The future backend may expose endpoints such as:

```text
/api/offward/countries/
/api/offward/places/
/api/offward/routes/
/api/offward/stories/
/api/offward/videos/
/api/offward/tours/
/api/offward/events/
```

Exact API contracts will be defined separately.

## Slug and ID Principle
Public detail pages resolve by human-readable slug.

Backend entities should still maintain stable internal IDs.

Example public URL:

```text
/places/muckross-abbey
```

A future API may support a slug-based detail request such as:

```text
GET /api/offward/places/muckross-abbey/
```

or another explicit slug-resolution pattern.

The exact API implementation may evolve without changing the public frontend URL.

## Navigation
Initial top-level navigation should remain minimal:

- Home
- Explore
- Stories
- About
- Contact

Tours and Events may surface contextually without requiring permanent top-level navigation in v1.

## Map Navigation
- Place marker selection may navigate to `/places/:placeSlug`.
- Route selection may navigate to `/routes/:routeSlug`.
- Event selection may navigate to `/events/:eventSlug`.
- Map interactions must use canonical entity routes rather than provider-specific URLs.
- Route Waypoints and Route Segments remain subordinate to `/routes/:routeSlug` in v1 and do not receive separate public URLs.
- A selected Segment may be represented as transient UI state or a query/hash value when shareable selection becomes necessary, but it must not create a second canonical Route URL.

## Locked Principles
- Public routes are entity-oriented.
- Frontend routes and API routes are independent.
- Human-readable slugs are used publicly.
- Stable internal IDs remain available for backend relationships.
- Deeply nested URLs are avoided unless a future requirement clearly justifies them.
- Routing must remain country-agnostic and scalable.
