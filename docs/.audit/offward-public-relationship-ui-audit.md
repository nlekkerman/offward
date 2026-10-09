# Offward Public Relationship UI Audit

Audit date: 2026-10-09. Scope: public React frontend routes, relationship presentation, discovery/list surfaces, cards, media, responsive styles, and frontend API helpers. This is an audit and recommendation only; no application or backend code was changed. The backend serializer and endpoint ordering contracts are not present in this frontend checkout, so findings describe frontend consumption rather than asserting unverified wire-schema guarantees.

## Executive Summary

- Explore is the only full public Routes/Places browser with bounded page requests, filters, Load more, and map/list modes.
- Food also has a bounded, paginated browse page with Country and type filters, though those filters are not represented in the URL.
- Stories and Countries have navigation/list pages but their current list helpers return only the response’s array/results, without page navigation; these pages are not demonstrably exhaustive.
- Country detail is not yet a discovery hub: it shows identity, summary, a raw status label, and a paginated Food section only.
- Route detail is the richest journey page. It shows the map, summary, Route videos, child Waypoint/Segment selections, and an aggregated Food section. It does not expose linked Places as a section or Route/child Stories.
- Place detail has direct media, Story and Food sections, but no related Routes section. Story detail has media and direct Place/Route/Food relationships. Waypoint and Segment pages keep their Food relationships scoped to their own IDs.
- Card components and inline implementations vary substantially in aspect ratio, density, metadata, and visual style. This is visible but less urgent than incomplete discovery paths and unbounded list consumers.

## Relationship Matrix

“Direct” below means the public page reads an owner field/child collection. “Derived” means it must infer a relation from another entity or relationship direction. “Aggregated” means the UI deliberately combines IDs for presentation without changing ownership.

| Page / owner | Direct relationships consumed or available to the UI | Derived relationships | Currently displayed | Missing useful content / notes |
|---|---|---|---|---|
| Country | Country identity, summary, status; Food filtered by the Country value | Routes, Places, Stories and Food can be discovered by their Country field/filter; they are not embedded children in the visible page code | Identity/flag, summary, raw status label, up to 12 Food at a time | No Routes, Places, or Stories section. Country page does not establish a canonical “View all in this Country” path. |
| Route | `waypoints`, `segments`, `food_ids`, summary, `video_ids`/`media_ids`, embedded media/gallery fields, country/activity | Place context can be inferred through child `place_id`; Route Food presentation includes Food IDs owned by child Waypoints and Segments | Map and child detail overlay; summary; expandable Route video panel; Route + child Food union | No linked Place cards outside map, no Route Stories. The page does not currently resolve Route-level Place fields if any exist. |
| Place | Country, summary/body, `story_ids`, `food_ids`, media IDs/collections, coordinates | Routes that include/reference this Place are not looked up in the Place page | Identity, Country/date metadata, map, media, related Stories, related Food | No Related Routes section despite Route child Place references being available elsewhere. |
| Story | Country, excerpt/body/hero, `place_ids`, `route_ids`, `food_ids`, media IDs/collections | Food-to-Waypoint/Segment parent Route context is only shown on Food detail; not Story detail | Article, media, related Place/Route cards, related Food | No Country-page link, no Event/Tour relation shown. Place/Route resolution is bounded to one catalog page and can omit matches. |
| Food | Country, type, summary/body/recipe, `place_ids`, `route_ids`, `story_ids`, `waypoint_ids`, `segment_ids`, media | Waypoint/Segment links are resolved through public Route catalog/context to their parent Route | Food detail/media, Place and Route card groups, Story text links, Waypoint/Segment links with parent Route context | Country name is not a link. Food-to-child resolution is explicitly bounded/manual and may remain incomplete. |
| Waypoint | Embedded under Route; `place_id`, `food_ids`, media IDs/collections, summary/type/order | Parent Route and position/order; Segment context via Segment endpoint IDs | Route context, optional Place text card, media, own Food, map overlay preview | No linked Stories and no neighboring Segment links on detail. Place lookup only examines the first 24 Places and reports incomplete resolution. |
| Segment | Embedded under Route; start/end Waypoint IDs, `story_ids`, `food_ids`, media IDs/collections, summary/title/order | Endpoint Waypoints and any Place context attached to them | Route context, endpoint text, media, own Stories and Food, map overlay | Endpoint Waypoints are labels rather than links/cards; no Place cards. |

Other directionality is not automatically invertible: a Story’s `route_ids` do not provide a bounded way to discover all Stories for a Route, and a Route child’s `place_id` does not by itself establish a complete reverse lookup of every Route for a Place.

## Country Page

`CountryPage` fetches one Country detail record. The rendered page contains a Country flag/identity and code, name, summary, `Status: ...`, then `CountryFood`. `CountryFood` requests Food page 1 with `page_size=12` and the Country slug or ID; it offers manual Load more and explicit empty/error states. It does not fetch Routes, Places, or Stories.

The public Route and Place list helpers accept a Country filter. The Food list accepts one too. The public Stories helper does not expose pagination/filter state to the page. The Country page does not link to any filtered browse destination. The raw status label is operational metadata, not a strong public discovery element; review whether it should remain in public presentation.

