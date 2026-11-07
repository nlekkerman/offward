# OFFWARD Frontend Gallery & Image Viewer Audit

**Scope:** Public frontend detail pages for Places, Routes, and Food.
**Method:** Inspected executable frontend source only. No existing Markdown documentation, tests, builds, or backend source were inspected.

## Summary

- Places, Routes, and Food use the shared `EntityMediaSection` and `ImageLightbox`, but do not use the media section in the same display mode.
- **Confirmed Place issue:** `PlacePage` omits `showAllImages`, whose default is `false`. The shared component therefore renders one cover preview per attached collection, not the collection's image grid. The preview image itself is not clickable; the separate **View** button opens the viewer.
- **Route and Food issue is conditional on the detail payload:** both pages enable `showAllImages`, and the shared component renders every embedded image with a usable URL. However, each page treats any nonempty embedded `images` array as complete and skips fetching the collection detail. If the owner-detail payload embeds only a cover/partial preview while the collection has more images, only the embedded item(s) are rendered and the viewer is opened with only those item(s). Source alone cannot establish whether the live API responses are partial.
- A reusable lightbox already exists and is wired to all three detail pages. Route and Food image buttons open it; Place opens it through **View**, not by clicking the cover. The viewer supports close, keyboard navigation, and previous/next buttons; it is a full-viewport overlay but does not invoke browser fullscreen and has no touch-swipe navigation.
- The three pages share components and the same image-collection concept, but the confirmed Place display behavior and the conditional Route/Food behavior are not one identical frontend defect. No evidence in the frontend proves that the backend is responsible.

## Files and components inspected

| File/component | Relevant lines | Evidence/use |
|---|---:|---|
| `src/services/apiClient.js` | 12–16 | Axios client configuration; no response-data transformation. |
| `src/services/placesApi.js` | 19–30 | Place detail request validates object shape and spreads the response, normalizing only access-start text fields. |
| `src/services/routesApi.js` | 38–52 | Route detail request validates object shape and returns response data unchanged. |
| `src/services/foodsApi.js` | 12–26 | Food detail request validates object shape and returns response data unchanged. |
| `src/services/imageCollectionsApi.js` | 3–7 | Fetches one public image collection by ID and returns response data unchanged. |
| `src/pages/PlacePage.jsx` (`PlacePage`) | 128–135, 223–250, 604–615 | Loads Place data, resolves attached collections, fetches collection detail on **View**, renders shared media section without `showAllImages`, and mounts the lightbox. |
| `src/pages/RoutePage.jsx` (`RoutePage`) | 196–205, 245, 274–306, 775–802 | Loads Route data, orders attached collections, opens embedded images or fetches details only when no usable embedded images exist, renders all-image mode, and mounts the lightbox. |
| `src/pages/FoodPage.jsx` (`FoodPage`) | 40–44, 52–80, 95–97, 128–131 | Loads Food data, orders attached collections, uses the same embedded-image shortcut, renders all-image mode, and mounts the lightbox. |
| `src/features/routes/components/EntityMediaSection.jsx` (`EntityMediaSection`) | 5–12, 22–45, 79–110 | Shared gallery-card versus all-embedded-images rendering and image-click handler. |
| `src/features/routes/components/routeMediaUtils.js` | 31–57 | Collection de-duplication, collection ordering, image ordering, and URL-based image filtering. |
| `src/features/management/imageCollectionUtils.js` | 79–93 | Cover-preview selection and collection image-count fields used by the shared media component. |
| `src/shared/components/ImageLightbox.jsx` (`ImageLightbox`) | 17–61, 74–123 | Shared viewer, key handling, close and navigation controls, and event propagation. |
| `src/shared/components/ImageLightbox.css` | 1–9, 48–92, 114–124 | Full-viewport overlay, viewer controls, and mobile control positioning. |
| `src/index.css` | 3586–3662 | Gallery card and responsive image-grid styling; no click-blocking overlay is applied to the image buttons. |

## Gallery data flow

### Common API boundary

