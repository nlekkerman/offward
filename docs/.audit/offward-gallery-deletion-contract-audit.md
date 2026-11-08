# OFFWARD Gallery Deletion Contract Audit

**Scope:** Executable frontend source for gallery management, image collection services, management authorization, and gallery attachment call sites.
**Method:** Inspected frontend JavaScript and JSX only. No Markdown documentation, backend source, tests, or builds were inspected or run.

## Summary

- **A collection-level delete API helper exists:** `imageCollectionsApi.delete(id)` sends `DELETE /api/offward/manage/image-collections/:id/`.
- **No Gallery Delete action is exposed:** the Gallery list offers Edit, and the Gallery edit page offers metadata and image-membership controls, but neither calls the delete helper.
- **The delete helper is disconnected from the management UI:** the only frontend definition/reference to this collection-level delete request is the service method itself.
- **A confirmation pattern already exists:** `EntityListPage` uses native `window.confirm()` before deleting other managed records. There is no shared confirmation-dialog component.
- **Frontend relationship and broad access-gate evidence exists, but not enough to establish safe deletion semantics:** associated entity and route-map data carry `image_collection_ids`; management pages require `canManageOffward`. The frontend does not show collection-specific delete permissions or what the backend does with references when a gallery is deleted.

**Conclusion:** A frontend action could call the existing helper and present its result, but the frontend source does not establish a verified end-to-end deletion contract. Backend inspection is necessary before deciding whether deletion is allowed for referenced galleries and whether references are restricted, detached, cascaded, or otherwise handled.

## Findings

### 1. Collection-level delete API helper

[`imageCollectionsApi.delete`](../../src/services/management/imageCollectionsApi.js#L36) awaits `apiClient.delete` at `/api/offward/manage/image-collections/${encodeURIComponent(id)}/`. The management service also defines list, create, detail, metadata update, and image-membership replacement methods. The delete helper does not expose a response body or implement frontend-side relationship cleanup.

This verifies that the frontend has a concrete DELETE request helper and endpoint path. It does **not** verify the backend route's behavior, authorization policy, or success/error response contract.

### 2. Gallery management has no Delete Gallery action

- [`GalleryListCard`](../../src/pages/manage/galleries/GalleryListPage.jsx#L7) renders a link to Edit; the list page provides Create Gallery.
- [`GalleryEditPage`](../../src/pages/manage/galleries/GalleryEditPage.jsx#L14) loads a collection and supports metadata updates, image upload, image ordering/captions, and removal of an image from the gallery. The header only links back to the gallery list.
- The image control labeled “Remove from Gallery” calls `removeImage`, which updates the image membership via `imageCollectionsApi.replaceImages`; it does not delete the collection.
- No gallery list or edit action invokes `imageCollectionsApi.delete`.

The delete operation is therefore **implemented at the service layer but absent from the UI**, rather than implemented behind a hidden/disconnected button or handler.

### 3. Collection-level DELETE endpoint references

The management service's `delete` method is the sole frontend reference to `DELETE /api/offward/manage/image-collections/:id/`. No call site for `imageCollectionsApi.delete` appears in the inspected frontend source.

There is a separate generic managed-entity delete flow: [`EntityListPage.handleDelete`](../../src/features/management/EntityListPage.jsx#L77) calls an entity API's `remove(id)`, which uses `apiClient.delete` in [`createManagementEntityApi`](../../src/services/management/entityApi.js#L5). That flow is not connected to image collections.

### 4. Existing confirmation pattern

[`EntityListPage.handleDelete`](../../src/features/management/EntityListPage.jsx#L83) asks `window.confirm("Delete this …? This cannot be undone.")`, then calls the entity API on confirmation; failures are reported with `window.alert`.

This native browser confirmation pattern can be reused for a gallery action. No reusable application confirmation-dialog component was found in the inspected frontend source. The gallery image “Remove from Gallery” control is distinct and currently has no confirmation.

### 5. Frontend evidence about authorization and relationships

**Authorization visible in the frontend**

- [`getOffwardAccess`](../../src/services/authApi.js#L90) fetches `/api/offward/manage/access/` and derives the boolean `canManageOffward` from the returned access payload.
- [`ManagementGuard`](../../src/pages/manage/ManagementGuard.jsx#L5) protects the management routes, including Gallery list/create/edit routes, by requiring `canManageOffward === true`.
- No inspected Gallery component or collection service has a collection-specific delete permission check or distinguishes delete permission from general Offward management access.

This is evidence of a broad frontend management gate only; it does not establish the backend's authorization rules for DELETE.

**Gallery references visible in the frontend**

- [`entityConfig`](../../src/features/management/entityConfig.js#L3) includes `image_collection_ids` fields for Food, Place, Route, and Story form data.
- [`EntityFormPage`](../../src/features/management/EntityFormPage.jsx#L545) saves edited entity payloads through the entity API. Its gallery managers update `image_collection_ids` in form state; detaching a gallery removes that ID from the entity's pending list rather than deleting the collection.
- The Waypoint management UI uses [`GalleryAttachmentManager`](../../src/features/routes/routeMap/components/WaypointList.jsx#L219) with `persistImmediately`. [`RouteMapEditorPage.updateWaypointGallery`](../../src/pages/manage/routes/RouteMapEditorPage.jsx#L297) changes a waypoint's `image_collection_ids` and persists the waypoint list through `routeMapApi.updateWaypoints`.
- Route-map serialization includes `image_collection_ids` in both [`buildWaypointPayload`](../../src/features/routes/routeMap/routeMapUtils.js#L244) and [`buildSegmentPayload`](../../src/features/routes/routeMap/routeMapUtils.js#L443). The inspected source shows an attachment UI for waypoints; it does not show a corresponding Segment gallery-attachment control.

These call sites establish that collection IDs are referenced by multiple frontend-managed records. They do not establish whether the backend prevents deletion of referenced collections, removes references, cascades deletion, or leaves unresolved IDs.

## Contract boundary and next inspection

The frontend provides enough to identify the request a UI would issue: call `imageCollectionsApi.delete(id)` and handle a rejected request. It does not provide enough evidence to assert that this is a safe, fully verified deletion contract.

Before finalizing Gallery deletion behavior, inspect the backend implementation for:

1. Whether the collection-level DELETE route exists and its actual response/error behavior.
2. Which users or roles may delete a collection, beyond the frontend's broad `canManageOffward` gate.
3. How deletion handles `image_collection_ids` references from Food, Place, Route, Story, Waypoint, and Segment records.
4. Whether image assets or memberships are deleted, retained, or detached when the collection is deleted.
