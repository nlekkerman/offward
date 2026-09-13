# Offward Frontend Content Readiness Audit

## Executive Verdict

The Offward frontend currently possesses a functioning management surface for entity metadata and public rendering for countries, but **is NOT yet ready to display a saved Route on the Home map** nor complete the full content lifecycle end-to-end.

Specifically:
- **Public Route integration is completely disconnected**: [src/services/routesApi.js](src/services/routesApi.js#L1-L5) returns a static empty array and does not invoke `GET /api/offward/routes/?include_geometry=true`.
- **Map rendering is isolated to base tiles**: [src/features/map/components/MapView.jsx](src/features/map/components/MapView.jsx#L1-L50) encapsulates Leaflet cleanly with OpenStreetMap tiles and error handling, but exposes no props or layers to render GeoJSON route polylines or place markers.
- **Public detail pages are placeholders**: Pages for Places, Routes, Stories, Videos, Tours, and Events render [src/shared/components/RoutePlaceholder.jsx](src/shared/components/RoutePlaceholder.jsx#L1-L10).
- **Management UI supports metadata CRUD but lacks interactive geometry authoring**: Basic CRUD forms exist under `/manage`, but route waypoint editing, candidate calculation, and geometry acceptance remain backend-only capabilities.

---

## 1. Repository State Evidence

- **Current Branch & Commit**: Branch `main`, HEAD commit `66dcc00` (`feat: Add Offward map documentation and implementation plan`).
- **HEAD vs origin/main**: Up to date (`HEAD` matches `origin/main`).
- **Working-Tree Status**: Clean (`nothing to commit, working tree clean`).
- **Existing Modified, Deleted, and Untracked Files**: None.
- **Deployed Home-Map Commit Local Presence**: Present (`66dcc00` includes [src/features/map/components/HomeMapSection.jsx](src/features/map/components/HomeMapSection.jsx#L1-L15) and [src/features/map/components/MapView.jsx](src/features/map/components/MapView.jsx#L1-L50)).
- **Documentation Deletions & Duplicate `(1)` Files**: Present in workspace ([docs/OFFWARD_API_CONTRACT_PLAN(1).md](docs/OFFWARD_API_CONTRACT_PLAN(1).md), [docs/OFFWARD_MAP_CANON(1).md](docs/OFFWARD_MAP_CANON(1).md), etc.).
- **Deployment Evidence**: SPA static routing is configured via [public/_redirects](public/_redirects#L1) (`/* /index.html 200`). No automated CI/CD pipeline workflows (`.github/workflows/`) exist in the repository.

---

## 2. Frontend Architecture

- **Framework**: React `19.2.8` with `react-dom` `19.2.8`, bundled with Vite `8.3.0` ([package.json](package.json#L12-L23)).
- **Router**: `react-router-dom` `7.9.6`. Main router defined in [src/app/router.jsx](src/app/router.jsx#L1-L32) wrapped in `AppShell` ([src/shared/layout/AppShell.jsx](src/shared/layout/AppShell.jsx#L1-L18)), with management sub-router in [src/app/manageRouter.jsx](src/app/manageRouter.jsx#L1-L55).
- **Package Manager**: `npm`.
- **Styling System**: Plain CSS with global styles in [src/index.css](src/index.css#L1-L120) and feature styles in [src/features/map/map.css](src/features/map/map.css#L1-L55).
- **Feature & Page Organization**:
  - Pages: [src/pages/](src/pages/HomePage.jsx) and [src/pages/manage/](src/pages/manage/ManageDashboardPage.jsx).
  - Features: [src/features/map/](src/features/map/index.js) and [src/features/management/](src/features/management/entityConfig.js).
  - Services: [src/services/](src/services/apiClient.js).
- **API-Client Architecture**: Central Axios client in [src/services/apiClient.js](src/services/apiClient.js#L1-L47) configured with `withCredentials: true`, `baseURL: import.meta.env.VITE_API_BASE_URL`, and automatic CSRF header injection for state-mutating requests (`POST`, `PATCH`, `DELETE`).
- **Environment Variables**: Uses `VITE_API_BASE_URL` in [src/services/apiClient.js](src/services/apiClient.js#L15).
- **Authentication & Session Handling**:
  - Basic session via `/api/auth/session/` in [src/services/authApi.js](src/services/authApi.js#L62-L70).
  - Authoritative management access check via `/api/offward/manage/access/` in [src/services/authApi.js](src/services/authApi.js#L72-L80) (`canManageOffward`).
  - Guarded routes via [src/pages/manage/ManagementGuard.jsx](src/pages/manage/ManagementGuard.jsx#L1-L30).
- **Error Normalization & States**:
  - Auth error parsing in [src/services/authApi.js](src/services/authApi.js#L38-L49).
  - Management API error parsing in [src/features/management/EntityFormPage.jsx](src/features/management/EntityFormPage.jsx#L280-L300).
  - Public pages use boolean placeholders (`Loading...`, `Unable to load...`, `NotFoundPage`).

---

## 3. Public Page Inventory

| Experience | URL Route | File Path | Status | Data Source | Service Location | 404 / Error State | Dynamic DB Update |
|---|---|---|---|---|---|---|---|
| **Home** | `/` | [src/pages/HomePage.jsx](src/pages/HomePage.jsx#L1-L52) | Active | Backend API (Countries) / Mock Map | [src/services/countriesApi.js](src/services/countriesApi.js#L3-L11) | Error section | Countries: YES; Map: NO |
| **Explore** | `/explore` | [src/pages/ExplorePage.jsx](src/pages/ExplorePage.jsx#L1-L53) | Active | Backend API (Countries) | [src/services/countriesApi.js](src/services/countriesApi.js#L3-L11) | Error section | YES (Countries) |
| **Country Detail** | `/countries/:countrySlug` | [src/pages/CountryPage.jsx](src/pages/CountryPage.jsx#L1-L50) | Active | Backend API | [src/services/countriesApi.js](src/services/countriesApi.js#L13-L23) | Renders `NotFoundPage` on 404 | YES |
| **Place Detail** | `/places/:placeSlug` | [src/pages/PlacePage.jsx](src/pages/PlacePage.jsx#L1-L8) | Placeholder | Hard-coded static component | None | Shows placeholder | NO |
| **Route Detail** | `/routes/:routeSlug` | [src/pages/RoutePage.jsx](src/pages/RoutePage.jsx#L1-L8) | Placeholder | Hard-coded static component | None | Shows placeholder | NO |
| **Story Detail** | `/stories/:storySlug` | [src/pages/StoryPage.jsx](src/pages/StoryPage.jsx#L1-L8) | Placeholder | Hard-coded static component | None | Shows placeholder | NO |
| **Video Detail** | `/videos/:videoSlug` | [src/pages/VideoPage.jsx](src/pages/VideoPage.jsx#L1-L8) | Placeholder | Hard-coded static component | None | Shows placeholder | NO |
| **Tour Detail** | `/tours/:tourSlug` | [src/pages/TourPage.jsx](src/pages/TourPage.jsx#L1-L8) | Placeholder | Hard-coded static component | None | Shows placeholder | NO |
| **Event Detail** | `/events/:eventSlug` | [src/pages/EventPage.jsx](src/pages/EventPage.jsx#L1-L8) | Placeholder | Hard-coded static component | None | Shows placeholder | NO |
| **Partner Display** | N/A | None | Missing | None | None | N/A | NO |

---

## 4. API Integration Inventory

| Endpoint | Frontend Service Path | HTTP Method | Params | Used By Public Page? | Contract Alignment / Mismatch |
|---|---|---|---|---|---|
| `/api/offward/countries/` | [src/services/countriesApi.js](src/services/countriesApi.js#L3) | GET | None | YES ([HomePage.jsx](src/pages/HomePage.jsx#L14), [ExplorePage.jsx](src/pages/ExplorePage.jsx#L14)) | Aligned. Normalizes list response. |
| `/api/offward/countries/<slug>/` | [src/services/countriesApi.js](src/services/countriesApi.js#L15) | GET | None | YES ([CountryPage.jsx](src/pages/CountryPage.jsx#L17)) | Aligned. Handles 404 gracefully. |
| `/api/offward/places/` | [src/services/placesApi.js](src/services/placesApi.js#L3) | Stub | None | NO | **Mismatch**: Service returns static local file [src/data/places.js](src/data/places.js#L1). No HTTP call. |
| `/api/offward/routes/` | [src/services/routesApi.js](src/services/routesApi.js#L3) | Stub | None | NO | **Mismatch**: Service returns static local file [src/data/routes.js](src/data/routes.js#L1). Missing `?include_geometry=true` param support. |
| `/api/offward/stories/` | [src/services/storiesApi.js](src/services/storiesApi.js#L3) | Stub | None | NO | **Mismatch**: Service returns static local file [src/data/stories.js](src/data/stories.js#L1). No HTTP call. |
| `/api/offward/videos/` | [src/services/videosApi.js](src/services/videosApi.js#L3) | Stub | None | NO | **Mismatch**: Service returns static local file [src/data/videos.js](src/data/videos.js#L1). No HTTP call. |
| `/api/offward/tours/` | [src/services/toursApi.js](src/services/toursApi.js#L3) | Stub | None | NO | **Mismatch**: Service returns static local file [src/data/tours.js](src/data/tours.js#L1). No HTTP call. |
| `/api/offward/events/` | [src/services/eventsApi.js](src/services/eventsApi.js#L3) | Stub | None | NO | **Mismatch**: Service returns static local file [src/data/events.js](src/data/events.js#L1). No HTTP call. |
| `/api/offward/partners/` | None | None | None | NO | **Missing**: No public API service module exists. |

---

## 5. Map Foundation Findings

- **Component Locations**:
  - `MapView`: [src/features/map/components/MapView.jsx](src/features/map/components/MapView.jsx#L22-L50)
  - `HomeMapSection`: [src/features/map/components/HomeMapSection.jsx](src/features/map/components/HomeMapSection.jsx#L3-L15)
  - `MapErrorBoundary`: [src/features/map/components/MapErrorBoundary.jsx](src/features/map/components/MapErrorBoundary.jsx#L3-L28)
- **Leaflet & React-Leaflet Encapsulation**:
  - React-Leaflet components (`MapContainer`, `TileLayer`) are completely isolated inside `MapViewContent` ([src/features/map/components/MapView.jsx](src/features/map/components/MapView.jsx#L30-L40)).
  - CSS import `@import 'leaflet/dist/leaflet.css';` is present at line 1 of [src/features/map/map.css](src/features/map/map.css#L1).
  - Map container is responsive (`height: 320px` mobile, `480px` desktop).
- **Basemap & Initial State**:
  - Tile Provider: OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).
  - Default Center: `[50.0, 10.0]` (Europe). Default Zoom: `4`.
- **Current Map Capabilities**:
  - Renders **base tile layer ONLY**.
  - **0 Routes, Places, Waypoints, or Segments** rendered.
  - **No HTTP request** is made.
  - No fake map markers or lines exist.
  - Does NOT leak Leaflet implementation objects outside `src/features/map/`.
  - The clean props interface can be extended directly to accept `routes` and `places` data.

**Files requiring modification to render public saved Routes on the Home map**:
1. [src/services/routesApi.js](src/services/routesApi.js) (replace static stub with HTTP `apiClient.get('/api/offward/routes/?include_geometry=true')`).
2. [src/features/map/components/MapView.jsx](src/features/map/components/MapView.jsx) (add `routes` prop and render `<GeoJSON>` / polyline layers).
3. [src/features/map/components/HomeMapSection.jsx](src/features/map/components/HomeMapSection.jsx) (fetch public routes with geometry on mount and pass to `MapView`).

---

## 6. First Home Route Integration Readiness

To consume `GET /api/offward/routes/?include_geometry=true` and render public routes on the Home map:

1. **Route API Service**: `getPublicRoutes({ includeGeometry = true })` must be implemented in [src/services/routesApi.js](src/services/routesApi.js) using `apiClient`.
2. **Response Normalizer**: Must accept both direct array responses and DRF paginated objects (`data.results || data`).
3. **GeoJSON LineString Layer**: Inside [src/features/map/components/MapView.jsx](src/features/map/components/MapView.jsx), `react-leaflet`'s `<GeoJSON>` component should be used inside `<MapContainer>`. `<GeoJSON>` automatically parses standard GeoJSON `[longitude, latitude]` arrays.
4. **Keying & Null Geometry Protection**:
   - Each route feature mapped with `key={route.id || route.slug}`.
   - Filter out items where `!route.geometry` or invalid GeoJSON types to prevent map rendering errors.
5. **Map Error Isolation**: Keep route fetch failures non-fatal so base tiles render cleanly if route API fails or returns empty.
6. **Viewport & Bounds**: Default center `[50.0, 10.0]` zoom `4` remains intact if no renderable routes exist. Optional `fitBounds` when routes are present.
7. **Credentials & CORS**: `apiClient` uses `withCredentials: true` and `VITE_API_BASE_URL`, compatible with public CORS rules.

---

## 7. Place-Marker Readiness

Requirements for `GET /api/offward/places/`:

1. **Service Implementation**: `getPlaces()` in [src/services/placesApi.js](src/services/placesApi.js) must be updated from static `[]` stub to HTTP `apiClient.get('/api/offward/places/')`.
2. **Coordinates & Icons**:
   - `latitude` and `longitude` must be parsed as numbers and validated.
   - Leaflet default marker icons (`marker-icon.png`, `marker-shadow.png`) require explicit asset resolution in Vite or custom Leaflet `L.divIcon` / SVG markers to prevent broken image references.
3. **Interactivity**: Clicking a marker can open a popup showing place details or link to `/places/${place.slug}`.
4. **Phase Strategy**: Place markers should be implemented as a **subsequent phase** after completing initial Home Route geometry integration.

---

## 8. Contextual Map Readiness

| Entity Detail Page | Page Status | Map Component Status | Classification |
|---|---|---|---|
| **Route Detail** (`/routes/:routeSlug`) | Placeholder | Missing | Page exists but map missing; API not connected |
| **Country Detail** (`/countries/:countrySlug`) | Functional | Missing | Page exists but map missing |
| **Place Detail** (`/places/:placeSlug`) | Placeholder | Missing | Page exists but map missing; API not connected |
| **Story Detail** (`/stories/:storySlug`) | Placeholder | Missing | Page exists but map missing; API not connected |
| **Video Detail** (`/videos/:videoSlug`) | Placeholder | Missing | Page exists but map missing; API not connected |
| **Tour Detail** (`/tours/:tourSlug`) | Placeholder | Missing | Page exists but map missing; API not connected |
| **Event Detail** (`/events/:eventSlug`) | Placeholder | Missing | Page exists but map missing; API not connected |

---

## 9. Management Frontend Readiness

| Capability | Frontend UI Status | API Helper Status | Backend Capability Status | Overall Classification |
|---|---|---|---|---|
| **Country CRUD** | Implemented ([EntityListPage](src/features/management/EntityListPage.jsx), [EntityFormPage](src/features/management/EntityFormPage.jsx)) | Implemented | Implemented | **Implemented Frontend UI** |
| **Place CRUD & Coordinates** | Implemented (Text form inputs for lat/lng) | Implemented | Implemented | **Implemented Frontend UI** |
| **Route CRUD** | Implemented (Metadata fields) | Implemented | Implemented | **Implemented Frontend UI** |
| **RoutePlace Selection** | Implemented (Dynamic stop list add/remove/reorder) | Implemented | Implemented | **Implemented Frontend UI** |
| **Waypoint Placement & Reordering** | Missing | Missing | Implemented | **Backend Capability Only** |
| **Candidate Calculation** | Missing | Missing | Implemented | **Backend Capability Only** |
| **Candidate vs Accepted Comparison** | Missing | Missing | Implemented | **Backend Capability Only** |
| **Explicit Geometry Acceptance** | Missing | Missing | Implemented | **Backend Capability Only** |
| **Segment Creation & Reordering** | Missing | Missing | Implemented | **Backend Capability Only** |
| **Story CRUD** | Implemented (Metadata & multi-select relationships) | Implemented | Implemented | **Implemented Frontend UI** |
| **Video CRUD** | Implemented (Metadata fields) | Implemented | Implemented | **Implemented Frontend UI** |
| **Tour & Event CRUD** | Implemented (Metadata & relationship checkboxes) | Implemented | Implemented | **Implemented Frontend UI** |

---

## 10. Video and Media Frontend Readiness

- **Cloudflare Stream Upload UI**: Missing in frontend. Management form uses plain text input for `provider_id`, `playback_url`, and `thumbnail_url` ([src/features/management/entityConfig.js](src/features/management/entityConfig.js#L70-L83)).
- **Shared Gallery / Upload Services**: Missing in frontend repository.
- **Video Playback Component**: Missing. Public [src/pages/VideoPage.jsx](src/pages/VideoPage.jsx#L1-L8) renders `RoutePlaceholder`.
- **Multi-Context Video Attachments**: Implemented in metadata forms as multi-select relationships linking videos to Stories, Tours, and Events ([src/features/management/EntityFormPage.jsx](src/features/management/EntityFormPage.jsx#L110-L120)).
- **Panoramic Media**: No panorama viewer or 360 viewer components exist.

---

## 11. Exact Blockers

1. **Disconnected Public Route API Service**: [src/services/routesApi.js](src/services/routesApi.js#L1-L5) returns hard-coded static `[]` and does not call `GET /api/offward/routes/?include_geometry=true`.
2. **Missing GeoJSON Layer in MapView**: [src/features/map/components/MapView.jsx](src/features/map/components/MapView.jsx#L22-L42) only renders base `TileLayer` and does not accept or render route polylines.
3. **Placeholder Public Pages**: Detail pages for Places, Routes, Stories, Videos, Tours, Events render static `RoutePlaceholder`.
4. **Missing Map-Based Route Authoring UI**: Management interface lacks visual waypoint editing, candidate calculation, and geometry acceptance controls.

---

## 12. Build, Lint, and Git-Check Results

- **`npm run build`**: PASS (Vite production build completed in 541ms, `dist/` generated cleanly).
- **`npm run lint`**: PASS (ESLint completed with 0 errors and 0 warnings).
- **`git diff --check`**: PASS (Clean, no trailing whitespace or git diff errors).
- **`git status --short --branch`**: PASS (`## main...origin/main`, clean working tree).

---

## 13. Evidence Paths with Line References

- Central Axios API Client: [src/services/apiClient.js](src/services/apiClient.js#L15-L47)
- Authoritative Management Auth: [src/services/authApi.js](src/services/authApi.js#L72-L80)
- Management Route Guard: [src/pages/manage/ManagementGuard.jsx](src/pages/manage/ManagementGuard.jsx#L24-L28)
- Countries Public API Service: [src/services/countriesApi.js](src/services/countriesApi.js#L3-L23)
- Stubbed Public Places API Service: [src/services/placesApi.js](src/services/placesApi.js#L1-L5)
- Stubbed Public Routes API Service: [src/services/routesApi.js](src/services/routesApi.js#L1-L5)
- Map Component (`MapView`): [src/features/map/components/MapView.jsx](src/features/map/components/MapView.jsx#L22-L50)
- Map Component (`HomeMapSection`): [src/features/map/components/HomeMapSection.jsx](src/features/map/components/HomeMapSection.jsx#L1-L15)
- Map CSS Leaflet Import: [src/features/map/map.css](src/features/map/map.css#L1)
- Generic Management Form: [src/features/management/EntityFormPage.jsx](src/features/management/EntityFormPage.jsx#L1-L350)
- Generic Management List: [src/features/management/EntityListPage.jsx](src/features/management/EntityListPage.jsx#L1-L120)
- Main App Shell Router: [src/app/router.jsx](src/app/router.jsx#L15-L32)
- Management Sub-Router: [src/app/manageRouter.jsx](src/app/manageRouter.jsx#L12-L50)

---

## 14. Ordered Missing-Work Sequence

1. **Phase 1: Home Map Route Geometry Integration** *(Recommended Next Step)*
   - Update `src/services/routesApi.js` to call `GET /api/offward/routes/?include_geometry=true`.
   - Update `MapView.jsx` to render GeoJSON polylines using `react-leaflet` `<GeoJSON>`.
   - Update `HomeMapSection.jsx` to fetch public routes and pass geometry to `MapView`.
2. **Phase 2: Public Detail Pages & Public Services Integration**
   - Connect `placesApi.js`, `storiesApi.js`, `videosApi.js`, `toursApi.js`, `eventsApi.js` to real backend endpoints.
   - Replace `RoutePlaceholder` in `RoutePage.jsx`, `PlacePage.jsx`, `StoryPage.jsx`, `VideoPage.jsx`, `TourPage.jsx`, `EventPage.jsx` with actual data fetching and detail layouts.
3. **Phase 3: Place Markers on Home Map**
   - Connect public places API and render markers on `MapView` with custom Leaflet icons and popup links.
4. **Phase 4: Management Map & Route Authoring Interface**
   - Build interactive map UI in `EntityFormPage` for placing/reordering waypoints, triggering candidate calculations, comparing geometry, and accepting route geometry.
5. **Phase 5: Cloudflare Media Upload & Playback Integration**
   - Integrate Cloudflare Stream direct upload widget and video player component into management and public video pages.

---

## Final Audit Verdicts

```
FRONTEND READY TO ENTER FIRST REAL CONTENT: PARTIAL
FRONTEND READY TO DISPLAY A SAVED ROUTE ON HOME: NO
FRONTEND READY FOR COMPLETE CONTENT WORKFLOW: NO
```

### Recommended Next Implementation Phase

**Phase 1: Connect saved public Route geometry to the existing Home map.**

This is the smallest next implementation phase. All prerequisites for this phase exist: the Leaflet map foundation is cleanly isolated in `MapView`, Axios API client infrastructure is configured, and backend route list endpoints supporting `include_geometry=true` are verified. Connecting `src/services/routesApi.js` to `GET /api/offward/routes/?include_geometry=true` and adding `<GeoJSON>` layer rendering in `MapView` will immediately render real saved backend routes on the Home map.