**Recommendation:** Make Country a high-level discovery hub, not a dump of child Waypoints/Segments:

1. Country identity/summary.
2. Bounded Routes preview (3–6), with a supported filtered Explore destination.
3. Bounded Places preview (3–6), with a supported filtered Explore destination.
4. Bounded Stories preview once a paginated/filterable public Story query is available.
5. Bounded Food preview (3–6) and a filtered Food destination once the list can initialize from URL state.

Do not fetch complete catalogs per Country. Current Food preview is already bounded per request, but “Load more” replaces the intended preview role; use an explicit browse link for a hub section. Until filter URLs are implemented, link to the canonical unfiltered Explore/Food page and do not invent query parameters.

## Route Page

The Route page fetches a Route by slug and uses the embedded Waypoints/Segments. The map supports selectable child entities; hover preview is enabled only for fine hover pointers, selection clears competing selections, and the overlay can navigate to the child detail. Segment list/select controls are omitted when there are no segments.

Current Route detail content:

- **Map:** Route geometry where renderable; Waypoint markers and selectable Segments. A missing/unrenderable path gets explanatory text rather than a decorative map placeholder.
- **Summary:** Direct Route summary.
- **Media:** Direct Route Videos are behind a toggle; child media is available in child overlays/details, not merged into the Route gallery.
- **Food along the way:** `getRouteFoodIds` presentation union of Route `food_ids`, all embedded Waypoint `food_ids`, and all embedded Segment `food_ids`, deduplicated in first-occurrence order. This is UI aggregation only. It does not mutate relationships or change Waypoint/Segment detail ownership.
- **Places:** No Route-level Place section. Child Waypoint detail can show its linked Place, but this is not an adequate substitute for a scannable Route Places list.
- **Stories:** No Route-level Story section. The UI has no bounded reverse lookup from Route to Stories.

**Recommendation:** Keep the map, summary, Route-owned media, and aggregated “Food along the way.” Add a bounded “Places along the Route” section if the Route payload exposes child Place references reliably; resolve by a supported filtered endpoint rather than downloading all Places. Add Route/child Story aggregation only if a reliable, bounded public relation/query exists. Do not silently combine ownership: Waypoint and Segment pages and overlays should continue using only their own `food_ids`.

## Place Page

Place detail renders a name, Country label/flag, optional `visited_at`, summary/body, a map when coordinates are renderable, media, related Stories, and Place-owned Food. Stories are resolved from `story_ids` against the public Story helper. A failed Story lookup gets an error message; empty related sections are hidden.

No Route lookup or related Route section is present. This is a high-value gap because Routes may reference Places through Waypoint `place_id`, but there is no reverse Route filter/lookup in the current Place page. Avoid crawling every Route/Route detail to synthesize this section.

**Recommendation:** Preserve Place identity, body, location, media, direct Stories and direct Food. Add a bounded Related Routes section only when a public endpoint or other complete bounded relation supports it. Keep Country context visible and consider making it navigable only when a Country browse destination is useful.

## Story Page

Story detail renders title, Country/date metadata, excerpt, optional hero, body, Videos and image collections, related Place/Route cards, and direct Story Food. Place and Route IDs are resolved by requesting the first 24 public Places/Routes and matching IDs locally; a notice can indicate that later catalog pages may contain more matches. The frontend does not crawl all pages or request one detail per ID.

Related Place/Route cards share `story-related-card` styling but are constructed inline. They contain image or a decorative glyph fallback, entity type, title, and Country/activity metadata; summaries/dates are omitted. Food uses compact Food cards.

**Recommendation:** Keep the article first, then direct media and direct Places/Routes, followed by direct Food. Do not add a second generic Country card where the Country/date metadata already establishes context. Preserve bounded matching and surface the limitation; ideally use server-side relation expansion or ID filtering for complete results.

## Food Page

Food detail renders type/category, title, Country text/flag, published date, summary/body, recipe metadata/ingredients/steps, media, then Food relationships:

- direct `place_ids` as image-led related cards;
- direct `route_ids` as image-led related cards;
- direct `story_ids` as compact text links;
- `waypoint_ids` / `segment_ids` as contextual links after checking loaded public Routes and explicitly resolving at most four Route contexts per user action.

The Food browse page is the only full entity list with URL-unaware filters: page size 12, Country and Food type selectors, explicit Load more, count, retry, and an explicit no-match state. Country options are themselves fetched through a paginated helper, with a manual “Load more countries” control. The selected filter values are local state, not query-string state.

The four relationship groups are not currently duplicated under “Related Routes” and “Along the Route.” Direct Routes and linked child entities are distinct scopes, though a child entry includes its parent Route title and can repeat Route context. Keep direct Routes canonical; keep Waypoint/Segment context compact and only when useful. Do not relabel child-owned Food or convert it to direct Route Food.

## Waypoint Page

