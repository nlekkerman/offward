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
- Route geometry is supplied by Route data.
- Route stops are based on ordered Place references.
- A Place may appear in multiple Routes.

### Route Stops
A route stop may surface related:
- Place information
- Video
- Story
- Note

The map only presents these relationships. It does not become the canonical storage location for them.

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
- The map does not own content.
- Route stops may surface linked media and stories.
- Country maps reflect real platform state.
- Map provider implementation is isolated behind the map feature.
- Map exploration and detail pages have separate responsibilities.