Each detail page calls its entity-specific public detail API. The services return the response data without projecting or reducing `image_collections` or their `images` arrays: Place spreads the received object while adding access-start defaults; Route and Food return the received object after basic object validation. The shared `apiClient` does not install a response interceptor that changes these arrays.

The public image-collection service separately requests `/api/offward/image-collections/{id}/` and returns its response body as-is. The frontend source therefore shows the endpoints and how their data is consumed, but does not establish the number or completeness of images returned by either response.

### Places

1. `PlacePage` receives the object returned by `getPublicPlaceBySlug` and derives `galleries` using `resolveImageCollections`.
2. `resolveImageCollections` reads `owner.image_collections`, removes entries without an ID and duplicate IDs, and otherwise retains source order. It does not slice the `images` array or apply status/visibility filtering.
3. `PlacePage` renders `EntityMediaSection` without `showAllImages`. The component defaults that prop to `false` and renders the gallery-card branch. That branch chooses one `collectionPreview` URL and presents a separate **View** button.
4. The **View** button calls `PlacePage.openGallery`, which fetches the full collection by ID (or uses its cache), then passes the returned `images` array to `ImageLightbox`. This click path does not order or filter the fetched array in `PlacePage`; it relies on the collection response's order and image shape.

**Finding:** The Place detail page is configured to show one cover preview per collection. A user clicking the preview image does not open the viewer because the preview is a noninteractive span; the separate **View** button does. The code can show a multi-image viewer after that button is activated if the collection-detail response contains multiple images.

### Routes

1. `RoutePage` receives the Route response and derives `routeImageCollections` with `orderedImageCollections`.
2. `orderedImageCollections` uses the embedded `image_collections` array, de-duplicates collections by ID, and sorts collections by their `order` field (using source index as fallback).
3. The Route page passes `showAllImages` to `EntityMediaSection`. The shared component runs each collection's `images` through `orderedCollectionImages`, which filters out rows lacking both `url` and `thumbnail_url`, then orders remaining rows by image `order` with source position as a tie/fallback order. It does not slice the list to one item or filter by a visibility/status property.
4. Each rendered image is a button with an `onClick` that calls `openGallery(gallery, imageIndex)`. `openGallery` uses the usable embedded image list immediately if its length is greater than zero. It checks the collection cache and fetches the collection detail only when there are no usable embedded images.

**Finding:** The Route frontend renders all usable images present in the embedded collection. It does not establish that the embedded list is complete. A nonempty partial list (for example, one preview while a larger `image_count` is reported) prevents the detail fetch and becomes both the displayed grid and the lightbox sequence. Whether this condition occurs in actual API responses is unresolved from frontend source.

### Food

1. `FoodPage` receives the Food response and derives galleries through the same `orderedImageCollections` helper used by Routes.
2. It passes `showAllImages` to the same `EntityMediaSection`, so the same URL filtering and image ordering apply.
3. Its image buttons call `openGallery(preview, imageIndex)`. As in Route, a nonempty usable embedded image array is immediately used; the full collection endpoint is consulted only if that array is empty. The page has a cache and prevents concurrent fetches for the same collection.

**Finding:** Food has the same completeness assumption as Route. It renders all usable embedded images, but does not fetch the complete collection when the embedded array is nonempty but partial. Actual response completeness cannot be verified from the client source.

### Ordering, filtering, and cover use

- No inspected public detail service slices an image list, overwrites it, or chooses a single image.
- For Route and Food, collection and image arrays are ordered by `order` with stable source-index fallback. The per-image helper removes only images without both a full URL and thumbnail URL; it applies no status or visibility filter.
- Place de-duplicates collection IDs while retaining the response's collection order; its gallery card intentionally selects one collection preview. Its lightbox uses the fetched collection image array without the Route/Food ordering helper.
- `collectionCount` recognizes `image_count`, `images_count`, or the length of `images`; `collectionPreview` chooses a preview image or the first embedded image. The Route/Food open handlers do not compare that count with the number of embedded usable images.

## Image viewer and interaction findings

