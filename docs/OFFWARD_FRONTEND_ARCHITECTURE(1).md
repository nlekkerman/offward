# OFFWARD_FRONTEND_ARCHITECTURE

## Status
Locked.

## Purpose
This document defines the canonical frontend architecture for Offward.

The goal is to support a minimal static React v1 today while allowing the application to move to a Django-backed API later without rewriting the UI architecture.

## Core Stack
- React
- JavaScript
- Vite
- React Router
- Axios for HTTP
- Feature-first organization
- Static local data first
- API-backed data later
- Map provider isolated behind a dedicated map feature
- Leaflet + React Leaflet as the v1 implementation inside that boundary
- OpenStreetMap as the initial geographical data source

## Canonical Folder Structure

```text
src/
├── app/
│   ├── App.jsx
│   ├── router.jsx
│   └── providers/
│
├── pages/
│   ├── HomePage.jsx
│   ├── ExplorePage.jsx
│   ├── CountryPage.jsx
│   ├── PlacePage.jsx
│   ├── RoutePage.jsx
│   ├── StoryPage.jsx
│   ├── TourPage.jsx
│   └── EventPage.jsx
│
├── features/
│   ├── countries/
│   ├── places/
│   ├── routes/
│   ├── stories/
│   ├── videos/
│   ├── tours/
│   ├── events/
│   └── map/
│       ├── components/
│       ├── adapters/
│       ├── hooks/
│       └── utils/
│
├── shared/
│   ├── components/
│   ├── layout/
│   ├── hooks/
│   ├── utils/
│   └── constants/
│
├── data/
│   ├── countries.js
│   ├── places.js
│   ├── routes.js
│   ├── stories.js
│   ├── videos.js
│   ├── tours.js
│   └── events.js
│
└── services/
    ├── apiClient.js
    ├── countriesApi.js
    ├── placesApi.js
    ├── routesApi.js
    ├── storiesApi.js
    ├── videosApi.js
    ├── toursApi.js
    └── eventsApi.js
```

## Responsibilities

### `app/`
Owns application composition, routing, and global providers.

### `pages/`
Own route-level composition.

Pages may:
- read route params
- choose which features to render
- orchestrate page-level loading and empty states

Pages should not own reusable business/domain logic.

### `features/`
Own domain-specific UI and logic.

Examples:
- country cards
- place previews
- route summaries
- story lists
- tour enquiry UI
- event status UI
- map rendering/adapters

### `shared/`
Contains truly reusable non-domain-specific pieces.

Examples:
- buttons
- layout primitives
- generic modal/drawer shells
- utilities
- hooks
- constants

Domain-specific components should not be moved into `shared` merely because they are reused.

### `data/`
Contains temporary static v1 content.

Static data must follow the canonical content model and remain replaceable by service-backed API data later.

### `services/`
Owns data access boundaries.

Pages and general UI components must not know whether data currently comes from:
- local static JS
- Axios HTTP requests
- another future data source

## Canonical Data Flow

```text
Page
→ feature/service
→ static data now
→ Axios API later
→ normalized result
→ UI
```

## Axios Rule
Axios is the canonical HTTP client.

Direct `fetch()` usage is prohibited.

A single shared Axios instance should be created in `apiClient.js`.

Example:

```js
import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});
```

Domain services use the shared client.

Example:

```js
import { apiClient } from "./apiClient";

export async function getCountries() {
  const { data } = await apiClient.get("/api/offward/countries/");
  return data;
}
```

## HTTP Boundary Rules
- No direct Axios calls from pages.
- No direct Axios calls from general presentation components.
- No `fetch()`.
- No backend endpoint strings scattered through the UI.
- HTTP concerns belong in service modules.
- Shared request configuration belongs in `apiClient.js`.

## Static-to-API Migration Rule
Static v1 data should be consumed behind service boundaries where practical.

The later migration should primarily replace service internals rather than page/component architecture.

## Map Architecture Rule
Provider-specific map code belongs only inside `features/map`.

Pages should interact through a provider-independent interface such as:

```jsx
<MapView
  places={places}
  routes={routes}
  selectedRouteId={selectedRouteId}
  selectedSegmentId={selectedSegmentId}
  onPlaceSelect={handlePlaceSelect}
  onRouteSelect={handleRouteSelect}
  onViewportChange={handleViewportChange}
/>
```

No Leaflet, MapLibre, Mapbox, or other provider-specific APIs should leak into country, route, place, or page components.

### V1 Map Implementation

- Leaflet renders the interactive map.
- React Leaflet owns the React integration.
- OpenStreetMap is the initial geographical data source.
- Provider attribution remains visible and compliant.
- Route and Segment geometry arrives as GeoJSON from static canonical data or the API.
- Public components never request road calculation.
- Routing-provider access, when authoring is introduced, remains behind a service/adapter boundary and uses Axios.
- Google Maps and paid map SDKs are not required in v1.

### Map Context and Loading

The same `MapView` foundation is reused with context-specific data:
- Explore: country summaries and availability
- Country: that country's Place and Route summaries
- Route: one Route with its Waypoints, Segments, and related Places
- Story: only referenced geographical entities
- Video: its referenced Place or Route Segment
- Place: the Place plus deliberately requested nearby/related Routes

The map feature must support lazy loading and scoped requests. Europe-level views must not load full geometry and media for every Route. Route geometry is requested only when the selected context needs it.

Multiple routes in the same area are handled through selection state: the selected Route is emphasized while alternatives remain subdued, summarized, or hidden according to viewport and context.

### Segment Highlighting

The Route page may place selected media above or beside the map. While a Video associated with a Route Segment is selected or playing, `selectedSegmentId` highlights that complete Segment. Playback-time cursor synchronization is out of scope for v1.

## State Management
Do not introduce a large global state solution without a concrete need.

For v1, prefer:
- local component state
- lifted state where appropriate
- router state/params where appropriate

Redux is not part of the canonical v1 architecture.

If server-state complexity grows later, TanStack Query may be introduced deliberately rather than ad hoc.

## Routing Responsibility
- Route definitions belong in the app/router layer.
- Route params and slugs are handled at router/page level.
- Domain features receive resolved data or identifiers through clear props/hooks.

## Async and Error Handling
Future API-backed async states should follow consistent patterns for:
- loading
- empty states
- errors
- retries where appropriate

These should not be implemented differently on every page.

## Architectural Principles

### UI/Data Independence
**UI should not care whether data came from local JavaScript or the Django API.**

### Feature Ownership
Domain behavior belongs with its feature.

### Provider Isolation
External implementation details such as the map provider must remain isolated behind dedicated boundaries.

### Minimal First
Do not add architectural machinery before Offward needs it.

### Future-Ready, Not Overbuilt
The architecture should make known future changes easy without building unused systems prematurely.

## Locked Decisions
- React is the frontend framework.
- JavaScript is used instead of TypeScript.
- Vite is the build tool.
- React Router handles routing.
- Axios is the only HTTP client.
- `fetch()` is prohibited.
- Feature-first architecture is canonical.
- Static data is temporary and API-ready.
- Data access is isolated through services.
- Map provider code is isolated inside the map feature.
- Leaflet + React Leaflet are the v1 map implementation behind that isolation boundary.
- OpenStreetMap is the initial geographical data source.
- GeoJSON is the frontend geometry interchange format.
- Public views render stored Route geometry and do not calculate roads.
- Map data loads progressively by page context, country, viewport, and selected entity.
- Route Segment selection may highlight the associated complete section; synchronized video cursors are deferred.
- Redux is not part of v1.
- TanStack Query is optional for future server-state needs, not required now.
