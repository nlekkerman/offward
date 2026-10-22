# Offward Public 404 and SEO Architecture Audit

**Scope:** Read-only inspection of the React/Vite frontend and Netlify configuration in this repository. No application, backend, deployment, or asset changes were made. Production behavior that depends on Netlify environment variables, domain settings, or the separately deployed Django API is identified as requiring verification.

## Executive summary

Offward already has several useful SEO foundations: React Router has a public catch-all route, content detail pages distinguish missing content from network errors, `PageMetadata` updates browser metadata from content fields, canonical URLs use `https://offward.eu`, and a Netlify Edge Function injects content-specific head metadata for Route, Place, Story, and Food detail URLs before JavaScript runs.

The main confirmed launch gaps are:

1. The public catch-all renders a generic placeholder, and Netlify's `/* /index.html 200` rewrite means unknown public URLs are served as HTTP 200. API 404s become client-side missing-content states; they do not change the document response status.
2. The initial HTML is an empty React root. The Edge Function changes metadata only, not body content. Search engines that render JavaScript may eventually see content, but the architecture does not deliver meaningful detail-page HTML in the initial response.
3. Dynamic client metadata is implemented only for Route, Place, Story, and Food detail pages. Most listing, static, Country, and other detail pages retain the generic home metadata, including the home canonical URL, in the initial response and have no page-specific `PageMetadata`.
4. No `robots.txt` or sitemap file/generator was found in the inspected repository.
5. The temporary Coming Soon gate can replace all public pages for visitors who cannot manage Offward. Its actual production effect depends on `VITE_PUBLIC_LAUNCH_ENABLED` and the access API response and must be checked before launch.

These findings do not warrant a framework migration. Preserve React/Vite and Netlify; prioritize real HTTP 404 behavior, page-specific metadata across public routes, and a small, maintainable pre-rendering strategy for indexable content.

## 1. Public 404 handling

### What is implemented

- `src/app/router.jsx` defines a public `path: '*'` route which renders `NotFoundPage`.
- `src/pages/NotFoundPage.jsx` currently renders `RoutePlaceholder` with the title “Not Found”. `RoutePlaceholder` is a generic eyebrow/title layout, not a dedicated branded error experience.
- Route, Story, and Country detail loaders treat a missing public API record (`null`) as not found. Place also records a not-found state. Food has its own missing-content message. A thrown network/server error is generally rendered separately from the missing state.
- The public detail API clients convert an HTTP 404 to `null` for Routes, Places, Stories, Food, and Countries. This usefully distinguishes a not-found API response from other API failures in the UI.
- The management router has a separate catch-all redirect to `/manage`; management authorization is handled separately.

### Confirmed gaps and behavior

- `public/_redirects` contains `/* /index.html 200`. An unknown public path therefore receives the SPA shell with HTTP 200 when that rule matches. React can render a not-found-looking page after JavaScript, but this is a soft 404, not an HTTP 404.
- Invalid or unpublished slugs are not distinguishable in the frontend from deleted records: the public API's 404 is converted to `null`. This is suitable for a not-found UX, but whether the API reliably excludes drafts/inactive records is a backend behavior that this frontend-only audit cannot confirm.
- The Edge Function first calls `context.next()` and only decorates successful HTML responses. If the SPA rewrite returned 200 for an unknown content slug and the corresponding API detail lookup fails, the function returns that original SPA response unchanged; it does not set an HTTP 404.
- Unknown paths, invalid Route/Place/Story/Food/Country slugs, and missing nested route waypoint/segment records can consequently appear as client-side 404s over HTTP 200.
- When the public launch gate is active, visitors who cannot manage Offward see Coming Soon instead of the public route tree. That may include unknown URLs. The initial document does not contain an explicit robots policy or `noindex`; verify that the live launch flag and access behavior do not expose Coming Soon as indexable content.

### Recommendation

Use a dedicated Offward 404 page within the existing `AppShell`: clear “page not found” copy, a link home, and useful links to Explore, Routes, Places, Stories, Food, and Countries. Reuse the existing Offward logo/navigation and current typography, buttons, and page styles; do not add artwork. Give it a single descriptive heading and accessible links.

