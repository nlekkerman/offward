# Offward Image Upload Request Audit

## Scope and Verdict

This is a read-only audit of the frontend Gallery image upload request. No application code was changed.

Root cause found: the upload helper builds a `FormData` and appends the file under the wrong field name. It sends `image` instead of the backend-required `file`, so Django never receives an uploaded file under the `file` key and returns `invalid_image_type` / `An image file is required.`

## 1. Image Upload API Helper

- File: [src/services/management/imageCollectionsApi.js](../../src/services/management/imageCollectionsApi.js)
- Function: `uploadImage(file)`

```js
export async function uploadImage(file) {
  const formData = new FormData()
  formData.append('image', file)
  const { data } = await apiClient.post('/api/offward/manage/images/', formData)
  return data
}
```

- Uses `FormData`: yes.
- Field name used in `formData.append(...)`: `'image'` (should be `'file'`).
- Appends the actual browser `File`: yes, the raw `File` object passed in is appended directly (no wrapping/serialization).
- Manually sets `Content-Type`: no — no headers are passed to `apiClient.post`, so this call itself does not override the multipart boundary.

## 2. Caller

- File: [src/pages/manage/galleries/GalleryEditPage.jsx](../../src/pages/manage/galleries/GalleryEditPage.jsx)
- Handler: `uploadFiles(event)`, wired to the hidden file `<input>` via `inputRef`.

```js
const files = Array.from(event.target.files || [])
...
for (const file of files) {
  try {
    const asset = await uploadImage(file)
    successfulImages.push({ ...asset, image_id: asset.id, caption: '' })
  } catch (errorValue) {
    failures.push(`${file.name}: ${errorMessage(errorValue, 'upload failed')}`)
  }
}
```

- `event.target.files` is used: yes, converted with `Array.from(event.target.files || [])`.
- Each item passed to `uploadImage` is a real `File`: yes — `files` is the direct array of `File` objects from the input, iterated with `for (const file of files)`, and `file` is passed unmodified.
- No mapping converts it to metadata/object/string first: confirmed. The only transformation happens to the upload *response* (`asset`), not to the outgoing `file`.

## 3. Axios/apiClient Behavior

- File: [src/services/apiClient.js](../../src/services/apiClient.js)
- `apiClient` is created with only `baseURL` and `withCredentials: true` — no default `Content-Type` header is set on the instance.
- The request interceptor only adds `X-CSRFToken` for unsafe methods; it does not touch `Content-Type`.
- `uploadImage` does not pass any custom headers to `apiClient.post`.
- Conclusion: no global or per-call forcing of `Content-Type: application/json` or manual `multipart/form-data` was found. Axios/browser is free to set the multipart boundary automatically for this request. This is not the bug.

## 4. Request Payload

Actual outgoing body shape: **FormData with the wrong key** — a real `File` is attached, but under `image` instead of `file`.

- Not JSON.
- Not an empty FormData.
- FormData with wrong key: yes — this is the actual issue.
- Not a non-File value (the value is a real `File`).
- Not a correct multipart request per backend contract (field name mismatch).

## 5. Multiple Upload Loop

`uploadFiles` loops with `for (const file of files) { await uploadImage(file) }`, passing the raw `File` object directly on each iteration — not `{ file }`, not `file.name`, not a metadata object. The loop itself is correct; the defect is entirely inside `uploadImage`'s field name.

## 6. Backend Contract Match

| Aspect | Backend expects | Frontend sends | Match |
|---|---|---|---|
| Method/path | `POST /api/offward/manage/images/` | `POST /api/offward/manage/images/` | ✅ |
| Encoding | multipart/form-data | multipart/form-data (FormData, browser-set boundary) | ✅ |
| Field name | `file` | `image` | ❌ |
| Value | actual File | actual File | ✅ |

The only mismatch is the field name.

## 7. DevTools Expectation

When correct, Chrome Network → Payload (Form Data) should show:

```
file: (binary)
```

Currently it would show:

```
image: (binary)
```

Because the key is `image`, Django's `request.FILES.get('file')` (or equivalent) finds nothing, triggering `invalid_image_type` / `An image file is required.` even though a valid image file was actually uploaded under a different key.

## Root Cause Summary

`uploadImage` in [src/services/management/imageCollectionsApi.js](../../src/services/management/imageCollectionsApi.js) calls `formData.append('image', file)` instead of `formData.append('file', file)`. Everything else in the pipeline (file input handling, real `File` object propagation, upload loop, Axios/apiClient headers) is correct.

## Smallest Safe Fix

In `uploadImage`, change:

```js
formData.append('image', file)
```

to:

```js
formData.append('file', file)
```

No other file needs to change. No Content-Type header changes are needed since none is currently forced.