Waypoint detail is nested under a Route URL. It shows Route context, order/name/type, summary, optional Place context, media, and only the Waypoint’s own `food_ids`. The Place resolver inspects the first 24 Place records and reports when more pages may exist. It does not show Stories or Segment links.

The Route map overlay is deliberately compact. It shows Waypoint title/type/summary, at most one media preview and media counts, plus the child’s own Food resolution. Food uses the shared public Food catalog/resolver, displays a first title and count/remaining status, and permits bounded manual lookup. It does not inherit Route Food or expose a full Food card.

**Recommendation:** Keep this page scoped. A compact Place link and a small amount of Segment/sequence context may help orientation, but do not duplicate the Route page or add Route-wide Food/Stories.

## Segment Page

Segment detail shows Route context, Section order/title, endpoint names, media, direct Segment Stories and direct Segment Food. Endpoint names are not links; no endpoint Place cards are presented. The map overlay shows a compact summary/media preview and the Segment’s own Food only.

**Recommendation:** Keep direct Segment Food/Stories/media. Endpoint Waypoint links may be useful if they remain secondary, but do not create a second Route page. Hide absent relationships rather than inserting decorative placeholders.

## Media Presentation

- **Route:** Direct Route videos appear in an expandable panel. RouteMap child overlays choose one available collection cover first, then one Video thumbnail/poster; child detail pages render media sections.
- **Place:** Uses its attached Videos and image collections; a coordinate map is separate from media.
- **Story:** Hero image is separate from media; attached Videos and embedded image collection images render below the article. Gallery images open a lightbox.
- **Food:** Attached Video/gallery media is rendered on the detail page; list cards use `preview_image`, collection cover, or image/thumbnail candidates.
- **Waypoint/Segment:** Direct child media is used on detail and a single cover/poster preview in the map overlay.
- **Cards:** Explore and Story list cards omit the media box entirely if no usable preview exists. Food cards do the same. Story related Place/Route cards and EntityMediaSection gallery previews use decorative glyphs when no cover exists; these are visual fallbacks, not loaded media.

No stock/dummy media is introduced. The intentional no-image behavior is generally preferable to empty grey boxes. Explore cards hide an image that triggers `onError`; Story list, Food and Home cards do not consistently expose the same broken-image fallback. Standardize error behavior if broken URLs are observed. Story detail does not render a hero container if there is no hero URL, but can still show gallery images later.

## Direct vs Aggregated Rules

| Presentation | Relationship rule | Status |
|---|---|---|
| Route “Food along the way” | Route + embedded Waypoint + embedded Segment Food IDs; presentation only | Implemented; deduplicated in Route → Waypoint → Segment first-occurrence order |
| Route map overlay Food | Selected Waypoint’s or selected Segment’s own Food IDs only | Implemented |
| Waypoint detail Food | Waypoint’s own Food IDs only | Implemented |
| Segment detail Food | Segment’s own Food IDs only | Implemented |
| Place Food / Story Food | Owner’s direct Food IDs only | Implemented |
| Food linked Routes / Places / Stories | Food’s explicit relationship ID arrays | Implemented |
| Food linked Waypoints / Segments | Food’s child IDs, displayed only after public Route context is resolved | Implemented with bounded/manual lookup |
| Route media / child media | Keep media on its owner; use child previews in child context | Implemented; no Route-wide media aggregation |
| Route/Place Stories | Do not infer by scanning all Stories or assume reverse IDs | No reliable bounded reverse lookup in current frontend |
| Country content | Filter by Country field, not by fetching every entity and matching locally | Route/Place/Food filters exist; Story filter/page support is missing from current helper |

Backend ownership should remain unchanged for every presentation union.

## Duplication Problems

1. **Route map children vs Route detail:** Map exposes each Waypoint/Segment; Route “Food along the way” also aggregates their Food. This is complementary discovery, not duplicated Food cards. Keep overlay compact and the full Food cards in the Route section.
2. **Food direct Routes vs child context:** A Food item can show a direct Route card and Waypoint/Segment links whose parent Route is stated. These may mention the same Route, but indicate different direct relationships. Keep one direct Route card group and child links in a separately labeled compact context group; avoid a second “Along the Route” group that repeats the same direct Route cards.
3. **Story hero vs gallery:** Hero is editorial lead media; gallery is a separate attachment group. It is acceptable when the same image is intentionally attached twice, but frontend code does not deduplicate hero/gallery content.
4. **Country labels:** Country appears as metadata across discovery and detail cards. It is useful context but currently mostly plain text rather than a navigation path.
5. **Route map and Route media:** Map mini-preview on the Home Route card is distinct from Route detail videos and child galleries; do not repeat full galleries in the Route map.

No current duplicate “Related Routes” and “Along the Route” headings were found on Food detail.

## Discoverability Gaps

