# Offward Story Image Collection Create Audit

## Scope and Verdict

This is a read-only audit of the frontend Story image collection creation flow. No application code was changed.

The frontend does have a working create path for ImageCollections from the Story editor, but the visible `Create image gallery` button is not the POST trigger. It only expands an inline create form. The actual POST happens when the editor submits that form with the `Create gallery` button.

The exact root cause of the confusing Story editor behavior is state flow after creation: a newly created ImageCollection is appended to the local gallery list and opened in the collection editor, but it is not attached to the Story form state. `image_collection_ids` is not updated until the editor separately clicks the gallery card in the picker. Therefore `Attached image galleries` can still show `None attached` immediately after successful creation.

There is no backend contract mismatch for the create payload found in this frontend flow when a real title is entered: the POST goes to `/api/offward/manage/image-collections/` with `{ title, description }` through the authenticated shared API client. A title input exists and is marked `required`, so an actually empty browser-submitted title is blocked before the POST. Backend field-level validation errors may still be poorly surfaced because the error formatter only reads `response.data.detail` and `error.message`.

## Files Involved

- [src/features/management/ContentImageCollectionManager.jsx](../../src/features/management/ContentImageCollectionManager.jsx): renders `Create image gallery`, owns create state, calls `imageCollectionsApi.create`, appends the returned collection, and opens the collection editor.
- [src/services/management/imageCollectionsApi.js](../../src/services/management/imageCollectionsApi.js): defines the ImageCollection API helper, including `create` for `POST /api/offward/manage/image-collections/`.
- [src/services/apiClient.js](../../src/services/apiClient.js): shared Axios client with `VITE_API_BASE_URL`, `withCredentials: true`, and automatic CSRF header injection for unsafe methods.
- [src/features/management/EntityFormPage.jsx](../../src/features/management/EntityFormPage.jsx): mounts `ContentImageCollectionManager` for Stories and wires `onAttachmentsChange` to `formData.image_collection_ids`.
- [src/features/management/entityConfig.js](../../src/features/management/entityConfig.js): initializes Story `image_collection_ids` to an empty array.

## Button Location

The label `Create image gallery` is rendered by `ContentImageCollectionManager` in [src/features/management/ContentImageCollectionManager.jsx](../../src/features/management/ContentImageCollectionManager.jsx).

Component: `ContentImageCollectionManager`.

Click handler:

```jsx
onClick={() => setCreating((current) => !current)}
```

Visibility and enabled conditions:

- The button is visible whenever `ContentImageCollectionManager` is rendered.
- In Story forms, the manager is rendered from the `stories` branch of `EntityFormPage`.
- The button is disabled only when the manager receives `disabled={true}`.
- The Story form mount does not pass `disabled`, so the default `disabled = false` leaves it enabled.
- The inline create form is visible only when local `creating` state is `true`.

## Current Click Flow

1. Story edit/new form renders `ContentImageCollectionManager` with `attachedCollectionIds={formData.image_collection_ids || []}`.
2. `ContentImageCollectionManager` loads existing collections with `imageCollectionsApi.list()` on mount.
3. Clicking `Create image gallery` only toggles `creating`.
4. When `creating` is true, the component renders an inline form with required `Title`, optional `Description`, and a `Create gallery` submit button.
5. Submitting that inline form calls `createCollection(event)`.
6. `createCollection` calls `imageCollectionsApi.create({ title: newTitle, description: newDescription })`.
7. On success, the created collection is prepended to local `collections`, create fields are reset, the create form closes, and `editing` is set to the created collection.
8. The new collection is not added to `formData.image_collection_ids` and is not marked selected in the picker.

## API Helper Inspection

`imageCollectionsApi.create` exists in [src/services/management/imageCollectionsApi.js](../../src/services/management/imageCollectionsApi.js).

- Function name: `imageCollectionsApi.create`.
- Endpoint: `/api/offward/manage/image-collections/`.
- HTTP method: `POST`.
- Request body: the caller-supplied `payload` object.
- Return value: `data` from the Axios response.
- Error handling: none inside the helper; Axios errors propagate to the caller.

The create call used by the Story image manager is:

```js
imageCollectionsApi.create({ title: newTitle, description: newDescription })
```

## Actual POST Payload

When the inline create form is submitted, the frontend sends:

```json
{
  "title": "<newTitle state>",
  "description": "<newDescription state>"
}
```

`newTitle` comes from the inline `Title` input. `newDescription` comes from the inline `Description` textarea.

## Required Title Handling

The frontend does provide a title field before creating the ImageCollection.

- There is no modal.
- There is an inline `Title` input inside the create form.
- The `Title` input has the native HTML `required` attribute.
- No default title is generated.
- A truly empty title is blocked by browser form validation before `createCollection` runs.
- Whitespace-only input is not trimmed in the frontend, so that value can be sent as `title` unless the browser or backend rejects it.

