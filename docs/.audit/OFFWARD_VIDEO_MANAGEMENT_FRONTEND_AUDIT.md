# Offward Video Management Frontend Audit

## Scope and Verdict

This audit covers the frontend repository only. No application code was changed.

Video management is partially scaffolded already. The management router, sidebar, dashboard, generic CRUD pages, and generic management API registry all contain Video entries. The current Video implementation is not aligned with the current backend management contract, however: it exposes only basic playback metadata, has no location fields, has no read-only reverse attachment presentation, and has no real public Video data flow. The minimum implementation can extend the existing generic management surface rather than introducing a separate management architecture.

## Management Routing Structure

- The application router mounts the management sub-router at `/manage/*` in [src/app/router.jsx](src/app/router.jsx#L25-L30).
- [src/app/manageRouter.jsx](src/app/manageRouter.jsx#L1-L55) defines:
  - `/manage/login` and `/manage/access-denied` outside the guarded layout.
  - An index dashboard under `ManagementGuard` and `ManageLayout`.
  - Generic list, create, and edit routes for countries, places, routes, stories, videos, tours, events, and partners.
  - A Route-only map editor at `/manage/routes/:routeId/map`.
- Video routes already exist:
  - `/manage/videos`
  - `/manage/videos/new`
  - `/manage/videos/:id/edit`
- These routes all render [src/features/management/EntityListPage.jsx](src/features/management/EntityListPage.jsx) or [src/features/management/EntityFormPage.jsx](src/features/management/EntityFormPage.jsx); there is no Video-specific page yet.

## Management Navigation Structure

- [src/shared/components/ManagementSidebar.jsx](src/shared/components/ManagementSidebar.jsx#L3-L12) contains a static `navItems` array. Videos are already linked at `/manage/videos`.
- [src/pages/manage/ManageDashboardPage.jsx](src/pages/manage/ManageDashboardPage.jsx#L3-L12) contains a second static card list. Videos are already represented there.
- `ManageLayout` renders the sidebar and an `Outlet`; logout calls the auth service and redirects to `/manage/login` ([src/pages/manage/ManageLayout.jsx](src/pages/manage/ManageLayout.jsx#L1-L25)).
- No additional navigation entry is required to expose the existing Video management route.

## Generic List-Page Pattern

[src/features/management/EntityListPage.jsx](src/features/management/EntityListPage.jsx#L1-L133) is the shared list implementation.

- Looks up labels and columns through `getEntityConfig(resourceKey)`.
- Calls `managementApis[resourceKey].list()`.
- Accepts both bare arrays and paginated `results` through the API helper.
- Renders a native table with configured columns, Edit, and Delete actions.
- Uses a generic create link at `/manage/${resourceKey}/new`.
- Has loading and error sections, an empty state, browser confirmation for deletes, and an alert for delete failures.
- Contains a small Route-specific accommodation for resolving country IDs to names.
- Video currently uses `listFields: ['title', 'provider', 'duration', 'status']` from [src/features/management/entityConfig.js](src/features/management/entityConfig.js#L65-L83).

## Generic Create/Edit Form Pattern

[src/features/management/EntityFormPage.jsx](src/features/management/EntityFormPage.jsx#L1-L716) is a single form implementation selected by `resourceKey`.

- Create versus edit is determined by the optional `:id` parameter.
- Edit loads the record with `api.getById(id)`; create starts with `defaultValues`.
- Slugs are auto-generated from `name` or `title` for new records until manually edited.
- `renderField` supports inline native text inputs, number inputs, textareas, checkboxes, selects, and checkbox-based multi-selects.
- The resource switch controls field order and resource-specific controls. Countries, Places, and Routes are all implemented here; Route adds ordered Place stops.
- Payload cleanup removes empty values, converts Place coordinates to numbers, normalizes Route stops, and parses Route path JSON.
- Save calls generic `create` or `update`, then navigates back to the resource list.
- Video currently renders only `title`, `slug`, `provider`, `provider_id`, `thumbnail`, `duration`, `published_at`, and `status` ([src/features/management/EntityFormPage.jsx](src/features/management/EntityFormPage.jsx#L628-L638)).

## API Client and Management API Structure

- [src/services/apiClient.js](src/services/apiClient.js#L1-L47) provides the Axios client, `VITE_API_BASE_URL`, credentialed requests, CSRF token lookup, and automatic `X-CSRFToken` injection for unsafe methods.
- Public entity adapters live directly under `src/services/` and generally use `apiClient` for backend-backed entities. The Video adapter is an exception and remains a local-data stub.
- [src/services/management/entityApi.js](src/services/management/entityApi.js#L1-L38) creates a standard CRUD adapter for `/api/offward/manage/<resource>/`:
  - `list`: `GET`
  - `getById`: `GET /<id>/`
  - `create`: `POST`
  - `update`: `PATCH /<id>/`
  - `remove`: `DELETE /<id>/`
- [src/services/management/index.js](src/services/management/index.js#L1-L22) registers `videosApi = createManagementEntityApi('videos')` and exposes it as `managementApis.videos`.
- No Video-specific management API helper is currently needed for basic CRUD. A specialized helper would only be justified for video-specific location or attachment endpoints, upload workflows, or response normalization beyond the generic adapter.
- Route is the only entity with a second management API surface: [src/services/management/routeMapApi.js](src/services/management/routeMapApi.js#L1-L75) owns waypoints, segments, candidate calculation, and geometry acceptance.

## Existing Country Management

Country management is a generic CRUD consumer, not a dedicated feature folder.

- Routes: [src/app/manageRouter.jsx](src/app/manageRouter.jsx#L19-L21).
- Config: [src/features/management/entityConfig.js](src/features/management/entityConfig.js#L2-L15) defines `name`, `slug`, `code`, `summary`, `status`, and optional `hero_media_id`.
- List columns: `name`, `code`, `status`.
- Form controls: text fields, summary textarea, status select, and hero media ID text input.
- API: generic `countriesApi` in [src/services/management/index.js](src/services/management/index.js#L3-L5).
- Public country API is separate in [src/services/countriesApi.js](src/services/countriesApi.js#L1-L23) and has real list/detail requests.

## Existing Place Management

Place management is also generic CRUD with a reusable map picker.

- Routes: [src/app/manageRouter.jsx](src/app/manageRouter.jsx#L23-L25).
- Config: [src/features/management/entityConfig.js](src/features/management/entityConfig.js#L16-L31) defines Country, name, slug, summary, body, latitude, longitude, visited date, and status.
- Form controls: Country select, text and textarea fields, numeric latitude/longitude inputs, and status select.
- [src/features/map/components/PlaceCoordinatePicker.jsx](src/features/map/components/PlaceCoordinatePicker.jsx#L1-L126) is the main reusable form component. It lets an editor click a Leaflet map, keeps coordinates synchronized, and falls back to a manual-coordinate message when the map fails.
- Payload logic validates coordinate ranges and converts valid coordinate strings to numbers in [src/features/management/EntityFormPage.jsx](src/features/management/EntityFormPage.jsx#L231-L271).
- Country relationship options are fetched directly from the management endpoint inside `EntityFormPage`.
- Public Place API and detail page are implemented through [src/services/placesApi.js](src/services/placesApi.js#L1-L28) and [src/pages/PlacePage.jsx](src/pages/PlacePage.jsx#L1-L76).

## Existing Route Management

Route management starts with the generic CRUD surface and adds a dedicated map-authoring workflow.

- Generic routes and form: [src/app/manageRouter.jsx](src/app/manageRouter.jsx#L27-L30).
- Config: [src/features/management/entityConfig.js](src/features/management/entityConfig.js#L32-L46) defines Country, title, slug, summary, activity type, status, path, and ordered Places.
- Form-specific behavior supports an ordered Place stop list with add, remove, move up, and move down actions.
- Edit forms expose `/manage/routes/:routeId/map`, rendered by [src/pages/manage/routes/RouteMapEditorPage.jsx](src/pages/manage/routes/RouteMapEditorPage.jsx#L1-L88).
- The map editor loads the Route, Places, waypoints, and segments; it tracks unsaved state, validates waypoints and segments, saves them, calculates candidates, and accepts geometry through `routeMapApi`.
- Route management therefore demonstrates the repository pattern for a dedicated workflow: keep ordinary metadata in the generic entity form and add a resource-specific page/API only where the domain needs it.
- Public Route API/detail are implemented in [src/services/routesApi.js](src/services/routesApi.js#L1-L47) and [src/pages/RoutePage.jsx](src/pages/RoutePage.jsx#L1-L100).

## Reusable Form, Select, and Input Components

- There is no shared design-system form field, input, or select component in the frontend repository.
- Generic fields are rendered inline in `EntityFormPage` using native `<input>`, `<textarea>`, `<select>`, and checkbox elements.
- Reusable domain controls include `PlaceCoordinatePicker` and the Route map editor components under `src/features/routes/routeMap/components/`.
- Relationship selects and multi-selects are also inline in `EntityFormPage`; relationship options are fetched through `apiClient` rather than dedicated option hooks or components.
- Video work should follow this existing pattern unless its location editor becomes complex enough to merit a small Video-specific field component.

## Loading, Error, and Save Patterns

- List pages show `Loading...`, then an error section or empty/table state.
- Forms show `Loading form…` while loading relationships and, for edits, the record.
- Form-level errors use `management-error`; server field errors are flattened from response arrays/strings into `fieldErrors` and displayed next to fields.
- Save disables the submit button and changes its label to `Saving...`; success navigates to the resource list.
- Delete uses `window.confirm`, then reloads the list; failures use `window.alert`.
- Route map work has richer error normalization and separate loading/saving/calculation states in `RouteMapEditorPage`.
- These patterns are functional but are not centralized in shared hooks or components.

## Authentication and Management Access Handling

- [src/pages/manage/ManagementGuard.jsx](src/pages/manage/ManagementGuard.jsx#L1-L30) calls `getOffwardAccess()` for every guarded route and requires `canManageOffward === true`.
- Failure or missing access redirects to `/manage/login`, preserving the attempted pathname in router state.
- [src/pages/manage/ManageLoginPage.jsx](src/pages/manage/ManageLoginPage.jsx#L1-L87) checks existing access, posts credentials through `loginWithSession`, reports auth errors, and redirects after authorized login.
- [src/services/authApi.js](src/services/authApi.js#L72-L80) treats `/api/offward/manage/access/` as authoritative. A shared authenticated session alone does not grant Offward management access.
- `ManageLayout` provides logout through `/api/auth/logout/` and redirects to the login page.
- The generic management API relies on the credentialed Axios client and CSRF interceptor for mutations.

## Existing Video Frontend Inventory

### Already Present

- Management routes exist in [src/app/manageRouter.jsx](src/app/manageRouter.jsx#L38-L40).
- Management navigation exists in [src/shared/components/ManagementSidebar.jsx](src/shared/components/ManagementSidebar.jsx#L3-L12) and the dashboard in [src/pages/manage/ManageDashboardPage.jsx](src/pages/manage/ManageDashboardPage.jsx#L3-L12).
- Generic management API registration exists in [src/services/management/index.js](src/services/management/index.js#L7-L17).
- Generic Video config exists in [src/features/management/entityConfig.js](src/features/management/entityConfig.js#L65-L83).
- Generic Video form rendering exists in [src/features/management/EntityFormPage.jsx](src/features/management/EntityFormPage.jsx#L628-L638).
- The public route `/videos/:videoSlug` exists in [src/app/router.jsx](src/app/router.jsx#L23-L29).
- A public Video page exists at [src/pages/VideoPage.jsx](src/pages/VideoPage.jsx#L1-L10), but it only renders `RoutePlaceholder`.
- A public adapter exists at [src/services/videosApi.js](src/services/videosApi.js#L1-L5), but it returns the local [src/data/videos.js](src/data/videos.js#L1) array, which is currently empty.

### Missing or Incomplete

- No frontend Video type, schema, runtime validator, or normalized contract model was found.
- No public Video list/detail HTTP adapter exists; `videosApi.js` does not call `/api/offward/videos/`.
- No management-specific Video adapter exists beyond the generic CRUD factory.
- No Video list/detail UI consumes backend data.
- No Video playback, thumbnail, provider, or duration presentation component exists.
- No separate Video navigation is missing from management; it is already present.
- No management UI models the current location fields: `latitude`, `longitude`, `place_id`, `route_id`, `segment_id`, or `captured_at`.
- No UI presents the read-only reverse attachment fields: `place_ids`, `route_ids`, `segment_ids`, `story_ids`, `tour_ids`, or `event_ids`.
- Existing config includes `playback_url` and `thumbnail_url`, but the current contract comparison supplied for this audit lists `thumbnail` and does not list those extra fields. They should not be assumed to be writable contract fields without backend confirmation.

## Backend Contract Comparison

| Backend Video field | Current frontend state | Audit result |
|---|---|---|
| `slug` | Generic config and form | Present |
| `title` | Generic config and form | Present |
| `provider` | Generic config and form | Present as free text; no contract options |
| `provider_id` | Generic config and form | Present |
| `thumbnail` | Generic config and form | Present |
| `duration` | Generic config and form | Present as free text; no numeric/format handling |
| `published_at` | Generic config and form | Present as free text; no date/datetime input handling |
| `status` | Generic config and form | Present through the shared status select |
| `location.latitude` | None | Missing |
| `location.longitude` | None | Missing |
| `location.place_id` | None | Missing |
| `location.route_id` | None | Missing |
| `location.segment_id` | None | Missing |
| `location.captured_at` | None | Missing |
| `place_ids` | None | Missing read-only presentation |
| `route_ids` | None | Missing read-only presentation |
| `segment_ids` | None | Missing read-only presentation |
| `story_ids` | None | Missing read-only presentation |
| `tour_ids` | None | Missing read-only presentation |
| `event_ids` | None | Missing read-only presentation |

The current `EntityFormPage` also removes empty values generically before saving. Video-specific payload handling will be needed to preserve the backend's expected nested `location` shape, or to send the exact flat shape if the management contract defines it that way. The frontend repository alone does not establish that serialization detail.

## Recommended Video Management Frontend Structure

The minimum implementation should extend the existing generic architecture:

1. **Keep the existing management routes and navigation.** No new route, sidebar item, or dashboard card is required because `/manage/videos`, `/manage/videos/new`, and `/manage/videos/:id/edit` already exist.

2. **Update [src/features/management/entityConfig.js](src/features/management/entityConfig.js#L65-L83).** Add the contract's location-backed fields to Video defaults and choose list columns that help editors scan `title`, `provider`, `duration`, `published_at`, and `status`. Do not add reverse attachment IDs to ordinary editable defaults; they are read-only backend output.

3. **Extend [src/features/management/EntityFormPage.jsx](src/features/management/EntityFormPage.jsx#L1-L716).** Add Video field rendering and payload normalization for:
   - `latitude` and `longitude` as validated numeric inputs;
   - `place_id`, `route_id`, and `segment_id` as selects or contract-appropriate ID inputs;
   - `captured_at` as a date/datetime control matching the backend format;
   - the backend's required location serialization.

   The existing Country and Place relationship-loading pattern can supply Place and Route options. Segment options need a confirmed backend source; if segments are only available under a Route, the smallest correct design is a Video-specific dependent Route/Segment selector rather than loading an unscoped segment list that the API does not provide.

4. **Add one small reusable Video location field component only if needed.** A component such as `src/features/management/VideoLocationFields.jsx` would keep dependent Place/Route/Segment selection and location validation out of the already large generic form. It is optional for a first implementation; the existing codebase currently favors inline resource-specific rendering.

5. **Use the existing generic management API registration.** `managementApis.videos` already provides list/get/create/update/delete. Add a dedicated `src/services/management/videoApi.js` only if the backend exposes Video-specific option, upload, attachment, or normalization endpoints that cannot fit the generic CRUD contract. No new CRUD helper is otherwise necessary.

6. **Add a read-only attachment summary to the Video edit form.** Render `place_ids`, `route_ids`, `segment_ids`, `story_ids`, `tour_ids`, and `event_ids` as non-editable relationship metadata when returned by `getById`. These fields should not be sent back in create/update payloads unless the backend contract explicitly changes them to writable fields.

7. **Implement public Video API/page separately from management CRUD if public Video support is required.** Replace the local-data stub in [src/services/videosApi.js](src/services/videosApi.js#L1-L5) with the backend list/detail adapter and replace the placeholder in [src/pages/VideoPage.jsx](src/pages/VideoPage.jsx#L1-L10). This is outside the minimum management list/create/edit work, but it is required before saved videos can be viewed publicly.

### Minimum File Change Set for Management Only

- Update `src/features/management/entityConfig.js` for Video defaults and list fields.
- Update `src/features/management/EntityFormPage.jsx` for Video location inputs, validation, payload shape, and read-only reverse attachments.
- Optionally add `src/features/management/VideoLocationFields.jsx` if dependent location controls make the generic form unwieldy.
- Keep `src/services/management/entityApi.js` and `src/services/management/index.js` unchanged unless the backend requires Video-specific endpoints.
- Keep `src/app/manageRouter.jsx`, `src/shared/components/ManagementSidebar.jsx`, and `src/pages/manage/ManageDashboardPage.jsx` unchanged because Video management is already routed and navigable.

This recommendation intentionally excludes Story frontend work.