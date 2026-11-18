# OFFWARD Route Frontend Implementation

Implemented the three approved frontend tasks. No backend changes, tests, or builds were performed.

## 1. Files created and modified

Created:

- `src/features/routes/components/RouteHeroSlideshow.jsx`
- `OFFWARD_ROUTE_FRONTEND_IMPLEMENTATION.md`

Modified:

- `src/index.css`
- `src/pages/RoutePage.jsx`
- `src/pages/StoryPage.jsx`

## 2. Implementation summary

### Route gallery padding

- Added route-detail-scoped internal padding to the existing route media container: `1rem` on desktop and `0.75rem` at the mobile breakpoint.
- Added width constraints to the padded container to avoid horizontal overflow. Existing grid, collection ordering, and lightbox behavior are unchanged.

### Route hero slideshow

- Added a route-specific slideshow at the top of the existing `DetailHero`, above the route title and before the map/main content.
- The route reuses `displayImageCollections`; images are flattened with the existing `orderedCollectionImages` utility. No additional image requests or data sources were introduced.
- Added previous/next buttons and selectable, labeled slide indicators. These controls are omitted for a single image. The active image opens the existing `ImageLightbox` at the same flattened image index.
- The existing bottom `EntityMediaSection` gallery remains in place and retains its per-collection layout.
- No autoplay, new dependencies, shared component changes, or visual assets were added.

### Story layout correction

- Removed “Back to Explore” from between the story hero/excerpt and story body.
- Relocated the link after the body, media, related Place/Route sections, and related food. No story relationships or API behavior changed.

## 3. Responsive behaviour

- The slideshow uses a stable 16:9 image ratio on wider layouts and 4:3 at widths up to 600px. Its image fills the available width without affecting the route's existing map/sidebar breakpoints.
- Slide navigation controls shrink and move closer to the edges on mobile. Buttons and indicators remain keyboard-focusable with visible focus outlines and accessible labels.
- Gallery padding decreases to `0.75rem` on mobile; the existing two-column mobile grid is preserved.
- Existing story prose widths and mobile padding rules are unchanged.

## 4. Existing functionality preserved

- Route image collection retrieval, canonical ordering, bottom gallery display, and per-collection gallery navigation.
- Fullscreen viewing, lightbox previous/next controls, keyboard navigation, and close behavior.
- Route title, metadata, share controls, map, and other route sections.
- Story excerpt, body, media, related cards, and return destination.

## 5. Remaining limitations

- The slideshow is limited to images already present in the route's public image collections. If none are available, the route retains its original text-only hero.
- Images are cropped to fill the responsive slideshow frame; the fullscreen lightbox continues to display the image using its existing contain behavior.
- No tests or builds were run, as requested.
