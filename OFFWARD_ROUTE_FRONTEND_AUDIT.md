# OFFWARD Route Frontend Audit

Source-code-only audit of the three requested frontend tasks. No application code was changed; no tests or builds were run.

## 1. Route Gallery Padding

### 1. Current implementation

- `RoutePage` reads the route's ordered image collections, fetches each public collection with `getPublicImageCollection`, and exposes the loaded results as `displayImageCollections`.
- The route detail renders `EntityMediaSection` in the right-hand details column with `showAllImages`. That component renders each collection's images as an `.entity-media-image-grid` list; selecting an image opens the existing `ImageLightbox`.
- The gallery follows the route map in document order and remains part of the detail sidebar.

### 2. Relevant files and components

- `src/pages/RoutePage.jsx` — `RoutePage`, collection loading, gallery placement.
- `src/features/routes/components/EntityMediaSection.jsx` — route image grid and lightbox trigger.
- `src/features/routes/components/routeMediaUtils.js` — collection/image ordering and filtering.
- `src/services/imageCollectionsApi.js` — public collection retrieval.
- `src/index.css` — `.entity-detail-media`, `.entity-media-collection`, and `.entity-media-image-grid` styles and responsive rules.

### 3. Identified problems

- The public shell gives `.entity-detail-media` a background, but its route gallery styling has no horizontal padding. The image list itself explicitly resets its padding to `0`, and the collection wrapper has no inset. Consequently, the first and last image tiles align with the media container edges.
- The route page's own outer padding does not inset images from the background of this nested media container.

### 4. Proposed minimal solution

Add horizontal padding to the route media container (for example, `1rem` on wider layouts and a slightly smaller value on narrow screens). This will inset the section heading and gallery consistently without changing image order, tile styling, or the existing layout. Keep the existing list reset so the inset comes from one clear container rule.

### 5. Files requiring modification

- `src/index.css`

No component or data changes are needed.

### 6. Responsive layout issues or regressions to watch

- The route detail becomes a two-column layout at `min-width: 1024px`; below that it is single-column. A padded sidebar gallery will have less available width on desktop, so the existing `minmax(180px, 1fr)` auto-fill grid may show fewer columns.
- At `max-width: 600px`, the grid is explicitly two columns with a smaller gap. Keep the new inset modest so tiles do not become too narrow on small phones.

## 2. Route Hero Slideshow

### 1. Current implementation

- The route's `DetailHero` currently contains only the route title, share control, metadata, and status text. It has no image or slideshow behavior.
- Route image collections are obtained from the public route response, ordered with `orderedImageCollections`, then hydrated from the public image-collection endpoint. Each loaded collection is normalized through `orderedCollectionImages`.
- The current bottom gallery is rendered after the map in the route details column by `EntityMediaSection`; each tile opens `ImageLightbox`.
- `ImageLightbox` is a reusable full-viewport image viewer with close, previous/next controls, keyboard Escape/arrow navigation, and a numeric position indicator. It has no slide-dot controls and is not itself an inline slideshow.

### 2. Relevant files and components

- `src/pages/RoutePage.jsx` — `DetailHero` placement, image collection loading/cache, existing bottom gallery, and `ImageLightbox` state.
- `src/shared/components/DetailHero.jsx` — shared text-hero wrapper.
- `src/features/routes/components/EntityMediaSection.jsx` — existing bottom gallery.
- `src/features/routes/components/routeMediaUtils.js` — ordered route collections and images.
- `src/services/imageCollectionsApi.js` — public collection fetch and in-flight request sharing.
- `src/shared/components/ImageLightbox.jsx` and `src/shared/components/ImageLightbox.css` — reusable fullscreen viewer and its responsive sizing.
- `src/index.css` — hero and route-detail responsive layout.

### 3. Identified problems

- There is no existing inline slideshow/carousel component in the frontend. `RouteMediaGrid` is for videos, `EntityMediaSection` is a collection/gallery renderer, and `ImageLightbox` is fullscreen-only.
- The route's images are currently displayed only below the map. The route hero has no image-specific layout or controls.
- Collection images load asynchronously. The slideshow must use the existing hydrated collection data rather than issue another set of requests or use placeholder/dummy images.