For real HTTP status codes, use a deliberate Netlify routing strategy rather than relying on the client catch-all alone. Unknown paths should receive a 404 document/status; known content routes that resolve to missing or unpublished API records should also return a not-found response. Keep transient API/network failures distinct from a 404. Confirm how Netlify's SPA rewrite and Edge Function ordering interact before changing rules. Avoid returning 404 for valid client routes before they have been resolved.

## 2. Page titles and meta descriptions

### Existing implementation

- `index.html` has a default title, description, canonical URL, Open Graph fields, and Twitter Card fields.
- `src/shared/components/PageMetadata.jsx` changes `document.title`, description, canonical, Open Graph, and Twitter metadata in a React `useEffect`. It resets these values to the home defaults on unmount.
- Route, Place, Story, and Food detail components use this helper. They derive titles from actual content title/name fields and descriptions from Route/Place/Food `summary` or Story `excerpt`; when a summary is absent, the frontend falls back to the content title and available country label.
- The Edge Function independently injects title, description, canonical, Open Graph, and Twitter metadata for those same four detail types using their corresponding public API fields. It uses existing content image fields where available and falls back to the site's favicon.

### Page coverage

| Page type | Current page-specific metadata | Audit result |
|---|---|---|
| Home | Default title and site-level description in `index.html` | Reasonable site-level metadata; the Home component does not set unique metadata. |
| Routes and Places lists (`/explore`) | None | Generic home title/description/canonical; query-filtered views also have no page-specific metadata. |
| Stories list | None | Generic home metadata. |
| Food list | None | Generic home metadata. |
| Route detail | Yes in `PageMetadata` and Edge Function | Uses actual title and summary; edge metadata is available before JS when its API lookup succeeds. |
| Place detail | Yes in `PageMetadata` and Edge Function | Uses actual name and summary; edge metadata is available before JS when its API lookup succeeds. |
| Story detail | Yes in `PageMetadata` and Edge Function | Uses actual title and excerpt; marked `article` for Open Graph. |
| Food detail | Yes in `PageMetadata` and Edge Function | Uses actual title and summary. |
| Countries list/detail | None | Generic home metadata; Country detail is not covered by the Edge Function. |
| About and Contact | None | Generic home metadata despite having page-specific visible content. |
| Event, Tour, Video, Waypoint, Segment, and other public routes | None found | No page-specific metadata helper or edge mapping found. |
| Unknown/missing-content pages | None | Generic home metadata and home canonical remain in the document. |

On the four supported content-detail routes, the page-level helper uses content fields rather than invented text. The edge function uses the title field and summary/excerpt, falling back to title plus country when the description field is blank. The browser helper and edge function both construct canonical detail URLs. For the other pages, a shared home canonical can incorrectly signal that distinct pages are duplicates of the home page.

### Recommendation

Extend page metadata to every intended public, indexable route. Use only actual page/content fields; keep a carefully written site-level description for the Home page and derive content descriptions from available summaries/excerpts. Do not generate misleading fallback prose. Set each canonical URL to its selected public URL and use consistent title formatting. Missing-content and error states should not retain a successful content title/canonical.

## 3. Search engine indexability

### Confirmed rendering architecture

- The app is a React/Vite client-rendered application. `src/main.jsx` calls `createRoot(...).render(...)`; no SSR or prerendering configuration was found in `vite.config.js`.
- The Vite `index.html` contains a `div#root` and JavaScript module entry but no rendered page body. The SPA rewrite serves this same document for application paths.
- React Router loads public content in client effects through the frontend API clients.
- The Netlify Edge Function adds head metadata for four detail URL patterns, but it does not render the corresponding React body content.

### Indexing risk

Search engines capable of rendering JavaScript may fetch and execute the app and later index the resulting content. This is not equivalent to a meaningful initial HTML response: the page body begins empty, and content depends on JavaScript, network access to Django, API response timing, and client-side rendering. Crawlers that do not execute JavaScript, social crawlers that primarily read the original response, and rendering delays can see an empty body. For detail pages, the existing edge layer improves title/description/social metadata but does not resolve that body-content limitation.

This is a confirmed architectural limitation, not proof that Google currently fails to index a given URL. Live rendered/indexed state requires production verification.

### Practical options without a framework migration

