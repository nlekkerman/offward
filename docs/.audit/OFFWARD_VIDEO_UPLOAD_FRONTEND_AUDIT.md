# Offward Video Upload Frontend Audit

## Scope and Verdict

This audit covers the Offward frontend only. No application code was changed.

The current frontend has no real Cloudflare Stream upload implementation. Offward Video management is already a generic CRUD form with metadata and nested location editing, but `provider_id` is currently a normal text input and there is no file input, direct-upload request, progress tracking, or upload state. The smallest correct implementation is an Offward-only upload component plus an Offward-only upload service, mounted near the top of the existing Video form. The existing generic `managementApis.videos` CRUD API should remain responsible for creating and editing the Offward Video record after upload success.

The repository contains no Gallery / Private Cloudflare upload surface under `src/`, and no upload helper or upload dependency was found elsewhere in the frontend workspace. Existing Gallery / Private functionality therefore cannot be safely reused from this repository because no such implementation is present here. Any separately maintained surface must remain untouched.

## Current Offward Video Management Form

- Video management uses the existing routes `/manage/videos`, `/manage/videos/new`, and `/manage/videos/:id/edit`.
- The routes render [src/features/management/EntityListPage.jsx](src/features/management/EntityListPage.jsx) and [src/features/management/EntityFormPage.jsx](src/features/management/EntityFormPage.jsx).
- Video configuration is defined in [src/features/management/entityConfig.js](src/features/management/entityConfig.js#L65-L83).
- Current editable metadata is `title`, `slug`, `provider`, `provider_id`, `thumbnail`, `duration`, `published_at`, and `status`.
- The current default provider is `cloudflare`, but this is only a form default; it does not perform an upload.
- `provider_id` is currently rendered through the generic text-field path. Users can manually enter it.
- The form already includes nested Video location editing for latitude, longitude, Place, Route, Segment, and `captured_at`.
- Route-to-Segment loading uses the existing [src/services/management/routeMapApi.js](src/services/management/routeMapApi.js) helper and should remain unrelated to upload state.
- Edit forms show reverse attachment IDs as read-only metadata. Those values are not intended to be part of the upload request or Video mutation payload.

## Generic Management Form Architecture

[src/features/management/EntityFormPage.jsx](src/features/management/EntityFormPage.jsx) is a shared resource-key-driven form.

- It loads relationship options and, for edit mode, the existing record.
- It stores all editable values in `formData`.
- It uses inline native inputs, selects, textareas, checkboxes, and the existing `PlaceCoordinatePicker`.
- It calls `managementApis[resourceKey].create(payload)` or `.update(id, payload)` on submit.
- It converts server errors into form-level and field-level error messages.
- It disables the save button while the generic record mutation is in progress.
- There is currently no generic file field, upload state model, upload hook, or upload progress component.

The upload should not be added to the generic CRUD API factory. Uploading a file is a separate operation from creating the Offward Video metadata record and should be isolated behind an Offward-specific service/component boundary.

## Existing Upload and Cloudflare Inventory

### Offward frontend

No matches were found for an upload implementation using:

- `XMLHttpRequest`
- Axios `onUploadProgress`
- `fetch` upload handling
- `FormData`
- file inputs
- Cloudflare Stream upload URLs
- upload progress state
- upload retry helpers

The only current Cloudflare reference in Offward application code is the Video config default `provider: 'cloudflare'`.

### Gallery / Private surface

No Gallery, Private, Cloudflare, direct-upload, or media-upload components/services were found under this frontend repository's `src/` tree. The existing frontend audit also records that shared Gallery/upload services are missing from this repository.

Consequences:

- There is no exact existing upload helper that can be safely imported by Offward.
- There is no existing upload progress or failure UX to match.
- No Gallery / Private file needs to be modified for this task.
- If another application or separately mounted surface exists outside this repository, it must remain unchanged; this Offward integration should not import from or couple to it.

## HTTP and Upload Mechanism Findings

- [src/services/apiClient.js](src/services/apiClient.js#L1-L47) is the shared Axios client.
- It uses `VITE_API_BASE_URL` and `withCredentials: true`.
- It injects CSRF headers for POST, PUT, PATCH, and DELETE requests.
- [src/services/management/entityApi.js](src/services/management/entityApi.js#L1-L38) owns ordinary management CRUD only.
- `package.json` contains Axios, React, and map dependencies, but no Cloudflare SDK, upload widget, or resumable-upload library.
- There is no current upload mechanism to preserve. The recommended implementation should use:
  - Axios through an Offward-specific backend-session helper for the authenticated direct-upload session request.
  - `XMLHttpRequest` or a dedicated upload-capable request wrapper for the direct Cloudflare upload, because native upload progress is straightforward through `xhr.upload.onprogress` and does not require exposing the Cloudflare endpoint through the authenticated Axios client.

Using the shared Axios client directly for the Cloudflare upload is less attractive: it is configured for the Offward API base URL and credentials, while the signed Cloudflare upload URL is an external destination with its own request semantics. The backend session request and Cloudflare file upload should be separate calls.

## Recommended Upload State Ownership

Upload state should live at the Video form boundary, either in a small `VideoUploadField` component with an `onUploadSuccess` callback or in a small `useVideoUpload` hook used only by `EntityFormPage`.

Recommended state:

- `selectedFile`: the currently selected `File`, or `null`.
- `uploadStatus`: `idle`, `selected`, `requesting`, `uploading`, `success`, or `error`.
- `progress`: integer percentage from 0 to 100.
- `streamVideoId`: returned Cloudflare Stream ID after success.
- `error`: user-readable upload failure message.
- `uploadAttemptId` or an abort reference if cancellation is later added.

The upload component should not own the complete Video form state. On success it should report the Stream ID to the form, and the form should update:

- `provider` to `cloudflare`.
- `provider_id` to the returned Stream video ID.

This keeps upload lifecycle state isolated while allowing the existing metadata/location form and generic save path to remain in control of the final Offward record.

## Expected Upload Flow

The frontend cannot verify the exact backend endpoint or response names from this repository. The following is the minimum contract the backend must expose for the recommended frontend integration.

### 1. Request an Offward direct-upload session

Use an authenticated Offward management endpoint, for example:

```http
POST /api/offward/manage/videos/upload-session/
Content-Type: application/json
X-CSRFToken: <csrf token>

{
  "filename": "ride-through-the-alps.mp4",
  "content_type": "video/mp4",
  "size": 123456789
}
```

The exact path and request fields must be confirmed against the backend. The response should contain at least:

```json
{
  "upload_url": "https://upload.videodelivery.net/<signed-upload-token>",
  "video_id": "<cloudflare-stream-video-id>"
}
```

If Cloudflare returns the Stream ID only after upload completion, the session response may omit `video_id`; the completion response or a backend status response must then provide it. The frontend must not derive or guess the ID from the upload URL.

### 2. Upload directly to Cloudflare Stream

Send the selected file to the returned signed URL, not through the Offward API:

```http
POST <upload_url>
Content-Type: multipart/form-data

file=<selected video file>
```

The exact Cloudflare direct-upload encoding depends on the backend-created upload URL. The frontend must follow the backend/Cloudflare contract for multipart field naming and headers. It must not attach the Offward session cookie or assume the Offward API base URL applies to this request.

### 3. Resolve the Stream ID

After Cloudflare upload success:

- Prefer the Stream ID supplied by the backend session/completion contract.
- If the direct-upload response supplies the ID, normalize it in the Offward upload helper.
- Reject success if no usable Stream ID is available; do not save a Video with an empty `provider_id`.

## Progress, Success, Failure, and Retry

### Progress

Use `XMLHttpRequest` for the Cloudflare upload and calculate:

```text
progress = round((loaded / total) * 100)
```

Update progress only for the direct Cloudflare file transfer. The short Offward session request can remain in `requesting` state without a percentage. The UI should distinguish `Preparing upload...` from `Uploading...`.

### Success

On successful upload and Stream ID resolution:

- Set `uploadStatus` to `success`.
- Set progress to `100`.
- Display the selected filename and a clear success state.
- Set `formData.provider` to `cloudflare`.
- Set `formData.provider_id` to the returned Stream ID.
- Lock or disable the provider and provider ID controls for this new upload-backed form state, while keeping them visible as system-populated values.
- Leave normal metadata and location editing enabled.
- Allow the user to create the Offward Video record.

### Failure

Failures should be separated into:

- Session request failure: the backend could not create a direct-upload session.
- Cloudflare transfer failure: the direct file request failed or was aborted.
- Completion/ID failure: the upload finished but no Stream ID could be resolved.

Display a concise error near the upload area, preserve the selected file where possible, set `uploadStatus` to `error`, and keep the normal metadata form available for correction. Do not set `provider_id` on failure.

### Retry and replace

- `Retry upload` should retry the selected file by requesting a fresh backend upload session. It should not reuse an expired signed URL.
- `Replace file` should clear the selected file, progress, error, and successful Stream ID state, then clear the auto-populated `provider_id` or mark the form as requiring a new upload.
- Replacing a successfully uploaded file before saving creates a new Stream upload. The frontend should not attempt to delete the prior Stream asset unless the backend explicitly provides that lifecycle operation.
- For edit forms, replacement behavior must be decided explicitly. The smallest safe first pass is to enable upload only on `/manage/videos/new`; keep existing edit records read-only with respect to upload unless the backend defines replacement semantics.

## Provider and Provider ID Editing Policy

The goal says the user must not manually paste a provider ID. The new-form UI should therefore:

- Remove or replace the generic editable `provider_id` text input when `resourceKey === 'videos'` and the form is creating a record.
- Render provider as a read-only value or controlled display set to `cloudflare` after upload.
- Render provider ID as a read-only text/display field populated from the successful upload.
- Disable the final Create action until upload succeeds and a non-empty Stream ID exists.

For edit forms, the existing `provider` and `provider_id` values may be displayed as read-only metadata initially. A future replacement workflow should not be inferred from ordinary CRUD edit support because replacing a Stream asset may require backend cleanup and audit behavior.

## Create Button Gating

For `/manage/videos/new`, the Create button should be disabled unless:

- `uploadStatus === 'success'`.
- `provider === 'cloudflare'`.
- `provider_id` is a non-empty Stream ID.
- No generic form submission is already in progress.

Location and metadata validation should still run when the user attempts to create. Upload success should not automatically create the Offward record; the user should retain control to finish title, slug, publication, and location fields first.

## Exact Reuse Assessment

### Safe to reuse

- [src/services/apiClient.js](src/services/apiClient.js#L1-L47) for the authenticated Offward session request, including credentials and CSRF handling.
- [src/services/management/entityApi.js](src/services/management/entityApi.js#L1-L38) for the final Video create/update request; it should not be changed to become an upload client.
- Existing generic form error styling and save-state conventions in [src/features/management/EntityFormPage.jsx](src/features/management/EntityFormPage.jsx).
- Existing form layout and management CSS conventions in [src/index.css](src/index.css).

### Do not reuse or modify

- No Gallery / Private component or helper exists in this repository to reuse.
- Do not couple Offward to Gallery-specific routes, state, upload URLs, or media records if they exist in another application.
- Do not modify the existing Route map, Place picker, public Video page, public Video service, or Story surfaces for this upload feature.

## Recommended Offward Frontend Upload Integration

1. **Add an Offward-only upload service.** Create `src/services/management/videoUploadApi.js` with one method to request an authenticated direct-upload session from the backend. Keep the exact endpoint and response mapping behind this helper. Do not alter `managementApis.videos` or the generic CRUD factory.

2. **Add an Offward-only upload component.** Create `src/features/management/VideoUploadField.jsx` with:
   - file chooser;
   - selected filename and size;
   - Upload, Retry upload, and Replace file actions;
   - requesting/uploading/success/error states;
   - progress bar and percentage;
   - an XHR-based direct Cloudflare upload;
   - `onUploadSuccess(streamVideoId)` and `onUploadError(message)` callbacks.

3. **Mount it near the top of the Video form.** Render it only for `resourceKey === 'videos'`, preferably on the create route first. Keep the existing metadata and location fields below it. Do not add it to Story, Gallery, Private, or public Video pages.

4. **Move provider ID ownership to upload state.** On success, the parent form sets `provider = 'cloudflare'` and `provider_id = streamVideoId`. The create form should render these values as read-only/disabled and should not expose a manual provider-ID text input.

5. **Gate creation.** The new Video Create button remains disabled until a successful upload has populated the Stream ID. The final generic `managementApis.videos.create(payload)` call remains unchanged.

6. **Keep edit behavior conservative.** The minimum safe implementation supports upload on `/manage/videos/new`. Existing edits keep their current provider/provider ID display and do not silently replace an already attached Stream asset. Any edit replacement workflow should wait for an explicit backend contract.

### Minimum frontend files to change

- `src/features/management/EntityFormPage.jsx`
  - mount the upload component;
  - receive the Stream ID;
  - set `provider` and `provider_id`;
  - make provider fields read-only after upload;
  - gate Create on upload success;
  - leave metadata/location and generic payload logic intact.
- `src/features/management/VideoUploadField.jsx`
  - new Offward-only upload UI and XHR transfer state.
- `src/services/management/videoUploadApi.js`
  - new Offward-only direct-upload session request helper.
- `src/index.css`
  - only if the existing management styles do not provide sufficient upload-area/progress styles.

### Files that must remain unchanged

- `src/services/management/entityApi.js`
- `src/services/management/index.js`
- `src/app/manageRouter.jsx`
- `src/shared/components/ManagementSidebar.jsx`
- `src/pages/manage/ManageDashboardPage.jsx`
- `src/pages/VideoPage.jsx`
- `src/services/videosApi.js`
- all Story frontend files
- all Place and Route map files
- any Gallery / Private Cloudflare files outside this repository or in another app
- all backend files

The endpoint path, session request fields, direct-upload multipart shape, and Stream ID response location remain backend contract items to confirm before implementation.