### 4. Proposed minimal solution

- Add a route-specific, inline slideshow at the top of the route detail hero, using the existing ordered and hydrated route images flattened across collections. Render the slideshow only when usable images are available; retain the text-only hero when none are available.
- Provide previous/next buttons and accessible, selectable slide indicators. Make image selection open the existing `ImageLightbox` with the same flattened list and current index; its fullscreen controls and keyboard navigation can be reused.
- Keep the existing `EntityMediaSection` in place below the map. This preserves the current bottom gallery and its per-collection titles and organization.
- No new dependency is needed. A small route-specific component is an option if the markup warrants it, but no current component supplies the inline slideshow behavior.

### 5. Files requiring modification

- `src/pages/RoutePage.jsx` — connect slideshow state and existing route images, place it in the hero, and open the existing lightbox from the active slide.
- `src/index.css` — slideshow sizing, controls/indicators, and responsive hero styling.
- A new route-specific slideshow component file only if implementation separates the UI from `RoutePage`; it is not required by the existing component structure.

`src/shared/components/ImageLightbox.jsx` should not need changes if the existing image shape and callbacks are used.

### 6. Responsive layout issues or regressions to watch

- The hero content is capped at `1280px`, with top padding for the public header; on mobile the route page has narrower side gutters and the hero content retains substantial top spacing. The slide must fit within those constraints without covering the title or global navigation.
- The route's main content becomes a single column below `1024px`, while the map has mobile-specific height limits. Keep the slideshow width independent of the two-column map/sidebar grid so it remains full-width at both breakpoints.
- Use a stable image aspect ratio and constrain the image (`object-fit: cover` or `contain`) to avoid layout jumps and oversized images. Controls and indicators need touch-sized targets and must not overlap important image content on narrow screens.
- Prefer user-controlled navigation unless autoplay is explicitly requested; this avoids introducing motion and timer behavior not present in the current page.

## 3. Story Layout Correction

### 1. Current implementation

- `StoryPage` places the excerpt in `.story-detail-header` inside `DetailHero`.
- Immediately after `DetailHero`, it renders the “Back to Explore” link; the story body follows that link.
- Story media, related Place cards, related Route cards, and related food appear later in the same page section. There is no separate “related stories” list in this page implementation.

### 2. Relevant files and components

- `src/pages/StoryPage.jsx` — story excerpt, body, navigation, media, related Place/Route sections, and related food.
- `src/shared/components/DetailHero.jsx` — story hero wrapper.
- `src/shared/components/CompactRelatedEntityCard.jsx` — related Place/Route cards.
- `src/index.css` — `.story-detail-content-page`, `.story-detail-body`, related-group, and navigation sizing/breakpoint rules.

### 3. Identified problems

- The Back to Explore link is a sibling between the hero (which contains the excerpt) and the body. Its position in document flow visibly interrupts the transition from the excerpt into the story.
- Existing CSS centers the link and gives it bottom margin, reinforcing its appearance as a separate block between the two pieces of story content.
- The page contains related Places and Routes, but no associated-story list; the report should not assume a missing story relationship UI.

### 4. Proposed minimal solution

Keep the excerpt, body, media, and related-content sections in their existing order, but make them a continuous story-content group with no navigation link between the excerpt and body. Move “Back to Explore” outside that group, preferably after the story and related-content sections. This is a small markup move that does not require changing the story data or card components.

### 5. Files requiring modification

- `src/pages/StoryPage.jsx`
- `src/index.css` only if a new grouping wrapper or navigation-specific spacing is introduced; moving the existing link alone can retain current styles.

### 6. Responsive layout issues or regressions to watch

- The story header/body use a `760px` maximum width, reduced at `max-width: 900px`, and become full-width with adjusted padding at `max-width: 640px`. Preserve these rules if the content is wrapped.
- Moving navigation to the end makes it less immediately available when a story is long. If it is instead placed above the story group, preserve the top clearance currently provided by the hero's padding so it does not collide with the public header, especially on mobile.
- Keep related cards' existing responsive grid behavior and avoid making the full story group impose a narrow prose width on its media or related-card grids.
