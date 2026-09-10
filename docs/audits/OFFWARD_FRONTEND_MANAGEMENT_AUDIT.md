# OFFWARD_FRONTEND_MANAGEMENT_AUDIT

Date: 2026-09-10

## Scope
This audit covers the first complete Offward management frontend slice for admin CRUD workflows. The work is intentionally scoped to authenticated management UX, entity CRUD, relationship handling, and route guards while leaving the public Offward site untouched.

## Files inspected
- docs/OFFWARD_PRODUCT_CANON.md
- docs/OFFWARD_INFORMATION_ARCHITECTURE.md
- docs/OFFWARD_CONTENT_MODEL.md
- docs/OFFWARD_MAP_CANON.md
- docs/OFFWARD_FRONTEND_ARCHITECTURE.md
- docs/OFFWARD_ROUTING_CANON.md
- docs/OFFWARD_API_CONTRACT_PLAN.md
- docs/OFFWARD_UI_CANON.md
- docs/OFFWARD_DECISIONS.md
- src/app/router.jsx
- src/services/apiClient.js
- src/services/countriesApi.js
- src/shared/layout/AppShell.jsx
- src/index.css

## Files created
- src/services/authApi.js
- src/services/management/entityApi.js
- src/services/management/index.js
- src/features/management/entityConfig.js
- src/features/management/EntityListPage.jsx
- src/features/management/EntityFormPage.jsx
- src/shared/components/ManagementSidebar.jsx
- src/pages/manage/ManageLayout.jsx
- src/pages/manage/ManagementGuard.jsx
- src/pages/manage/ManageLoginPage.jsx
- src/pages/manage/ManageDashboardPage.jsx
- src/pages/manage/AccessDeniedPage.jsx
- src/app/manageRouter.jsx
- docs/audits/OFFWARD_FRONTEND_MANAGEMENT_AUDIT.md

## Files changed
- src/app/router.jsx
- src/services/apiClient.js
- src/index.css

## Auth/session flow implemented
- Reused the existing Kata Wild-style Django session pattern by setting the shared Axios client to include credentials and CSRF handling via the csrftoken cookie.
- Added a management auth service that probes session endpoints and attempts Django admin login at common project patterns: /api/auth/login/, /api/login/, /admin/login/.
- The session bootstrap uses the authenticated backend cookie-based session and treats an IsAdminUser-style admin user as the allowed condition.
- Logout uses the existing session-based pattern with CSRF header if present.
- The management route guard waits for the session check before redirecting to avoid flicker or premature redirects.

## Management routes added
- /manage/login
- /manage
- /manage/countries
- /manage/countries/new
- /manage/countries/:id/edit
- /manage/places
- /manage/places/new
- /manage/places/:id/edit
- /manage/routes
- /manage/routes/new
- /manage/routes/:id/edit
- /manage/stories
- /manage/stories/new
- /manage/stories/:id/edit
- /manage/videos
- /manage/videos/new
- /manage/videos/:id/edit
- /manage/tours
- /manage/tours/new
- /manage/tours/:id/edit
- /manage/events
- /manage/events/new
- /manage/events/:id/edit
- /manage/partners
- /manage/partners/new
- /manage/partners/:id/edit
- /manage/access-denied

## Route guard behavior
- Unauthenticated users are redirected to /manage/login.
- Authenticated superusers/admins proceed to management pages.
- Authenticated non-admin users are redirected to /manage/access-denied.
- The route guard keeps a loading state instead of redirecting prematurely while the backend session is being checked.

## API service modules
- Shared Axios client with withCredentials and CSRF token injection.
- Management CRUD factory: src/services/management/entityApi.js
- Management resource registry: src/services/management/index.js
- Auth service: src/services/authApi.js

Each management resource service supports list, get by UUID, create, partial update with PATCH, and delete.

## Entity list pages
Created list pages for all eight management areas:
- countries
- places
- routes
- stories
- videos
- tours
- events
- partners

Each list page includes:
- page title
- create button
- loading indicator
- error state
- empty state
- responsive table layout
- Edit and Delete actions
- confirmation before delete

## Entity create/edit forms
Reusable create/edit forms were implemented for each entity with field handling aligned to the backend management serializer contract and the canonical content model. The forms cover the requested fields and include support for select and multi-select relationship controls.

## Relationship picker strategy
- Relationship selectors populate from backend management endpoints for the related resources.
- Country is selected from the countries list.
- Multi-select controls are used for place, route, story, event, partner, tour, and video relationships.
- Mobile-friendly stacked checkboxes and simple selects were used rather than introducing a heavy UI library.

## Ordered RoutePlace UI strategy
- Route stop rows are editable in order.
- Each stop includes a place selector and a numeric position.
- Add stop, remove stop, move up, and move down are all implemented in the form.
- The payload is assembled as a route places array matching the backend concept of place_id + position order.

## Video playback reuse decision
- No Cloudflare upload or media pipeline was introduced.
- The management UI does not invent a playback stack; it leaves playback metadata display read-only where available and defers a dedicated player wrapper unless the backend and existing Kata Wild implementation are available to integrate directly.
- This keeps the first management slice focused on CRUD and metadata management without copying an unrelated private UI implementation.

## Delete handling
- Delete requests prompt for explicit confirmation before removing a record.
- API-level delete failures surface readable backend messages rather than a fake success UI.
- Protected relationship or validation failures are surfaced as human-readable error text.

## Error handling
- Route-level loading and auth errors are handled by the management guard.
- Form screens surface backend field validation errors beside relevant inputs where practical.
- API fallback messaging is shown for master-level loading and record-save errors.
- Raw Axios objects or stack traces are not exposed in the production UI.

## Responsive/mobile considerations
- Management layout uses a split sidebar on wider screens and collapses to a single-column layout on smaller screens.
- Buttons and inputs keep touch-friendly sizing.
- Tables are wrapped in horizontal scroll containers to remain usable on narrower devices.
- Form control groups and checkboxes are stacked clearly for mobile interaction.

## Backend contract assumptions
This frontend assumes the backend management endpoints are present and session-authenticated, following the canonical /api/offward/manage/* structure. This includes the required resources and Django admin auth session behavior. The frontend intentionally avoids inventing a separate user model, token flow, or custom membership check.

## Intentionally deferred
- Cloudflare upload UI and upload pipeline
- dedicated complex map editor
- drag-and-drop route stop editor
- rich text editor integration
- analytics dashboards
- permissions/user management
- detailed playback implementation beyond metadata display

## Build/lint validation performed
- npm run lint
- npm run build

Both commands completed successfully after the final fix set.

## Issues discovered
- The initial implementation needed a cleanup pass for lint issues around unused variables and effect-driven state updates.
- The backend authentication/session endpoints are not explicitly defined in the current frontend repo, so the auth flow uses the most likely Kata Wild Django DRF patterns and session-cookie conventions rather than inventing a separate auth system.
