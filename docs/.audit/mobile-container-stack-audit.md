# Mobile Container Stack Audit

## 1. Component and Container

- Component: `src/features/home/LatestContentRail.jsx`, `LatestContentRail`.
- Placement: `src/pages/HomePage.jsx` renders it immediately after `HomeHero`.
- Outer section: `.latest-content-rail`.
- Exact layout container: `<ul className="latest-content-rail-track">` in the loaded state; `<div className="latest-content-rail-track">` in the loading state.
- Loaded children: `<li className="latest-rail-item">`, containing the latest video, story, and route cards when available.
- Loading children: three `.latest-rail-skeleton` elements. No section is rendered when loading finishes without items.

## 2. Relevant CSS

`src/features/home/LatestContentRail.css` is imported directly by the component. A search of source CSS found no rail selector overrides in other stylesheets.

## 3. Current Selectors and Rules

```css
.latest-content-rail-track {
  display: flex;
  gap: 1.25rem;
  list-style: none;
  margin: 0;
  padding: 0 0 0.5rem;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
  scrollbar-color: #4a4c41 transparent;
}

.latest-rail-item {
  flex: 0 0 auto;
  width: min(340px, 82vw);
  scroll-snap-align: start;
}
```

`.latest-rail-skeleton` also uses `flex: 0 0 auto` and `width: min(340px, 82vw)`, with a fixed `260px` height. `.latest-rail-card` already uses `flex-direction: column`, but that controls content inside each card, not the arrangement of sibling cards.

## 4. Why Mobile Remains Horizontal

The track declares `display: flex` without overriding the default `flex-direction: row` or `flex-wrap: nowrap`. Its children remain on one horizontal line, and their `flex: 0 0 auto` prevents shrinking. `overflow-x: auto` exposes excess width through horizontal scrolling; horizontal snapping reinforces that rail behavior but does not determine the flex direction.

There is no mobile rule changing the track's direction. Changing the outer section or an individual card would not fix the sibling layout.

## 5. Existing Breakpoint Behavior

The rail has one responsive breakpoint:

```css
@media (max-width: 640px) {
  .latest-content-rail {
    padding: 2rem 1.25rem 3rem;
  }

  .latest-rail-item,
  .latest-rail-skeleton {
    width: 86vw;
  }
}
```

- At or below `640px`: padding and child widths change, but the track remains a horizontal, non-wrapping flex row.
- Above `640px`: base padding, child widths, and the horizontal rail apply.
- The nearby home hero switches its actions to a column at `600px` in `src/index.css`. That rule does not target the latest rail. The global stylesheet also contains a `640px` breakpoint for unrelated content, and broader breakpoints for other layouts; none changes this rail.
- Reuse the rail's own `640px` boundary rather than introducing a new tablet-wide breakpoint. This is a viewport-width boundary, not device detection.

## 6. Minimal Recommended Fix

Add one track rule inside the existing `max-width: 640px` media query. No JSX changes or layout refactor are needed. It applies to both loaded cards and loading placeholders.

## 7. Exact Rule to Add

In `src/features/home/LatestContentRail.css`, inside the existing mobile media query:

```css
.latest-content-rail-track {
  flex-direction: column;
}
```

Keep all existing declarations, including gap, padding, card dimensions, typography, colors, and content. The horizontal overflow and snapping declarations do not force a row and need not change to achieve stacking.

Width caveat: the existing `86vw` child width is relative to the viewport, not the padded track. At unusually narrow widths it can exceed the available content width. With a `16px` root font and the existing `2.5rem` total horizontal section padding, this occurs below approximately `286px`. If supporting such widths is required, add `max-width: 100%` to the existing mobile `.latest-rail-item, .latest-rail-skeleton` rule. This guard is not required for stacking and is not part of the minimal recommendation.

## 8. Desktop and Tablet Preservation

Confirmed from the CSS cascade: the proposed direction override only applies at viewport widths at or below `640px`. Above `640px`, the existing row direction, non-wrapping behavior, horizontal scrolling, child widths, spacing, and card styling remain unchanged. Tablet viewports at or below `640px` would stack under this existing width-based boundary as well.

## Scope and Verification

Audit based only on relevant JSX and CSS inspection. No tests, builds, or browser checks were run. No application files were modified, and the stacking fix was not implemented. This report is the sole file created, treating the explicitly requested report as the exception to the no-file-modification requirement.