- `ImageLightbox` is an existing shared component imported by all three detail pages. It takes an image list, active index, open state, close callback, and previous/next callbacks.
- Route and Food image thumbnails are buttons wired to `onOpenGallery`. Place uses the same gallery card component but has no handler on its cover image; its **View** button is wired to the open-gallery function.
- The shared viewer closes by its close button, Escape, or backdrop click. The dialog stops click propagation so clicks inside the viewer do not close it. It supports left/right arrow keys and previous/next buttons when the currently opened collection has multiple images. Page callbacks wrap navigation within that one collection.
- The viewer uses a fixed, full-viewport backdrop with a large contained image, but there is no `requestFullscreen`/browser-fullscreen behavior in the inspected viewer source.
- Mobile styling repositions and resizes the close and previous/next buttons. These controls support tap interaction, but there is no touch-swipe navigation handler in the viewer. No relevant overlay or `pointer-events` rule was found that blocks the Route/Food image buttons.
- The viewer is reusable as-is for all three content types. Its current navigation sequence is the active collection's image array, not all images across multiple attached collections.

## Cause and shared-issue assessment

| Content type | Confirmed frontend behavior | Cause status |
|---|---|---|
| Place | Uses cover-card mode (`showAllImages` defaults to false); cover image has no click handler; **View** fetches collection detail and opens the viewer. | **Confirmed frontend display-mode cause.** |
| Route | Uses all-image mode, but any nonempty embedded usable-image list suppresses full-collection fetch. | **Conditional frontend completeness bug.** Impact depends on whether the API embeds a partial list. |
| Food | Same all-image mode and nonempty-embedded-list shortcut as Route. | **Conditional frontend completeness bug.** Impact depends on whether the API embeds a partial list. |

There is a shared rendering component and a shared collection data shape, but no single identical frontend cause for all three. Place is unconditionally configured to render a cover card. Route and Food are configured to render all embedded images; their code can still show only one if that is all the entity response embeds. The source does not prove that the backend is omitting images, nor does it prove that it returns complete embedded lists.

## Minimal recommended changes

1. **`src/pages/PlacePage.jsx` and `src/features/routes/components/EntityMediaSection.jsx`:** use the existing all-image grid for Place detail and make sure the displayed image list is complete before treating it as the gallery. Preserve the existing card layout elsewhere that intentionally uses preview mode.
2. **`src/pages/RoutePage.jsx` and `src/pages/FoodPage.jsx` (or a shared helper in `src/features/routes/components/routeMediaUtils.js`):** do not treat any nonempty embedded array as a complete collection. When the source provides a count, compare it with the usable embedded count and fetch the collection detail if incomplete; otherwise establish completeness through the actual API response contract before deciding the fallback. Preserve the current ordering and URL validity rules.
3. **`src/features/routes/components/EntityMediaSection.jsx`:** retain the existing per-image click buttons for all-image mode; for Place, ensure a visible image is itself an interactive image target. Reuse the current `onOpenGallery` callbacks and `ImageLightbox`; no new viewer dependency is indicated.
4. **`src/shared/components/ImageLightbox.jsx` and `src/shared/components/ImageLightbox.css`:** no change is needed for close, keyboard previous/next, or tap controls. Add touch-swipe behavior only if mobile gesture navigation is an explicit requirement; add native fullscreen behavior only if “fullscreen” means browser fullscreen rather than the current full-viewport modal.

## Backend/API contract questions not resolvable from frontend source

- Does each public Place, Route, and Food detail response include complete `image_collections[].images` arrays, or only a preview/subset?
- When the response includes `image_count` or `images_count`, is it the count of publicly viewable images, and should it equal the number of embedded image records?
- Does the public image-collection detail endpoint return every publicly viewable image in the intended order, with usable `url` or `thumbnail_url` fields and an `order` value?
- Are there image visibility/status rules the frontend is expected to apply, or are nonpublic images omitted by the public API?

These questions require inspection of actual API responses or backend implementation, both outside this audit's frontend-source-only evidence.
