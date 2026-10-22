# Offward Frontend Traffic Analytics Architecture Audit

**Status:** Read-only frontend audit; no application implementation  
**Scope:** First-party traffic measurement without analytics cookies, visitor identifiers, browser fingerprinting, GPS collection, or third-party analytics.

## 1. Existing reusable infrastructure

- The application uses React 19, Vite, and React Router 7. The browser router and public route table are in [`src/app/router.jsx`](../../src/app/router.jsx); [`src/app/App.jsx`](../../src/app/App.jsx) mounts the `RouterProvider`.
- [`src/shared/layout/AppShell.jsx`](../../src/shared/layout/AppShell.jsx) is the shared parent for public and management URLs. Its `useLocation()` already observes location changes. It renders the public navigation and outlet, and identifies management paths under `/manage`.
- The public routes include home, explore, food list/detail, countries list/detail, place and route detail, route waypoint/segment detail, stories list/detail, video, tour, event, about, and contact. A wildcard renders `NotFoundPage`. Management is nested at `/manage/*` in the same router and is guarded by `ManagementGuard`.
- Public detail pages load content through service modules, including [`src/services/routesApi.js`](../../src/services/routesApi.js), [`src/services/placesApi.js`](../../src/services/placesApi.js), [`src/services/storiesApi.js`](../../src/services/storiesApi.js), and [`src/services/foodsApi.js`](../../src/services/foodsApi.js). These use the shared Axios instance in [`src/services/apiClient.js`](../../src/services/apiClient.js). The detail services return records with the existing `id` and slug fields; detail components already distinguish success, not-found, and error/loading states.
- There is no existing traffic analytics or statistics service/page found. Existing uses of “track” refer to visitor map/location tracking, not analytics.
- The shared Axios client has `withCredentials: true` and adds a CSRF token to unsafe requests. It is therefore not a suitable default for anonymous analytics delivery: using it could attach application cookies and would couple analytics to the current CSRF/authentication flow.
- Hosting configuration includes a Netlify `social-meta` Edge Function in [`netlify.toml`](../../netlify.toml). The function prepares public SEO metadata and reads a content’s editorial `country`; it is not currently a visitor-country or analytics integration. The service worker in [`public/service-worker.js`](../../public/service-worker.js) caches same-origin static assets and deliberately excludes API, auth, and management requests.
- Management pages use `ManagementGuard` and `ManageLayout`, with dashboard cards in [`src/pages/manage/ManageDashboardPage.jsx`](../../src/pages/manage/ManageDashboardPage.jsx). Existing dashboard styles are in `src/index.css`. Adding a Statistics route and dashboard card can follow those patterns without redesigning navigation.
- Existing relationship links are rendered in components such as `RelatedStories`, `RelatedFood`, `FoodRelatedContent`, `RoutePlacesAlongRoute`, and `CompactRelatedEntityCard`. Route and Place map controls and their action handlers are in [`src/pages/RoutePage.jsx`](../../src/pages/RoutePage.jsx) and [`src/pages/PlacePage.jsx`](../../src/pages/PlacePage.jsx).

## 2. Proposed tracking lifecycle

Keep the model deliberately small and distinguish three kinds of records:

1. **Visit:** a qualifying browser document activation, detected once for that activation. It is not a unique person, a session, or a count of React Router transitions.
2. **Page view:** an eligible public page becoming visible through initial load or a genuine route change. Page views may include content metadata.
3. **Interaction:** a limited set of deliberate action activations, such as requesting directions or starting Track.

Use one small first-party sender/validation module under `src/services/` (or an equivalent existing service boundary if one is preferred during implementation). Keep navigation classification separate from page/action event construction. Do not intercept ordinary API requests or collect arbitrary clicks.

Recommended lifecycle integration:

- Perform initial document-navigation classification once at application startup, outside a React component effect, so development Strict Mode effect replay cannot create another visit.
- Listen for `pageshow` and separately account for a `PageTransitionEvent.persisted === true` back-forward-cache restoration. The restored document does not rerun application startup code.
- Mount one public page-view observer beneath `AppShell`, where it can use `useLocation()`. It should observe only the pathname and use an in-memory last-emitted navigation key/ref to avoid ordinary re-render and Strict Mode duplicates. Exclude `/manage` and descendants.
- The observer should be driven by router location/page readiness, never by API request count. For content details, reuse the page’s existing load result: emit only after a valid detail has resolved. This prevents malformed slugs, not-found responses, and detail-load errors from becoming content page views. Keep the one emission coordinated through the common observer/sender so the route change and detail-success signal cannot double count.
- Count public static/list routes when the router has matched a real public route, not when the wildcard NotFound route is displayed. A dynamic detail route should be eligible only once the matching content exists.
- Page/action delivery is best effort and must not await or block route transitions, location permissions, map operations, or visible UI actions.

## 3. Browser navigation detection

`performance.getEntriesByType("navigation")[0]?.type` is a useful document-level classification signal:

| Navigation Timing `type` | Proposed visit treatment | Meaning and caveat |
|---|---|---|
| `navigate` | Count one visit | A newly loaded document through a normal navigation, such as a link or address-bar navigation. It does not identify a new person. |
| `back_forward` | Count one visit for the new document activation | A full-document history traversal is a new browser activation. It is not the same as a React Router `POP` within the still-loaded SPA. |
| `reload` | Do not count a visit | Explicit refresh is excluded, including repeated reloads. It still produces an eligible initial page view. |
| Missing entry, unsupported API, or unrecognized type | Do not infer a visit | Fail closed for visit counting; do not substitute storage, referrer, or an identifier. This can undercount browsers/environments without a usable entry. |

Back-forward cache (BFCache) is an important exception to “startup once”: restoring a cached document does not rerun the application module or create a new Navigation Timing entry for the activation. A `pageshow` listener can identify a restoration with `event.persisted === true`; count that restoration as a new visit and a page view for the currently shown eligible public route. Initial `pageshow` has `persisted === false`, so it should not duplicate the startup classification. Do not count ordinary React Router back/forward transitions as visits; they are page views only.

This is a pragmatic browser-activation definition, not a reliable session or person definition. Browser/tab session restoration, prerendering/history behavior, browser differences, privacy tools, and missing timing data can cause under- or over-counts. No client-only mechanism without persistent identifiers can reliably determine whether a navigation is the same person, a new session, or a restored tab. Do not describe visit totals as unique visitors.

## 4. Page-view counting rules

- Count the initial eligible public route on a qualifying document load, including `reload`. Exclude management routes.
- Count every pathname transition to another valid public route, including browser back/forward transitions handled by React Router.
- Treat the pathname as the page identity. Query-string and hash-only changes do not create page views. In particular, `/explore?view=places` and `/explore?view=routes` remain one `/explore` page identity; filters and tab-like URL state should not inflate counts.
- Use the stable public `pathname`, without query parameters, hashes, referrers, or full URLs. Exclude unknown wildcard routes, management pages, and invalid/unavailable detail resources. A transient detail API failure should not produce a successful content view.
- Do not count component renders, API calls, content relationship lookups, map state changes, lightbox changes, retries, or page metadata updates.
- Suppress repeated observer setup/emission for the same router transition with an in-memory guard. Do not use localStorage, sessionStorage, cookies, or a persistent event ledger for deduplication.
- BFCache restoration is a distinct visible page activation even though the React tree may not remount; handle it as described above. A full-document back/forward load is covered by normal startup classification and should not also be counted by the restoration path.

## 5. Content and action event locations

### Content views

For Route, Place, Story, and Food detail pages, attach metadata to the single page-view event after the existing page’s primary detail fetch succeeds:

| Page | Existing detail resolution | Content metadata |
|---|---|---|
| Route | `RoutePage` / `getPublicRouteBySlug` | content type `route`, record `id`, slug, canonical pathname |
| Place | `PlacePage` / `getPublicPlaceBySlug` | content type `place`, record `id`, slug, canonical pathname |
| Story | `StoryPage` / `getPublicStoryBySlug` | content type `story`, record `id`, slug, canonical pathname |
| Food | `FoodPage` / `getPublicFoodBySlug` | content type `food`, record `id`, slug, canonical pathname |

Use the existing stable record ID (UUID where supplied) as the content identifier and retain the slug/path for human-readable reporting. Do not change response shapes or add content fields. The canonical pathname should be the current public pathname only, excluding query/hash. If an ID is missing or not usable, omit it rather than inventing one; keep the slug/path association. The page-view event itself should carry content context, not be followed by a second “content view” that duplicates that same opening.

The same valid-route policy should apply to other public detail routes if they are included in page-view reporting. Waypoint and Segment URLs are nested under a Route and currently resolve through RoutePage; if included, use the resolved parent Route context and keep the canonical nested pathname. Whether those child resources are “content” for popular-content reports should be decided in the backend contract.

### Deliberate interactions

- **Directions to Route start:** instrument the accepted start in `RoutePage`’s `startDirections` handler, after checking that a canonical start waypoint exists and before requesting/starting location. Do not instrument stop, retry, mode selection, map dragging, or every directions API request.
- **Directions to Place:** instrument the accepted start in `PlacePage`’s `startDirections` handler, after its `directionsAvailable` guard and before location acquisition. Do not include the origin, coordinates, or directions payload.
- **Track:** instrument `startFollowing` in the Route and Place pages only when the visitor starts continuous location tracking. Do not count stop toggles, recenter, GPS updates, or location samples.
- **Related-content navigation:** if the product wants this metric, instrument navigation activation in existing link/card components, including `RelatedStories`, `RelatedFood`/`FoodCard`, `FoodRelatedContent`, `RoutePlacesAlongRoute`, and related Story cards. Record the linked content type and ID/slug when available. Avoid global click capture; unrelated navigation links, image controls, and management links should not become interaction events.

**Recommended semantics:** count an accepted user activation/request, not eventual success. For example, a Directions or Track request should count after the handler passes its guard and starts the feature, even if the browser later denies geolocation or the routing request fails. Label the metrics as activations/requests rather than successful directions or completed tracking. This measures user intent without recording location or making analytics depend on permission/outcome callbacks. For related links, count an actual link activation, not a render or an impression.

## 6. Management Statistics UI proposal

Add a concise `Statistics` dashboard card linking to `/manage/statistics`, then add a Statistics route inside the existing `ManagementGuard` and `ManageLayout` in `src/app/manageRouter.jsx`. Implement the view using the current `management-page`, page-header, and card/table styles from `src/index.css`; do not add a new management navigation system.

Suggested single-page content:

- Four date filters: **Today**, **7 days**, **30 days**, **All time**.
- Two prominent summary values: **Visits** and **Page views**.
- A compact visits-over-time chart or accessible date/value table.
- A compact popular-content list showing content type, title/slug, and page-view count.
- A short action summary for Route directions, Place directions, and Track activations.
- **Top countries** only when the backend can supply a trustworthy, privacy-reviewed country aggregate; otherwise omit the section rather than inferring country from the content a person viewed.

Keep definitions and date boundaries explicit (including the reporting timezone). Use no chart dependency unless a later approved design demonstrates that existing markup/styles are insufficient.

## 7. Backend API dependencies

The existing frontend API service modules cover content/auth functions; no analytics event-ingestion or aggregate-report API was found. Existing API planning documents do not define an analytics contract. Do not implement or assume endpoint paths, request fields, response fields, authentication/CSRF behavior, or aggregation semantics until the backend audit/contract is reviewed.

The backend contract will need to define, at minimum:

- Separate visit and page-view event types, and a small allowlist of interaction event types.
- Accepted optional fields for event type, content type/ID/slug, canonical pathname, and a server-assigned timestamp. The browser should not supply an authoritative timestamp or arbitrary metadata.
- Validation for event names, path length/format, content identifiers, payload size, request rate, and public endpoint abuse.
- Anonymous ingestion behavior and a deliberate policy for authentication, CSRF, CORS/origin, and cookies. The endpoint should not require frontend analytics cookies or a visitor identifier.
- Server-side aggregate/report semantics for the four date filters, visits versus page views, time zone, popular content, interaction counts, and (if approved) country aggregation.
- Whether event retention, deletion, data minimization, bot filtering, and operational log/IP handling are required.
- Duplicate-delivery semantics. Do not retry ambiguous event POSTs unless the backend defines an idempotency mechanism; otherwise retries can inflate counts.

### Frontend delivery recommendation

Use a small dedicated sender with strict event-shape validation and no dependency on the auth-oriented `apiClient`. A `fetch` request with `credentials: 'omit'` and `keepalive: true` is a straightforward non-blocking path for normal transitions/tab close, subject to API origin/CORS support. `navigator.sendBeacon` can be considered for unload delivery, but it does not allow the caller to set arbitrary headers or explicitly choose fetch credentials; use it only if the endpoint’s origin and credential behavior have been verified against the no-cookie policy. Neither approach guarantees delivery.

Prefer a single best-effort send over automatic retries until backend idempotency is specified. If a later contract supports bounded retry safely, retry only a narrowly defined transient failure with a small maximum and no blocking UI. A failed analytics request should be dropped quietly from the visitor’s perspective; it must not affect route changes, display an error, delay directions, or interrupt another action. Never send GPS coordinates, full query strings, request headers, referrers, raw IP values, or arbitrary browser data in the event payload.

## 8. Privacy considerations

- The proposed frontend creates no analytics cookies, visitor IDs, persistent browser storage, browser fingerprint, or user profile. Avoid even short-lived persistent identifiers; use only in-memory duplicate suppression.
- Do not request geolocation for analytics. Route/Place features already request location for visitor-facing map functionality; analytics must not observe, forward, or store their coordinates or samples.
- Country flags and country names currently displayed on content describe the content’s editorial country. They are not the visitor’s country and must not be used as a visitor-country signal.
- No current frontend or Netlify integration exposes a trusted visitor-country value to the application. The existing Edge Function is for SEO metadata and content country, not visitor geolocation. If country reporting is approved, derive a coarse country aggregate on the trusted backend/hosting edge from an explicitly supported provider signal, and discard raw network data as early as possible. Do not send GPS or raw IP to the frontend analytics service.
- A first-party endpoint and lack of cookies do not automatically make the data legally anonymous or exempt from privacy rules. Server/CDN logs may observe IP addresses as part of normal transport. Applicable privacy/ePrivacy, GDPR, retention, disclosure, and consent requirements depend on deployment and jurisdiction; obtain a legal/privacy review of the backend processing and site notice before launch.
- Browser privacy controls, content blockers, offline/network conditions, cross-origin restrictions, and disabled JavaScript can suppress delivery. Counts are approximate and should be labelled accordingly. Respect any applicable privacy signals/policy agreed for the product; do not implement fingerprinting or workarounds.

## 9. Files likely to change

No application code was changed as part of this audit. If implementation is approved, the likely frontend touch points are:

- [`src/main.jsx`](../../src/main.jsx) — initialize the one-time document visit classification and BFCache `pageshow` listener outside React effects.
- [`src/shared/layout/AppShell.jsx`](../../src/shared/layout/AppShell.jsx) — mount the single public route/page-view observer and exclude management paths.
- [`src/services/analyticsApi.js`](../../src/services/analyticsApi.js) — new minimal event validator/sender, only after the backend contract exists. This should not reuse cookie-bearing `apiClient` behavior by default.
- [`src/pages/RoutePage.jsx`](../../src/pages/RoutePage.jsx), [`src/pages/PlacePage.jsx`](../../src/pages/PlacePage.jsx), [`src/pages/StoryPage.jsx`](../../src/pages/StoryPage.jsx), and [`src/pages/FoodPage.jsx`](../../src/pages/FoodPage.jsx) — reuse detail-success state for content attribution and instrument the accepted Route/Place action handlers.
- Existing relationship link/card components listed in Section 5 — only if related-content activation reporting is approved.
- [`src/app/manageRouter.jsx`](../../src/app/manageRouter.jsx), [`src/pages/manage/ManageDashboardPage.jsx`](../../src/pages/manage/ManageDashboardPage.jsx), and likely one new `src/pages/manage/ManageStatisticsPage.jsx` — protected report route, dashboard card, and the compact view.
- `src/index.css` — small additions only if the existing management presentation needs them.

No backend change is included in this frontend scope, but ingestion and aggregate-report endpoints/contracts are prerequisites for working statistics.

## 10. Smallest implementation plan

1. Review and agree the backend analytics event/report contract and privacy/logging policy before selecting an endpoint or sending payloads.
2. Add one small analytics service that validates the approved allowlist and sends without auth cookies, persistent identifiers, or blocking behavior.
3. Add document visit detection at startup for `navigate`/`back_forward`, exclude `reload`, and handle BFCache restoration through `pageshow.persisted`.
4. Add one pathname-based public page-view observer under `AppShell`, with in-memory Strict Mode deduplication, query/hash exclusion, management/wildcard exclusion, and a success-ready signal for dynamic content routes.
5. Add content attribution to the existing page-view for successful Route, Place, Story, and Food detail resolutions. Do not add a duplicate content-view event.
6. Instrument only the accepted Directions and Track start handlers; add the related-link events only if that reporting is explicitly required.
7. Add the guarded Statistics page and one dashboard card, consuming the agreed aggregate API and existing management styles.
8. Validate the cases in Section 11 against a development/mock collector and the backend contract before enabling production reporting.

## 11. Limitations and verification requirements

No implementation, tests, build, or lint were run; this deliverable is an architecture audit only.

Before production, verify event counts with a controlled collector/backend test, not by assuming that a visible page or browser console log proves server receipt:

| Scenario | Expected result |
|---|---|
| Fresh direct/document navigation to a valid public page | One visit and one page view |
| Explicit refresh on a valid public page | No additional visit; one new page view |
| React Router navigation to a different valid pathname | One page view; no visit |
| Query/hash/filter-only change on the same pathname | No additional page view |
| Browser Back/Forward within the SPA to another pathname | One page view per valid pathname transition; no visit |
| Full-document back/forward navigation | One visit for the new document activation and one page view |
| BFCache restoration | One visit and one page view for the restored eligible public route; no duplicate initial-load event |
| Development Strict Mode and ordinary rerenders | No duplicate visit or page-view events |
| Route/Place/Story/Food detail succeeds | One page view with matching type, existing ID/slug, and pathname |
| Detail returns 404, wildcard path, or primary detail load fails | No content page view |
| Directions/Track accepted start, then permission or routing fails | One activation/request event, no coordinates; no event for stopping |
| Network failure, offline close, or blocked sender | Navigation/action remains unaffected; delivery may be lost |
| Management URL or redirect/login route | No public visit/page-view/action reporting |

For visit exclusion, inspect the browser’s Navigation Timing entry before and after a manual refresh and confirm that only the `reload` classification is omitted; separately test `navigate`, full-document `back_forward`, and BFCache `pageshow.persisted`. Repeat in the supported browser set because restored-tab and BFCache behavior differs. Verify that sender requests omit cookies/credentials, never include coordinates or IP-derived client data, do not duplicate on Strict Mode replay, and cannot delay the visitor-facing action. Confirm server logs, retention, timezone, country derivation, and duplicate-delivery behavior with the backend owner.