- Country detail omits Routes, Places, and Stories and has no View all links.
- Route detail does not list the Places referenced by its Waypoints and does not show a Route/child Story section.
- Place detail does not show Routes that include/reference it.
- Country links are generally labels rather than links to a browsable Country page.
- The Home Latest rail has no View all CTA; Food has no Home Latest preview.
- Story/Country canonical lists cannot establish completeness or load additional pages with current frontend list helpers.
- Story related Place/Route lookup and Waypoint Place lookup can miss references outside the first loaded catalog page.
- Story and Food can link to specific Route/Place entities, but cannot link users into filtered browse views with current URL-synchronized filter state.
- Waypoint/Segment detail pages do not expose endpoint/neighbor navigation; Segment endpoints are text context only.

## Pagination / Performance Constraints

| Surface/helper | Current bound and behavior | Constraint / recommendation |
|---|---|---|
| Explore Routes/Places | Requests `page_size=12`; Country and Route activity filters; server `next`; explicit Load more. Map mode can request Route geometry, and map selection is Country-gated. | Best current browse pattern. Preserve server pagination; filters are not query-string synchronized. |
| Home Route preview | One active Route request with geometry, `page_size=1`; selects first API result. | Bounded, but ordering is backend default, not verified chronological “latest.” Geometry is needed for the mini-map. |
| Home Story preview | `getLatestPublicStory` obtains `getPublicStories()` response, filters active, client-sorts by `published_at`. | Unbounded/first-response only; lacks pagination envelope and is not guaranteed complete. Add paginated helper and request one ordered record if API supports ordering. |
| Home Video preview | Fetches public Video list, filters playable records and sorts by `published_at` in browser, then uses first. | Potentially unbounded. Add server ordering/limit support or a bounded list API. |
| Stories list / related Story IDs | Public helper accepts bare array or `.results`, filters active, sorts published date; no page args or pagination metadata retained. | List cannot Load more; relationship resolution cannot guarantee a match beyond that response. Do not silently crawl every page. |
| Countries list | `getCountries()` returns array or `.results` only. Separate `getPublicCountriesPage` and `usePublicCountries` support pagination, but CountriesListPage does not use them. | Countries page may show only first page when backend paginates. Use page helper and Load more or explicit pagination. |
| Food list / Country Food | `page_size=12`, Country/type filters, `next`, explicit Load more. | Bounded and honest; sync filters to URL before advertising filtered links. |
| Story Place/Route relation lookup | First page of 24 Places/Routes is loaded to match direct IDs. | Bounded but can omit records; prefer endpoint ID filters/expanded relations. Do not crawl all pages in the background. |
| Waypoint Place lookup | First Place page of 24; no automatic traversal. | Correctly reports possible later page; a Place-by-ID lookup or supported filter would resolve precisely. |
| Food Waypoint/Segment lookup | Loads Route catalog pages only on demand; resolves contexts in batches of at most four detail requests per user action. | Keep explicit and bounded. |
| Route detail | One slug-based detail request includes expected Route/child content; Food resolution uses shared cache and paginated manual page loading. | No extra relation API call for the aggregate. Verify backend payload contract separately if it changes. |
| Country Food preview | 12 records per request; currently exposes Load more. | Keep bounded; a Country hub should prefer a 3–6 preview plus View all. |

The frontend alone cannot verify whether API default ordering is chronological. Route and Food list ordering should not be called “latest” without an explicit `published_at`/`created_at` order guarantee.

## Public Card Inventory

| Card/component | Entity | Used where | Image | Country flag | Summary/excerpt | Date | Type/category | Reusable? | Problems |
|---|---|---|---|---|---|---|---|---|---|
| `ExploreCard` in `ExploreResults` | Route / Place | Explore list and map-side results | Candidate preview at 16:10; omitted on missing/error | Yes | Summary, max 3 lines | No | Kind; Route activity | Reusable within Explore only | Large discovery card; Place and Route differ in activity; local visual system. |
| `LatestRouteCard` | Route | Home Latest | Route mini-map, not photo, 16:9 | Yes | Summary, max 3 lines | No | Route + activity | Home-only | Visually unlike Explore Route card; ordering is API default. |
| `LatestStoryCard` | Story | Home Latest | Hero image, 16:9; omitted if absent | Yes | Excerpt, max 3 lines | Published date | Story | Home-only | Not shared with Stories list card; no image error handler. |
| `LatestVideoCard` | Video | Home Latest | Embedded player/thumbnail | No | No | Published date | Video | Home-only | Article-style Latest surface has a distinct player card; no Video All page. |
| Inline `story-list-card` | Story | `/stories` | Hero, collection cover, preview/image candidates; omitted if absent | Yes | Excerpt | Published date | Story | No | 220px media slot with responsive height; independent CSS/markup from LatestStoryCard. |
| `FoodCard` | Food | `/food`, Country Food, RelatedFood | Preview/collection/image candidates, 16:10; omitted if absent | Yes | Summary, 4 lines or 2 compact | Published date | Food type | Yes | Strong entity-specific styling; compact mode remains a sizeable card on detail pages. |
| Inline `story-related-card` | Place / Route | Story detail; also Food relationship renderer | Candidate image or decorative glyph fallback; 84px compact thumbnail | Yes | No | No | Entity kind; Route activity on Story cards | Shared CSS, duplicated JSX variants | Food and Story construct near-duplicate implementations with differing metadata and fallback behavior. |
| `RelatedStories` list item | Story | Place and Segment detail | None | No | No | No | None | Shared list component | Simple text link intentionally compact; no excerpt or Country context. |
| Country text row `explore-route-item` | Country | `/countries` | Flag only | Country flag is identity | Summary | No | Country code | No | Not a visual entity card; no pagination. |
| Waypoint Place context row | Place | Waypoint detail | None | No | No | No | “Place” label | Inline | Compact and useful, but only one bounded Place lookup. |
| `RouteMapDetailOverlay` | Waypoint / Segment | Route map | One media cover/poster | No | Short child summary | No | Child type/order | Reusable overlay | Correctly minimal; parent click navigation plus nested controls require preserving propagation/focus semantics. |