1. **Recommended: add a focused prerender/static-generation step to the existing Netlify build.** Fetch all eligible public records from Django, follow pagination, and produce route-specific HTML containing actual content and metadata for canonical URLs. Ensure the client startup supports the generated markup (including a compatible hydration strategy) and that the result is verified from the deployed raw HTML, not just in a browser.
2. **Build-time metadata-only output:** this is a smaller enhancement to social previews but is insufficient on its own for search indexability because the initial body remains empty. The existing edge metadata function already covers much of this narrow use case.
3. **Request-time Edge/SSR rendering:** can keep content fresh without a full static inventory but has more operational and rendering complexity. Consider only if content volume or publication frequency makes build-time generation unsuitable.

Trigger a Netlify build when content is published or updated if build-time generation is selected. A full framework migration is not necessary to address this.

## 4. Sitemap.xml

### Current state

No `sitemap.xml`, sitemap generator, or sitemap-related configuration was found. Existing frontend API clients support paginated public endpoints and expose `next` page data, which can be followed by a generator.

### Recommended sitemap contents and generation

Include canonical URLs only for:

- Active/public Routes.
- Public Places.
- Published Stories.
- Public Food records.
- Public Countries that are intended to be discoverable.
- Relevant stable static pages such as Home, Explore, About, Contact, and listing pages.

Exclude management/auth pages, query-string/filter/map states, drafts, inactive or unpublished content, private URLs, invalid slugs, and records that the public API does not expose. Do not list nested/private map or editing URLs unless they are independently intended public landing pages.

The backend is the authoritative source for publication and visibility. Prefer a Django sitemap endpoint/view that selects canonical, publicly accessible records, applies the same visibility rules as public detail APIs, and exposes update timestamps where available. The frontend or a Netlify build step can consume it. If generation stays in the Netlify build, follow every paginated result (using `next` or the documented page/page-size fields); do not assume the first response contains the full catalog. On publish, update, unpublish, or deletion, trigger a rebuild or refresh the backend sitemap so it does not remain stale. A scheduled refresh is a fallback with a known freshness delay, not a replacement for publication-triggered updates.

## 5. Robots.txt and Coming Soon gate

### Current state

No `robots.txt` was found. There is no inspected robots rule for sitemap discovery or management paths, and the initial HTML has no `noindex` directive.

### Recommendation

Add a root-served `robots.txt` that permits intended public crawling, identifies the canonical sitemap URL, and discourages crawling of management paths such as `/manage/`. Robots rules only guide compliant crawlers; they are not access control, and they do not protect private content. Continue enforcing management authorization at the application/API layer.

If the Coming Soon gate is intentionally active on production, make an explicit launch-indexing decision. If the site is not ready to appear in search, serve a temporary `noindex` directive to crawlers while leaving the pages fetchable so the directive can be read; remove it at launch. Do not rely on robots disallow to hide a launch page or private data. Verify the live value of `VITE_PUBLIC_LAUNCH_ENABLED`, the `getOffwardAccess()` response for anonymous visitors, and the actual response/crawl behavior before launch.

## 6. Social sharing metadata

### What already works

- The base document includes Open Graph and Twitter Card tags.
- `PageMetadata` updates those tags in the browser for Route, Place, Story, and Food detail pages and selects content images using existing image fields/collections.
- Netlify applies `social-meta` to `/routes/*`, `/places/*`, `/stories/*`, and `/food/*`. For a matching single-segment detail URL, the edge function queries the public Django detail endpoint and inserts the content title, description, canonical URL, image, and type into the HTML head before returning it. It uses `article` for Stories and `website` for other mapped types.
- This edge metadata response is not limited to social user agents, so supported detail routes can also expose metadata to non-JavaScript consumers when the API lookup succeeds.

### Limitations

- Edge metadata does not include body content and only covers the four mapped types. Countries, listing pages, static pages, Event/Tour/Video pages, and nested route detail pages are not covered.
- A missing API environment variable, API error/404, non-HTML response, or missing required title causes the edge function to return the original response; that response may still be the SPA's generic 200 shell.
- When no content image is available, the fallback is `favicon.svg`, which is not a content-specific social preview and may not be a suitable large preview image. Keep the fallback rather than inventing artwork, but prefer existing, publicly fetchable content images.
- The current metadata tags do not include additional optional preview information such as `og:image:alt` or dimensions. Confirm image accessibility and preview rendering in production social debuggers.