The likely title-related risk is not a missing input. It is that backend field errors for invalid titles may not be displayed clearly, because `errorMessage` only checks `error.response.data.detail` before falling back to `error.message`.

## Creation Result State

If creation succeeds, the returned ImageCollection is handled as follows:

- Added to local collection list: yes, via `setCollections((current) => [created, ...current])`.
- Selected/attached in the picker: no, because `selectedIds` is derived only from `attachedCollectionIds`.
- Attached to Story state: no, because `onAttachmentsChange` is not called after create.
- Opened in the image manager/editor: yes, via `setEditing(created)`.

The state controlling the open collection editor is `editing`. It stores the active collection object, not just an ID. The new collection object is assigned to it after creation.

## Collection List Refresh

After create, the frontend appends the returned collection locally. It does not refetch `GET /api/offward/manage/image-collections/`.

A stale list is not the primary failure after a successful create, because the new collection is inserted immediately from the POST response. A stale list could still occur if the backend response is partial or if another editor changed collections concurrently, but the observed `None attached` state is explained by Story attachment state, not by list refresh.

## Story Attachment

Creating a collection does not automatically update `image_collection_ids` in Story form state.

Attachment is currently a separate action:

- Clicking an existing gallery card calls `toggleCollection(collection.id)`.
- `toggleCollection` computes the next ID array and calls `onAttachmentsChange(next)`.
- In the Story form, `onAttachmentsChange` writes that array to `formData.image_collection_ids`.

The create handler never calls `toggleCollection` or `onAttachmentsChange` for the created ID.

## Image Manager Open State

The open collection is controlled by `editing` in `ContentImageCollectionManager`.

- Existing attached rows open a collection with `setEditing(collection)`.
- Successful create opens the returned collection with `setEditing(created)`.
- Closing the editor calls `setEditing(null)`.

The newly created collection is opened for image management, but opening it is independent from Story attachment. The new ID is assigned to `editing`, not to `image_collection_ids`.

## Error Visibility

Create failures are caught in `createCollection` and stored in `createError`. The create form renders `createError` in a paragraph with `role="alert"`.

The visible error text is produced by:

```js
error?.response?.data?.detail || error?.message || 'Unable to create this gallery.'
```

Consequences:

- Errors with a top-level `detail` should be visible.
- Generic network/Axios errors should be visible through `error.message`.
- Field-shaped validation errors such as `{ "title": ["This field may not be blank."] }` are not explicitly flattened, so the user may see a generic Axios message instead of the backend validation text.
- Empty title should usually be caught by the browser before POST because the title input is required.

## Backend Contract Match

Based on the contract stated for this audit, the frontend create request matches the endpoint and required title field when the inline form is submitted with a non-empty title.

- Endpoint path: matches `/api/offward/manage/image-collections/`.
- Method: matches `POST`.
- Required field: sends `title` from `newTitle`.
- Optional field: sends `description` from `newDescription`.
- Request shape: plain JSON object through Axios.
- Auth/credentials: uses the shared `apiClient`.

No frontend evidence shows a wrong field name or direct browser fetch bypass. The main mismatch is behavioral: users may expect `Create image gallery` in the Story editor to create and attach a Story gallery, but current creation only creates and opens the ImageCollection.

## Network and Auth Path

The create request goes through `imageCollectionsApi.create`, which imports `apiClient` from [src/services/apiClient.js](../../src/services/apiClient.js).

The request therefore uses:

- `baseURL: import.meta.env.VITE_API_BASE_URL`.
- `withCredentials: true` for cookies.
- CSRF acquisition via `/api/auth/csrf/` when needed.
- `X-CSRFToken` injection for POST.

There is no direct `fetch` bypass in this flow.

## UI Wording

`Create image gallery` is partially truthful but ambiguous.

Strictly, that button does not create anything. It opens the inline create form. The later `Create gallery` submit button creates the ImageCollection.

The current implementation does not only select existing ImageCollections: creation exists and posts to the backend. The broken/misleading part is that creation does not attach the created gallery to the Story or make `Attached image galleries` change from `None attached`.

## Smallest Safe Fix

The smallest safe implementation fix would be in `ContentImageCollectionManager.createCollection` after a successful create:

1. Keep the existing append and `setEditing(created)` behavior.
2. Also call `onAttachmentsChange` with the created collection ID added to the current `attachedCollectionIds`, if it is not already present.
3. Optionally trim/validate `newTitle` before sending and display flattened field validation errors from `response.data`.
4. Consider changing the first button label to indicate that it opens the create form, or keep the label but ensure the resulting create action attaches the new gallery so the Story editor state matches user expectation.

No Video flow, public Story flow, backend code, or new component is needed for that fix.