## Latest Content Surfaces

| Surface | Entity/count | Source / ordering | Bounded? | View all? | Card parity |
|---|---|---|---|---|---|
| Home | Up to 1 Video, 1 Story, 1 Route | Video list sorted by `published_at` after filtering playable items; Stories sorted by `published_at` after active filtering; Route first active item from API default order | Route bounded to 1; Video and Story helpers may download their full response | No rail-level View all. Main nav reaches Stories, Routes and Food; no Videos list | Home-specific Latest cards differ from browse cards; Route is a mini-map card |
| Explore default Routes | 12 per page, labeled “Latest Routes” when unfiltered | Public Route list default order; no client date sorting | Yes, Load more | The page itself is All/Browse; no separate View all | Explore discovery cards |
| Explore Places | 12 per page, “Places to Explore” | Public Place list default order | Yes, Load more | The page itself is All/Browse | Explore discovery cards |
| Stories | Full first helper response | Client sorts by `published_at` descending | No pagination exposed | `/stories` is the list destination; not proven complete | Inline Story list cards |
| Food | 12 per request | Public Food endpoint default order, not claimed latest | Yes, Load more | `/food` is browse destination | FoodCard |
| Countries | First helper response | API default order | No pagination on page | `/countries` is list destination; may not be complete | Country identity text rows |
| Country / Place / Route / Story / Food details | Relationship/media sections only | Owner-specific relationships | Varies; see performance table | N/A | Context-specific cards/lists |

Latest currently means published date for Home Story and Video selection and Stories list ordering. It does not mean a verified chronological order for Route, Place, Food, or Country lists. There is no latest Food/Place/Country section on Home or dedicated Latest section on Country/Place/Route detail.

**High-value additions:** Home should add a bounded latest Food preview only after its ordering can be specified; keep Home to a balanced small snapshot (Route, Story, Food, and Explore/Countries entry) rather than adding all entity types and Videos indiscriminately. Country should show bounded high-level previews. Do not add Stories/Food to Explore: its intentional scope is Routes + Places.

## Canonical “All Content” Pages

| Entity | Current canonical browse destination | Current behavior | Gaps |
|---|---|---|---|
| Routes | `/explore?view=routes` | Paginated 12; Country/activity filters; map/list mode | Filter state other than `view` is local, not shareable URL state. |
| Places | `/explore?view=places` | Paginated 12; Country filter; map/list mode | Country filter is local, not shareable URL state. |
| Stories | `/stories` | First response only; client sorts `published_at`; no filters or Load more | Pagination envelope, completeness and Country filter are unavailable through current helper. |
| Food | `/food` | Paginated 12; Country/type filters; Load more | Filter values are not synchronized with URL. |
| Countries | `/countries` | `getCountries()` array/results only | Page does not use the paginated countries helper; completeness not established. |
| Videos | No public all/browse page | Home shows one playable Video; detail path is `/videos/:videoSlug` | No canonical video catalogue/nav. Only add one if product scope requires it. |

Primary navigation links Stories, Food, Places, Routes, and Countries. There is no “All” label; Explore Routes/Places and Food themselves are the browse pages. Detail related sections should link to these canonical pages when appropriate, but avoid adding links that imply filters the destination cannot restore.

## Home Discovery

Home is a branded hero with “Explore routes” and “Explore places” CTAs, followed by the Latest rail. The hero uses a bundled decorative background image. The Latest rail is a responsive grid (not a horizontally scrolling carousel in the current CSS) with up to three cards: playable Video, latest Story, and first active Route. It has skeleton cards while loading, then hides entirely if nothing loaded. It has no section-level View all CTA and no Food/Place/Country preview.

The Story card order is based on `published_at`; Video is likewise client-sorted. Route uses the first active record from the list API with no verified date ordering. Card interaction is hover/focus lift with visible focus outline; mobile reduces rail padding and keeps the card grid.

**Recommendation:** Keep the hero CTAs (they serve a useful direct path) and the current small Latest idea. Add a clear View all Stories/Routes path and, when ordering is supported, a small Food preview. Avoid duplicating a large Explore section or adding numerous separate rails. The Videos card is playable inline and has no “All Videos” destination; treat it as editorial media, not a complete Video latest/browse feature.

## Explore Discovery

