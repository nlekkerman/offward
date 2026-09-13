# OFFWARD_MAP_CANON

## Status
Locked.

## Purpose
This document defines the canonical behavior and architectural role of maps across Offward.

## Core Principle
**The map visualizes Places and Routes. It does not own content.**

The map is a presentation and exploration layer over canonical platform entities.

## Canonical Map Semantics

### Places
- Places are rendered as markers.
- A Place marker represents a canonical `Place` entity.
- Clicking a marker opens a lightweight Place preview.
- The preview may include title, short summary, media preview, and a link to the full Place page.
- The full Place page remains the canonical location for detailed content.

### Routes
- Routes are rendered as lines or paths.
- A Route represents a canonical `Route` entity.
- Route geometry is stored and supplied as a GeoJSON `LineString`.
- Public visitors load saved geometry; they do not request route calculation.
- Route shape is created from ordered Route Waypoints.
- A Route Waypoint may optionally reference a Place but does not have to.
- Related Places remain canonical content relationships rather than technical route-shaping points.
- A Place may appear in multiple Routes.

### Route Waypoints
- Waypoints are ordered geographical points belonging to one Route.
- Waypoint types may include start, via, stop, and finish.
- A waypoint may be coordinates only or may reference a canonical Place.
- Technical via points are not displayed as public Place markers unless explicitly configured for presentation.

### Route Segments
A Route Segment is an ordered, selectable section inside a Route.

A segment may surface related:
- Place information
- Video
- Story
- Note

When segment-related content is selected or playing, the associated section may be highlighted in a distinct route colour. In v1, the whole associated segment is highlighted; frame-by-frame cursor synchronization with video playback is explicitly out of scope.

The map only presents these relationships. It does not become the canonical storage location for them.

## Route Creation Canon

Routes may be created without a recorded GPS track.

Canonical authoring flow:

```text
Place start waypoint
→ place finish waypoint
→ optionally add ordered via/stop waypoints
→ request a road-following geometry through the routing adapter
→ review and adjust
→ save final GeoJSON geometry
```

- Road calculation is an authoring operation, not a public page-load operation.
- The final geometry is stored by Offward so public rendering is fast and independent from routing-service availability.
- Authors may work from approximate coordinates, shared pins, road junctions, or recognizable physical landmarks.
- Exact GPS recordings may be imported later, but GPS recording is not required for v1 route creation.
- Approximate video sections may be marked by selecting their start and end on the saved Route.

## V1 Provider Direction

- Leaflet is the v1 map-rendering library.
- React Leaflet is the React integration boundary.
- OpenStreetMap is the initial geographical data source.
- Road calculation is accessed through an isolated routing adapter, initially compatible with OSRM.
- Provider attribution and usage policies must be respected.
- Google Maps is not required and no paid map dependency is introduced for v1.
- Tile and routing providers remain configurable inside the map feature; domain entities store provider-neutral coordinates and GeoJSON.

## Canonical Interaction Model

```text
Map
→ click marker
→ Place preview
→ View Place

Route line
→ click route or stop
→ Route summary or stop preview
→ View Route / View Place
```

## Country Behavior

### Ireland
The Ireland map may show:
- places already explored
- routes already travelled or tested
- stories and videos attached to those places/routes

Ireland does not need a commercial product to exist on the map.

### Bosnia
The Bosnia map may show:
- biker routes
- tour-related Places
- route stops
- route videos
- selected Stories

Bosnia remains biker-focused for the current product phase.

### Spain
The Spain map may show:
- upcoming/planned route
- expedition Places
- route progress
- visited Places as they are added
- Stories and Videos published during or after the expedition

The Spain map must support incremental growth over time.

## Scale and Progressive Loading

The map must not load all detailed Places, Routes, geometry, and media for every country at once.

Canonical loading levels:

```text
Europe view
→ lightweight country summaries and availability markers

Country view or country selection
→ published Place and Route summaries for that country

Route selection
→ full Route geometry, Waypoints, Segments, and required previews

Story, Video, or Place context
→ only the geographical entities referenced by that context
```

- Zoom level, selected country, visible bounds, and page context may drive requests.
- Detailed route geometry is loaded only when needed.
- The map feature should support lightweight preview payloads separately from full detail payloads.
- Twenty routes around one area must be selectable without permanently drawing every route at full visual emphasis.
- The selected Route is emphasized; other available Routes remain subdued, summarized, clustered, or hidden according to zoom and context.

## Reuse Across Offward

Offward uses one reusable map system configured by context:

- Explore/Europe shows countries and available content at a summary level.
- Country pages show that country's Places and Routes.
- Route pages show one selected Route, its Waypoints, Segments, and related Places.
- Story pages show only the Places, Routes, or Segments referenced by the Story.
- Video pages show a Place marker or Route Segment when geographical context exists.
- Place pages show the Place and may show nearby or related Routes.

Maps may appear as compact cards or larger exploration views. A compact map may expand into a larger view while preserving the same selected entity and context.

## Route State Support
The map architecture must support routes that are:
- planned
- active
- visited/completed

The exact visual styling may evolve later, but route state must remain explicit in canonical data.

## Map Provider Abstraction
Pages and general UI components must not depend directly on a specific map provider.

Canonical interface example:

```jsx
<MapView
  places={places}
  routes={routes}
  onPlaceSelect={handlePlaceSelect}
  onRouteSelect={handleRouteSelect}
/>
```

Provider-specific code must remain inside the dedicated map feature.

## Provider Independence Rule
**No provider-specific code outside the map feature.**

The platform must be able to change between technologies such as:
- Leaflet
- MapLibre
- Mapbox
- another provider

without requiring country pages, route pages, place pages, or other product features to be rewritten.

## Future Capability Requirements
The map architecture must be capable of supporting future:
- planned routes
- visited routes
- active expedition routes
- incremental expedition updates
- additional countries
- activity filtering
- country filtering
- route filtering
- media-linked markers
- story-linked markers
- richer Place previews
- richer Route previews

These capabilities do not all need to be implemented in v1.

## Media Principle
Videos, Stories, and other media remain independent canonical entities.

The map may surface media related to a Place, Route, Tour, or Event/Expedition, but the map must not own or duplicate that content.

## UX Principle
**Map first for exploration, detail pages for depth.**

The map helps users discover where Offward has been, where it is going, and what is connected.

Detailed reading, viewing, and tour information belong on dedicated entity pages.

## Locked Principles
- Places are markers.
- Routes are paths.
- Route geometry is stored as provider-neutral GeoJSON.
- Waypoints shape Routes and may optionally reference Places.
- Segments connect media and editorial content to approximate sections of Routes.
- Segment highlighting is supported; synchronized moving playback cursors are out of scope for v1.
- Public visitors never calculate saved Routes on page load.
- Map data loads progressively by context, country, bounds, zoom, and selection.
- Leaflet and React Leaflet are the v1 rendering implementation behind the provider boundary.
- OpenStreetMap is the initial geographical data source and routing is isolated behind an OSRM-compatible adapter.
- No paid map dependency is introduced for v1.
- The map does not own content.
- Route Waypoints and Segments may surface linked Places, media, notes, and Stories.
- Country maps reflect real platform state.
- Map provider implementation is isolated behind the map feature.
- Map exploration and detail pages have separate responsibilities.
