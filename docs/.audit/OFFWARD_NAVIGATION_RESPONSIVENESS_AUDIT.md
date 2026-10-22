# Offward Public Navigation Responsiveness Audit

**Scope:** Read-only inspection of public navigation source and the local generated build. No application code, management navigation, tests, builds, or linting were changed or run.

## Summary

The 949px behavior is determinable from the current source. The public `AppShell` renders both a header navigation and a `HomeNavigationRibbon`. CSS shows the header navigation by default, switches it to a hamburger menu only at widths up to 600px, and replaces it with the vertical ribbon only from 1080px upward on devices with hover and a fine pointer. Consequently, at 949px the ribbon is hidden and the header’s horizontal navigation remains visible.

There is no separate horizontal-navbar component: the horizontal layout is the navigation inside `AppShell`’s `.app-header`. It is still a live public layout, not an obsolete component that is merely orphaned. The CSS does not show both navigation surfaces simultaneously at the listed viewport widths, but both are rendered in the public shell and separate primary-navigation landmarks exist in the DOM.

**Confirmed cause:** the 600px hamburger cutoff and the 1080px fine-pointer sidebar cutoff leave the 601–1079px range in the default horizontal-header layout.

## 1. Current navigation architecture

- **Public shell:** [`AppShell.jsx`](../../src/shared/layout/AppShell.jsx) wraps the public routes and renders:
  - a header containing the brand, `.mobile-nav-toggle`, and `#primary-navigation`;
  - `HomeNavigationRibbon` for every non-management route.
- **Desktop sidebar:** [`HomeNavigationRibbon.jsx`](../../src/shared/layout/HomeNavigationRibbon.jsx), styled in [`HomePage.css`](../../src/shared/layout/HomePage.css) as `.home-navigation-ribbon`. The component name says “Ribbon,” but its desktop presentation is a fixed vertical sidebar.
- **Mobile hamburger:** the button in `AppShell.jsx`, styled by the navigation-specific `@media (max-width: 600px)` rules in [`index.css`](../../src/index.css). Its controlled menu is the header’s `#primary-navigation`.
- **Horizontal navigation:** the header’s `#primary-navigation`, styled by `.app-header nav` and `.app-header nav a` in `index.css`. There is no additional horizontal navigation component found.
- **Management:** the management shell routes are not changed by this audit. The public navigation may include a Management link for authorized users; this is distinct from the management page navigation.

Both public navigation surfaces are rendered for non-management routes. CSS normally hides one: the ribbon has `display: none` outside its desktop media query; the header is hidden only inside the sidebar’s fine-pointer desktop media query. Thus the primary issue is not two visible navbars at 949px: it is that the visible one there is the horizontal header nav.

## 2. Responsive breakpoint findings

Relevant conditions:

| Surface | Source condition | Result |
|---|---|---|
| Hamburger state in React | `matchMedia('(max-width: 600px)')` in `AppShell.jsx` | Menu state is considered mobile only through 600px |
| Hamburger presentation in CSS | `@media (max-width: 600px)` in `index.css` | Button is shown and header nav becomes the dropdown |
| Desktop sidebar | `@media (min-width: 1080px) and (hover: hover) and (pointer: fine)` in `HomePage.css` | Sidebar is shown and public header is hidden |
| Ribbon outside desktop condition | `.home-navigation-ribbon { display: none; }` in `HomePage.css` | Ribbon is hidden |
| Header outside desktop/mobile conditions | `.app-header` and global `nav` rules in `index.css` | Horizontal header nav remains shown |
| Tablet header adjustment | `@media (min-width: 601px) and (max-width: 1079px)` in `HomePage.css` | Changes header padding only; does not select the hamburger or sidebar |

The media queries do not overlap at the stated widths, but they leave the intermediate range in the base header style. This is a navigation-mode gap relative to the approved designs, not a CSS specificity conflict. The wide coarse-pointer case is another uncovered mode: the sidebar query does not match, and the header is therefore not hidden.

### Expected versus source-derived actual behavior

“Actual” below means what the checked-in source’s CSS and component conditions select. No live browser/device rendering was performed.

| Viewport | Expected | Source-derived actual |
|---:|---|---|
| 320px | Mobile hamburger | Hamburger mode; header links are collapsed into the menu; ribbon hidden |
| 375px | Mobile hamburger | Hamburger mode; header links are collapsed into the menu; ribbon hidden |
| 768px | Mobile/tablet navigation | **Horizontal header navigation**; hamburger state/styles do not apply; ribbon hidden |
| 949px | Exactly one appropriate approved layout | **Horizontal header navigation**; this is the confirmed issue |
| 1024px | Sidebar or hamburger, whichever fits | **Horizontal header navigation**; sidebar threshold not met |
| 1440px, fine pointer + hover | Desktop collapsible sidebar | Sidebar shown; header hidden |
| 1440px, coarse pointer or no hover | Sidebar or hamburger | **Horizontal header navigation**; sidebar condition does not match, so header remains |

There is no known width gap between the CSS and React hamburger thresholds: both use 600px. Rather, those thresholds are aligned with each other but not with the sidebar’s 1080px threshold.

## 3. Desktop sidebar behavior (static source inspection)