Explore intentionally exposes Routes and Places only. The `view` query parameter controls the tab and is retained when switching; Country and Route activity filters stay in component state. The page starts with a paginated 12-item result set, shows result count, Load more/retry, and map/list mode. The Route map is Country-gated for geometry loading; Place map uses coordinates. Map mode combines results and map on wide screens and adapts to one column on narrower layouts.

The list card uses a preview image when available, Country flag, optional Route activity, summary, and an Explore link affordance. Focus-within/hover raises the card border/position. The map-side card becomes a one-column result rail. Empty filtered results have a useful explicit message.

**Recommendation:** Keep Explore focused on Routes and Places. Improve shareability by synchronizing supported Country/activity filters with URL state; retain bounded server pagination. Do not fetch all results merely to make the map appear complete.

## Country Discovery

Today the Country detail page is not equivalent to a browse hub and has no “Latest” concept. Food is the only content section, with 12-item pages and Load more. Country list rows are identity/text rather than discovery cards.

**Recommended preview targets (conditional on supported filters):**

- Routes → `/explore?view=routes&country=<slug>` only after Explore reads/synchronizes that query value.
- Places → `/explore?view=places&country=<slug>` only after Explore reads/synchronizes that query value.
- Stories → `/stories` until public Story Country filtering and URL state exist.
- Food → `/food` until Food initializes the Country selector from query state.

Do not publish the example query URLs before implementing their parsing. Each preview should show a small bounded sample and a View all link, never an automatic all-page crawl.

## Card Reuse / Duplication

The strongest duplication is not one shared component used everywhere; it is parallel custom presentations:

- Story discovery is implemented separately in Home Latest and `/stories`.
- Route uses both Home-specific mini-map card and Explore image card.
- Story detail and Food relationship rendering independently build related Place/Route cards using shared CSS.
- Related Food has a compact variant of the full FoodCard, but remains larger than a text relationship row.

**Recommended small hierarchy (not a rewrite):**

1. **Discovery card:** Image-led Route/Place/Story/Food list and bounded hub previews. Standardize only media sizing, title/summary limits, metadata order, keyboard focus, and missing/broken-image behavior. Keep entity-specific map/player imagery as explicit variants.
2. **Compact related card/link:** Small contextual Place/Route/Food cards; Stories can remain text links when that is enough context. Avoid reusing a full 3-column Food card inside a small detail section.
3. **Map overlay preview:** Keep the current text-first child preview, one optional media preview, counts, child Food hint, and clear actions.

Extract or generalize only after the common fields and variants are stable. Do not force Country identity rows or Video players into the same card abstraction.

## Images and Placeholder Problems

| Surface | Current image behavior | Classification / action |
|---|---|---|
| Home hero | Bundled decorative hero image, empty alt, eager/high priority | Intentional design image, not entity content. |
| Explore Route/Place | Candidate preview; failed image is hidden by local error state | No-image omission is valid; broken URL handled better than other cards. |
| Home Story | Hero only; no fallback to collection/preview in this card | Available collection preview may be omitted even though Stories list supports it. Consider shared preview resolution. |
| Home Route | Mini-map, not an entity photo | Intentional map presentation, but visually distinct. |
| Stories list | Hero → first collection cover/image → preview/image/thumbnail; no placeholder | Valid omission if no image; broken image has no explicit fallback. |
| FoodCard | Preview → first collection cover → image/thumbnail; no placeholder | Valid omission if no image; broken image has no explicit fallback. |
| Story related Place/Route | Candidate image or decorative glyph | Glyph is a design fallback, not a real image. Keep only if intentionally part of compact-card design. |
| EntityMediaSection gallery preview | Collection cover or glyph | No cover can be a valid fallback, but ensure “View” can still open a collection with images. |
| Story detail | Hero only when usable; gallery images independently shown | Missing hero is valid; there is no blank hero box. |
| Place/Route/Waypoint/Segment detail | Map/media conditionally shown | Missing coordinates/path uses explanatory text; no fake map image. |

The code has no dummy/stock entity imagery. Standardize candidate URL resolution where practical and add `onError` behavior to cards that currently leave broken `<img>` elements. Do not replace missing images with invented content.

## Empty State Rules

- **Public detail related section:** Hide when the owner has no IDs/records. Existing RelatedStories and RelatedFood do this when there are no IDs.
- **Unresolved relationship IDs:** Preserve transparent loading/error/unresolved status and bounded retry/manual page controls; do not present unresolved IDs as successful links.
- **Full list/browse page:** Keep explicit empty state, retry on failure, count only after success. Food and Explore already follow this pattern.
- **Country hub preview:** Hide an empty preview section or show a short “No published … yet” message only if useful; never leave a decorative blank card.
- **Media:** Hide the section if no media. Existing EntityMediaSection does so.
- **Management:** Keep actionable empty states (outside this public UI audit).

Current quality is mixed: Food/Explore have explicit empty states; Stories/Countries have explicit empty messages but their list completeness is limited; Country Food says none is listed; most relationship components hide when empty. Country detail’s `Status: undefined` risk is possible if status is absent and should not be used as a public status presentation without a guard.

## View All Navigation