Preserve the existing edge layer as a useful preview feature, but centralize/align its fields, visibility behavior, canonical policy, and error handling with the page-rendering and sitemap solution.

## 7. Structured data

No JSON-LD, Microdata, RDFa, or schema.org markup was found.

Accurate opportunities, subject to actual available fields:

- **Organization / WebSite:** define Offward's organization/site identity and canonical URL using verified brand and domain details.
- **BreadcrumbList:** provide a breadcrumb only where the visible route hierarchy and canonical parent URLs are clear.
- **Article:** appropriate for Story records when actual title, excerpt/body, publication dates, author information, and images are available. Omit unsupported author or date fields rather than inventing them.
- **Recipe:** use only for Food records that genuinely represent recipes and have actual ingredient/instruction data. Include preparation/cooking time and servings only when those fields exist and are valid; do not label all Food entries as recipes.
- **Place / route information:** use a suitable Place subtype only when the record and known coordinates/address/name support it. A Route/itinerary schema is appropriate only if its meaning and itinerary fields are supported by the stored content. Do not fabricate distances, locations, ratings, reviews, or directions.

Structured data should be emitted with the same initial HTML/pre-rendering strategy as the visible page and kept consistent with user-visible content; it is not a substitute for that content.

## 8. Performance and technical SEO observations

- **Semantic structure:** `AppShell` provides a primary navigation landmark and a `main` outlet; inspected detail and static pages generally use headings and semantic sections/articles. Public detail pages have an `<h1>`. Confirm every indexable page has one clear, meaningful primary heading, including the Home page and error states.
- **Headings:** visible detail pages have hierarchical headings for major subsections. Check heading order in pages that compose feature sections, but no broad hierarchy failure is confirmed by this source review.
- **Image alternatives:** many list-card and thumbnail images use `alt=""`, appropriate when adjacent link text conveys the same information or the image is decorative. Story gallery images use `alt_text`, caption, or a generated collection/index fallback. Review content images individually and use editorial alt text where the image itself adds information; do not use blank alt by default for meaningful content photography.
- **Lazy loading and layout stability:** many lower-page/card images use `loading="lazy"`; a prominent Story image uses high fetch priority. Several grid styles reserve space with aspect ratios, but most dynamic `<img>` elements do not declare intrinsic `width`/`height`. Confirm all prominent and gallery images reserve dimensions/aspect ratio at rendered sizes to avoid layout shifts.
- **Internal navigation:** the existing shell has ordinary internal React Router links for the main public sections, and content cards link to detail pages. Ensure primary discovery pages remain reachable by crawlable links and do not depend exclusively on map interactions or “load more” UI for important content.
- **Mobile:** the navigation has a dedicated mobile menu and uses responsive layout styles. This is a positive foundation; production mobile usability still needs rendered-device verification.
- **Canonical host and HTTPS:** index and shared URL helpers hardcode `https://offward.eu`, and the edge function uses the same origin. No explicit hostname/HTTPS redirect is present in the inspected Netlify configuration. Verify Netlify's production primary domain, redirects from alternate hosts and HTTP, and that API-hosted images resolve over HTTPS. Keep canonical URLs aligned with the deployed redirect destination.
- **URL structure:** `/routes/:slug`, `/places/:slug`, `/stories/:slug`, `/food/:slug`, and `/countries/:slug` are readable. Filter/map query parameters should not become separate sitemap canonicals unless intentionally curated as landing pages.

This section is a source-level review, not a Lighthouse, accessibility, or production crawl; no builds or tests were run per request.

## 9. Netlify and Django responsibilities

| Frontend / Netlify | Django backend |
|---|---|
| Render/prerender the public page body and head; provide page-specific titles, descriptions, Open Graph/Twitter tags, and canonical URLs. | Define which records are published, active, and publicly accessible; ensure public detail endpoints consistently enforce visibility. |
| Return the correct HTTP status for unmatched URLs and content that no longer exists, while keeping transient upstream failures distinct. | Provide public content fields and actual publication/update timestamps required for metadata, sitemap freshness, and structured data. |
| Serve `robots.txt`, the sitemap (or a generated sitemap), static content, and canonical redirects. | Optionally provide an authoritative, paginated sitemap feed or sitemap endpoint with only canonical public URLs. |
| Run/refresh build-time prerendering after publication changes if that approach is selected; maintain the current Edge Function for social previews as appropriate. | Trigger a deploy/build hook or refresh the sitemap when content is published, changed, unpublished, or deleted if frontend generation is used. |
| Keep management navigation and frontend routes out of public discovery; do not treat robots as security. | Continue protecting private APIs/data with authentication and authorization. |