- **Collapsed by default:** confirmed by the 54px ribbon width and 54px `--public-nav-width`; expansion selectors require hover or `:focus-visible`.
- **Expands on hover:** confirmed for fine-pointer desktop by the ribbon width transition from 54px to 206px; keyboard focus can also expand it.
- **Collapses after a navigation click:** the ribbon’s `onClick` sets `isCollapsedAfterClick`, adding `.is-collapsed`; its expansion selectors explicitly exclude that class.
- **Does not immediately reopen while pointer remains inside:** confirmed by those same selectors. `onPointerLeave` clears the collapsed state, allowing the next hover/re-entry to expand it. Blur outside the ribbon also clears it.
- **Push-content behavior:** confirmed in source. Public `main` receives left padding via `--public-nav-width` and transitions between 54px and 206px. The sidebar is fixed, while the page content reserves the matching width.
- **Height:** the ribbon is set to `height: 100dvh` and divides its items into grid rows (8, or 9 if the authorized Management link is present); it has no sidebar scroll container. Short-height rules reduce icons, spacing, and label size at 700px and 480px. At very short heights, rows shrink rather than the sidebar scrolling; minimum touch-target dimensions are not specified.
- **Visual/layout verification:** static CSS supports these behaviors, but animation timing, actual content clearance, focus behavior, and short-height usability require browser verification.

## 4. Mobile hamburger behavior (static source inspection)

- **Open/close:** the button toggles `menuLocation`, and `aria-expanded` follows the derived open state.
- **Link selection:** navigation links clear `menuLocation`; the open state is also tied to the router location key, so navigation changes close it.
- **Other close paths:** Escape and pointer-down outside the header close the menu.
- **Active item:** current links receive `.is-active` and `aria-current="page"`; mobile CSS styles the active link.
- **Narrow screens and scrolling:** menu width is constrained to the header, link text can wrap, and the menu has a viewport-relative maximum height with vertical scrolling and contained overscroll.
- **Touch:** opening uses a button click; the hamburger does not depend on hover. The separate desktop ribbon is only enabled on hover/fine-pointer devices.
- **Duplicates:** the ribbon is `display: none` in this width range, so the source does not indicate two visible public navigations at 320px or 375px. The header menu is hidden until opened.
- **Unverified:** no device/browser interaction was performed; these findings are from component handlers and CSS.

## 5. CSS, component, and deployment investigation

- Navigation-specific responsive rules are concentrated in `HomePage.css` (ribbon visibility, desktop sidebar and expansion) and `index.css` (header, hamburger and dropdown). The component breakpoint is in `AppShell.jsx`.
- `index.css` has a global `nav { display: flex; flex-wrap: wrap; ... }` rule. The sidebar and mobile rules override relevant layout properties in their respective modes. No source rule was found that makes the ribbon visible between 601px and 1079px.
- The header navigation has its own horizontal link styling and is active by default, rather than being a stale selector unused by the component.
- No source evidence points to an unrelated global CSS specificity override as the cause. The matching `@media (max-width: 600px)` CSS/React conditions and the separate `min-width: 1080px` sidebar condition directly explain the breakpoint behavior.
- The local `dist` output is dated 20 October 2026, while the inspected source CSS is dated 22 October 2026. This means the local generated build is not proof of the latest source state or of what production serves; it does not by itself establish that stale assets caused the report.
- The app registers a service worker in `src/main.jsx`. The checked-in worker caches successful script/style/image/font responses cache-first by request URL and does not handle document navigations. The worker and local build do not establish whether a production CDN, browser, or deployed release is serving old HTML or assets.
- **Production stale-asset cause:** suspected only; cannot be confirmed from repository source. The source breakpoints alone are sufficient to explain the 949px symptom if production contains this version.

## 6. Smallest safe fix (recommendation only)

Make public navigation selection mutually exclusive and consistent between CSS and React:

1. Keep the existing 1080px desktop-sidebar threshold if that is the desired desktop cutoff.
2. Use the hamburger for the remaining widths through 1079px instead of showing the header’s horizontal links.
3. Explicitly select an approved layout for coarse-pointer/no-hover devices at widths of 1080px and above (typically the hamburger), rather than allowing the horizontal header as a fallback.
4. Keep the desktop sidebar limited to devices on which hover is available, and preserve its current push-content and click-to-collapse behavior.
5. Use the same mode condition in the `AppShell` state and CSS so the toggle, `inert` state, and visible menu cannot disagree.

This is a breakpoint/mode correction, not a navigation redesign. Do not modify management navigation. Before implementation, confirm the 1080px cutoff and preferred coarse-pointer behavior; they are recommendations inferred from the current CSS and the approved layouts, not separately specified product thresholds.

### Files that would need modification

- [`src/shared/layout/AppShell.jsx`](../../src/shared/layout/AppShell.jsx) — align mobile/menu state and event handling with the selected public navigation mode.
- [`src/index.css`](../../src/index.css) — apply the hamburger presentation at the same intermediate/coarse-pointer conditions and prevent horizontal header links from appearing as a fallback.
- [`src/shared/layout/HomePage.css`](../../src/shared/layout/HomePage.css) — keep the sidebar visible only for the selected desktop mode and retain the existing push-content and short-height rules.

No management-navigation file is needed for the proposed public-only correction.

## 7. Browser and production verification still required

After approval and implementation, verify in a browser at 320, 375, 600, 601, 768, 949, 1024, 1079, 1080, and 1440 CSS pixels, including both fine-pointer/hover and coarse-pointer/no-hover conditions. Also verify short desktop heights (including below 480px), a landscape tablet, and actual touch interaction.

Confirm computed visibility and keyboard accessibility, the absence of a horizontal header nav at every tested mode, sidebar push-content behavior, collapse-after-click while the pointer remains over the sidebar, re-expansion after leave/re-enter, menu closure on link selection/Escape/outside click, active-link indication, and no overflow or duplicate visible nav.

For a production report, inspect the deployed HTML and referenced hashed CSS/JS responses, check the browser’s active service worker and cache, and compare the deployed release with the source revision. Repository inspection alone cannot establish which assets a user’s browser or production edge served.