| Preview/section | Correct current target | URL/filter limitation |
|---|---|---|
| Home Routes | `/explore?view=routes` | No Country filter applied. |
| Home Places | `/explore?view=places` | No Country filter applied. |
| Home Stories | `/stories` | List has no pagination. |
| Home Food (recommended) | `/food` | Country/type state not query-synchronized. |
| Country Routes | Explore Routes | Country query parameter is not currently applied from URL. |
| Country Places | Explore Places | Country query parameter is not currently applied from URL. |
| Country Stories | `/stories` | No Country filter/pagination. |
| Country Food | `/food` | Country selector is local state only. |
| Related Food/Story/Place/Route | Entity detail slug path | These are direct relationship links, not “View all.” |

Do not add a filtered URL link until the target page reads and preserves the query. The Route/Place filters currently work only after user selection.

## Visual Consistency

- Explore and Latest cards have similar dark surfaces but distinct borders/radii, media use (image vs mini-map), spacing and copy.
- FoodCard uses a different warmer palette, 16:10 image ratio, larger padding and up to four summary lines; compact mode reduces padding/summary but is still image-led.
- Story list cards have fixed-height media that changes at responsive breakpoints; related Story Place/Route cards use compact 84px thumbnails, reduced to 64px on narrower layouts.
- Country list uses a flag + text row, not the image-led visual card family.
- Metadata conventions vary: Country flag/date on Food and Story cards; no date on Explore cards; no date on Route; category/activity appears selectively.
- Explore and Home have visible keyboard focus styling. Story list and related cards also provide focus styles; maintain these if styles are consolidated.
- Explore cards adapt to one column in the map browser, while browse grids use auto-fill. Food uses three columns, two below 900px, one below 600px. Story list media height grows at responsive breakpoints.
- Accent colors differ (Explore red/green vs Food red/coral vs older Story/Route gold/green). Some variation is entity/legacy styling; normalizing all colors is lower value than coherent spacing, media ratios, metadata and focus behavior.

The visual differences appear intentional/legacy rather than evidence of a single broken layout. A small shared token/card pass is appropriate only after discovery behavior is fixed.

## Recommended Canonical Public UI

- **Country:** identity and summary → bounded Routes → bounded Places → bounded Stories → bounded Food. No child Waypoint/Segment dump.
- **Route:** header/Country/activity → map with Waypoints/Segments → summary → Route media → Places along Route (bounded) → Food along the way (Route + child IDs, display-only) → Stories only with supported bounded lookup.
- **Place:** identity/Country/location/body → media → direct Routes if resolvable via supported query → direct Stories → direct Food.
- **Story:** article/Country/date → hero/body → media → direct Places → direct Routes → direct Food.
- **Food:** title/type/Country/date/summary/recipe → media → direct Places → direct Routes → direct Stories → compact Waypoint/Segment context where it adds value.
- **Waypoint:** Route context/order/type → linked Place → child media → own Food. No inherited Route Food.
- **Segment:** Route/endpoints → child media → own Stories → own Food. Endpoint link navigation is optional secondary context.

All relationship sections should hide when no usable relationships exist, and should label direct vs contextual/aggregated content accurately.

## Recommended Latest / All Strategy

- **Latest:** Treat Home as a small curated snapshot, not a second catalog. Prefer bounded, server-ordered latest Routes/Stories/Food and optionally one media feature. “Latest” must use a defined date/order, not an undocumented endpoint default.
- **All/Browse:** Routes/Places → Explore; Food → `/food`; Stories → `/stories` after pagination support; Countries → `/countries` after pagination support.
- **Country:** bounded entity previews with explicit View all. Filtered destinations require URL-synchronized filters first.
- Keep map/list mode and user-requested Load more on Explore; do not automatically fetch all records.
- Consider Videos a separate product decision: currently Home only, no canonical All page.

## UI Polish Priority Matrix

| Surface | Current issue | Recommended presentation | Priority | Component reuse |
|---|---|---|---|---|
| Home | Latest sources have mixed/unverified ordering; no View all; no Food preview | Small, date-defined Latest mix plus clear browse links | P1 | Reuse stable discovery-card primitives; keep mini-map/player variants |
| Explore | Country/activity filters are not URL state; Route/Place visual parity is partial | Preserve paginated Routes + Places map/list; support shareable filter state | P1 | Existing ExploreCard stays Explore-specific initially |
| Country | No Route/Place/Story hub sections; Food is only content preview; raw status label | Bounded previews with valid View all targets | P1 | Reuse discovery card patterns, not a new generic framework |
| Route | Places not separately discoverable; no Stories; aggregated Food is correctly presentation-only | Add bounded Places; add Stories only with bounded data support | P1 | Reuse compact related card family |
| Place | No related Routes | Add only if supported reverse lookup exists | P1 | Compact Route links/cards |
| Story | Related Place/Route first-page lookups can omit records; cards differ from list/Home | Add server-side bounded relation resolution; align previews | P1 | Shared preview resolver/card after data contract settles |
| Food | Filter URL state missing; related child context may repeat parent Route context | URL-synchronized filters; retain distinct direct Route and child relationship groups | P1 | FoodCard remains entity-specific; compact child links |
| Waypoint | Place lookup bounded to first page; no adjacent context | Exact Place lookup; optional compact neighbor context | P2 | Compact related links |
| Segment | Endpoint Waypoints are labels, not links; otherwise scoped appropriately | Consider endpoint navigation without duplicating Route content | P2 | Compact related links |