This repository contains the frontend and Netlify configuration only. Backend module/file names, publication filters, sitemap capability, and endpoint behavior must be confirmed in the Django repository before assigning exact backend files.

## 10. Exact files likely to change and ranked phases

### Likely frontend/Netlify files

- `src/pages/NotFoundPage.jsx` and `src/shared/components/RoutePlaceholder.jsx` — replace the generic placeholder with an Offward-branded, useful 404 using current shell/components.
- `src/app/router.jsx`, `public/_redirects`, and potentially `netlify.toml` / `netlify/edge-functions/social-meta.js` — coordinate SPA fallback behavior and genuine HTTP 404 responses without breaking valid client routes.
- `src/shared/components/PageMetadata.jsx`, `index.html`, and affected public page files — complete page-specific metadata and canonical behavior for Home, listings, Countries, static pages, and remaining public details.
- `netlify/edge-functions/social-meta.js` — retain or align its content lookup, supported route set, canonical/image handling, visibility checks, and behavior for API 404s with the chosen rendering approach.
- `vite.config.js`, `src/main.jsx`, and a new focused build-time generation script/configuration — only if implementing prerendering and a hydration-compatible output path.
- `public/robots.txt` and a generated or served `sitemap.xml` — not currently present.
- `src/shared/components/PublicLaunchGate.jsx` and `src/shared/constants/launchGate.js` — only if launch indexing policy must be made conditional and explicit.

### Likely backend responsibilities (Django repository not audited here)

The Django API/view/queryset/serializer/routing layer would own public visibility rules and potentially the sitemap feed. Exact backend filenames should be selected only after inspecting that repository.

### Suggested implementation phases

1. **Launch readiness and response correctness:** verify the live launch gate, domain/HTTPS redirects, Netlify rewrite ordering, and API visibility rules. Design status handling so unknown paths and missing/unpublished content return genuine 404s while upstream failures remain errors.
2. **Branded 404 and complete metadata:** improve the catch-all UX; add actual-field-based metadata and correct canonical URLs to every intended public route; ensure not-found/error pages do not claim a valid content canonical.
3. **Meaningful initial HTML:** implement the smallest viable Netlify/Vite-compatible prerender strategy for public content, including route body content, metadata, and compatible hydration. Validate raw production HTML and content freshness after publication changes. Do not migrate frameworks unless measured requirements demand it.
4. **Sitemap and robots:** publish only canonical, visible content; paginate the Django catalog fully; add sitemap discovery and management crawl guidance; automate refresh on content publication/unpublication.
5. **Structured data and final verification:** add only supported schemas and verify representative public, unpublished, deleted, and unknown URLs using raw HTTP responses, rendered browser pages, Google Search Console inspection, and social preview debuggers.

## Production verification checklist

The following are not determinable from this repository alone:

- Which value is deployed for `VITE_PUBLIC_LAUNCH_ENABLED`, and what anonymous visitors receive from `getOffwardAccess()`.
- Whether Netlify's production domain is `offward.eu`, whether alternate hosts/HTTP redirect to it, and the effective response after edge-function and redirect processing.
- Raw response status/body for unknown paths and deleted/unpublished content URLs.
- Whether all four Edge Function API detail lookups work with the deployed `VITE_API_BASE_URL`, and whether Django public endpoints exclude unpublished/inactive content.
- Whether Google currently renders/indexes the client-rendered body, and how deployed social crawlers display edge-injected metadata and content images.

**Audit conclusion:** Offward has a stronger starting point than an SEO-naive SPA: content-driven client metadata and a pre-JavaScript social metadata Edge Function already exist for four core content types. The material launch risks are soft-404 HTTP 200 responses, incomplete page metadata/canonicals, the empty initial body on client-rendered routes, no sitemap/robots files, and the launch gate's indexing state. Address these incrementally on React/Vite and Netlify; a framework rebuild is not justified by the inspected evidence.