## P0 / P1 / P2 Plan

### P0 — correctness and misleading presentation

- Make public list completeness explicit: Stories and Countries currently lack page navigation in their page consumers.
- Do not label Route/Food/default-order lists “Latest” unless ordering is defined; Home Route is currently API-order, not date-order.
- Guard or remove raw Country status presentation when it is not a public-facing status.
- Preserve direct ownership and the existing Route Food display-only union; keep Waypoint/Segment Food scoped to each child.
- Add consistent broken-image handling to custom cards if source URLs are known to fail; do not add dummy images.

### P1 — discovery and navigation

- Build Country as a bounded high-level discovery hub with supported filtered View all destinations.
- Add a Route Places section using existing child references and bounded lookup; avoid a full catalog crawl.
- Add Place Related Routes only when a supported reverse relation/query is available.
- Paginate Stories/Countries and provide bounded Home Latest requests/order.
- Synchronize Explore and Food filters with query state before adding pre-filtered View all links.
- Add Home Latest View all paths and consider a bounded Food item once published-date ordering is supported.

### P2 — presentation polish

- Align discovery card spacing, media behavior/ratios, Country metadata and focus styling across Home, Explore, Stories and Food.
- Share Story-related Route/Place rendering and image-preview resolution where fields are truly common.
- Keep compact related sections compact; consider reducing full FoodCard density in detail contexts.
- Optionally add endpoint/neighbor links to Waypoint/Segment while preserving their scoped detail content.

## Final Report

1. **Latest currently exists:** Home Latest rail (one Video, Story and Route), plus Explore’s default “Latest Routes” label. Home Story and Video ordering is by `published_at`; Route and Explore ordering is API default/unspecified.
2. **Latest should exist:** Home can add bounded Food after ordering is explicit; Country can show bounded previews, but should not create separate uncontrolled “Latest” catalogs.
3. **Canonical All/Browse:** Routes/Places at Explore; Food at `/food`; Stories at `/stories` after pagination; Countries at `/countries` after pagination; no Video All page.
4. **Card inconsistencies:** Home Latest vs Explore vs Story list use separate implementations; compact Story relation cards are duplicated between Story and Food; Country remains a text row. Media ratios and metadata differ.
5. **Image/empty-state issues:** No dummy image issue found. Several image cards omit `onError` behavior; image-less cards generally omit the image rather than rendering a blank box. Stories/Countries have explicit empty text but uncertain completeness.
6. **Recommended hierarchy:** Discovery card, compact related card/link, minimal map overlay preview; keep Country rows and Video players as purposeful variants.
7. **Recommended Home:** Hero/Explore CTAs; a small, ordered Latest mix of Routes, Stories and Food; visible View all links. Keep the current Video feature only if it remains curated and bounded.
8. **Recommended Country:** Identity/summary, bounded Routes, Places, Stories, Food previews, each with supported View all; never list every child Waypoint/Segment.
9. **Recommended Route:** Map, summary, Route media, bounded Places, aggregated “Food along the way,” and Stories only when reliably queryable.
10. **Recommended detail strategy:** Direct owned relationships on each entity; compact contextual child links; hide empty related sections; no ownership changes.
11. **Priorities:** P0 list/order/status truthfulness and direct-vs-aggregate semantics; P1 bounded discovery sections and filter/navigation support; P2 card consistency and optional neighbor navigation.
12. **Audit path:** `docs/.audit/offward-public-relationship-ui-audit.md`.

## Frontend Evidence

Key implementation references: `src/app/router.jsx`; `src/shared/layout/AppShell.jsx`; `src/pages/HomePage.jsx`, `ExplorePage.jsx`, `CountryPage.jsx`, `CountriesListPage.jsx`, `StoriesListPage.jsx`, `FoodsListPage.jsx`, `RoutePage.jsx`, `PlacePage.jsx`, `StoryPage.jsx`, `FoodPage.jsx`, `WaypointDetailPage.jsx`, `SegmentDetailPage.jsx`; `src/features/explore/useExploreData.js` and `ExploreResults.jsx`; `src/features/home/LatestContentRail.jsx`; `src/features/food/FoodCard.jsx`, `RelatedFood.jsx`, `FoodRelatedContent.jsx`, `publicFoodResolution.js`, and `publicRelationshipCatalog.js`; `src/features/routes/components/RouteMapDetailOverlay.jsx` and `EntityMediaSection.jsx`; `src/services/routesApi.js`, `placesApi.js`, `storiesApi.js`, `foodsApi.js`, and `countriesApi.js`; `src/index.css`, `src/features/explore/explore.css`, `src/features/food/food.css`, and `src/features/home/LatestContentRail.css`.
