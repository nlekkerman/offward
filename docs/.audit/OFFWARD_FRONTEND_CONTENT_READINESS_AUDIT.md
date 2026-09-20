# Offward Frontend Content Readiness Audit

**Scope:** frontend only, read-only audit of the current workspace. No backend files, application code, routes, API contracts, tests, or behavior were changed.

## Executive Summary

The frontend is materially further along than the previous audit indicated. It has live public Stories, Places/Routes discovery, Country pages, Place details, Route details with map/waypoint/segment presentation, a generic management CRUD surface, dedicated Gallery management, reusable video authoring, and a real Route Map Editor.

The largest current gaps are public presentation for Country/Tour/Event/Video detail, absence of public image/video rendering for most content types, no public Partners surface, and incomplete waypoint authoring around a canonical human-readable `name`. The existing waypoint editor already supports selection, coordinates, order, Place association, `label`, video attachments, delete, and save; `name` is the only requested waypoint field missing from the current UI and payload.

## 1. Public Route Inventory

| Requested experience | Actual frontend route | Classification | Evidence |
|---|---|---|---|
| Home | `/` | **Real** | `src/pages/HomePage.jsx` renders hero and Home Latest rail. |
| Stories list | `/stories` | **Real** | `src/pages/StoriesListPage.jsx` loads and links public Stories. |
| Story detail | `/stories/:storySlug` | **Real** | `src/pages/StoryPage.jsx` loads full detail, media, galleries, and relations. |
| Countries list | `/countries` | **Real** | `src/pages/CountriesListPage.jsx` loads and links Countries. |
| Country detail | `/countries/:countrySlug` | **Partial** | `src/pages/CountryPage.jsx` loads name/code/summary/status but is still a minimal placeholder and has no related content/media/map presentation. |
| Places discovery/list | `/explore?view=places` | **Real** | `src/pages/ExplorePage.jsx` loads, filters, maps, lists, selects, and links Places. |
| Place detail | `/places/:placeSlug` | **Partial** | `src/pages/PlacePage.jsx` loads body/summary and a map, but has no public video, gallery, hero, Story, or Route presentation. |
| Routes discovery/list | `/explore?view=routes` | **Real** | `src/pages/ExplorePage.jsx` loads, filters, maps, lists, selects, and links Routes. |
| Route detail | `/routes/:routeSlug` | **Real** | `src/pages/RoutePage.jsx` loads route metadata, accepted geometry, waypoint itinerary, and selectable Segments. |
| Tours | `/tours/:tourSlug` only | **Placeholder** | `src/pages/TourPage.jsx` renders `RoutePlaceholder`; there is no public Tours list route. |
| Events | `/events/:eventSlug` only | **Placeholder** | `src/pages/EventPage.jsx` renders `RoutePlaceholder`; there is no public Events list route. |
| Videos | `/videos/:videoSlug` only | **Placeholder** | `src/pages/VideoPage.jsx` renders `RoutePlaceholder`; no public Videos list route exists. |
| Partners | None | **Absent** | No public Partner route/page/navigation entry. |
| About | `/about` | **Placeholder** | `src/pages/AboutPage.jsx` renders `RoutePlaceholder`. |
| Contact | `/contact` | **Placeholder** | `src/pages/ContactPage.jsx` renders `RoutePlaceholder`. |

## 2. Public Navigation

`src/shared/layout/AppShell.jsx` defines the current primary links: Stories, Places, Routes, Countries, About, and Contact. Places and Routes both target `/explore` with `view=places` or `view=routes`; Explore remains the underlying discovery page rather than separate `/places` and `/routes` list routes.

Active state is pathname-based for Stories, Places, Routes, Countries, About, and Contact. On `/explore`, the query parameter selects Places; any other Explore view resolves to Routes. Links receive both `is-active` and `aria-current="page"` when active.

Tours and Events have placeholder detail routes but no navigation or list pages. Videos has a placeholder detail route but no list page. Partners has neither public route nor navigation entry.

## 3. Story Frontend Readiness

| Capability | Current state |
|---|---|
| Story list | Real public list from `getPublicStories`, active filtering, published-date ordering, title/excerpt links. |
| Story detail | Real public fetch with loading, not-found, and error states. |
| Title/meta/body | Renders title, country label, published date, excerpt, and body. |
| Hero image | Renders `story.hero_image` when a usable URL exists, with alt text. |
| Videos | Resolves attached `media_ids` against the public video list and renders playable attached videos through `VideoPlayer`. |
| Image collections | Renders collection title/description and ordered images. |
| Image captions | Renders captions in figures and lightbox. |
| Public lightbox | Real `ImageLightbox` with close, previous/next, keyboard navigation, focus restore, load/error states. |
| Related routes/places | Resolves nested objects or bare slugs and links Routes and Places. Events/Tours are not presented in the public Story page. |
| Home Latest Story | `LatestContentRail` loads latest Story and `LatestStoryCard` renders hero image, title, excerpt, country/date, and link. |

**Missing presentation behavior:** no public Story list image thumbnails; no public Story display for related Events or Tours; no public Story-side editing concerns are inferred. The public Story body is rendered as supplied content without a richer structured-content renderer visible in the frontend.

## 4. Video Authoring UI Coverage

`src/features/video/ContentVideoManager.jsx` provides the same authoring pattern for the following contexts: upload a new MP4/MOV/M4V, choose an existing managed Video, attach, detach/remove, and preview. Upload uses the direct-upload helper and then creates/attaches the Video record.

| Content type | Upload new | Choose existing | Attach | Detach | Preview | Where |
|---|---:|---:|---:|---:|---:|---|
| Story | Yes | Yes | Yes | Yes | Yes | `EntityFormPage` Story branch |
| Route | Yes | Yes | Yes | Yes | Yes | `EntityFormPage` Route branch and Route Map Editor Videos panel |
| Segment | Yes | Yes | Yes | Yes | Yes | `SegmentEditor` via `ContentVideoManager` |
| Waypoint | Yes, saved Waypoints only | Yes, saved Waypoints only | Yes | Yes | Yes | `WaypointEditor` via `ContentVideoManager` |
| Place | Yes | Yes | Yes | Yes | Yes | `EntityFormPage` Place branch |
| Tour | Yes | Yes | Yes | Yes | Yes | Generic EntityForm relationship context |
| Event | Yes | Yes | Yes | Yes | Yes | Generic EntityForm relationship context |

Important UI limitation: a new Waypoint cannot attach a Video until it is saved. The generic entity form uses `video_ids`; Segment and Waypoint use route map persistence with `media_ids`.

## 5. Galleries and ImageCollections Management

The Management dashboard includes Galleries and routes to dedicated Gallery pages. `GalleryListPage` lists collections and previews; `GalleryCreatePage` creates title/description; `GalleryEditPage` edits metadata and supports:

- single and multiple image upload;
- JPEG, PNG, and WebP validation with a 10 MiB limit;
- image order changes;
- captions saved on blur;
- membership removal;
- image preview and empty/error states.

`ContentImageCollectionManager` is currently rendered only in the Story form. It supports selecting multiple existing collections, changing attached collection order, detaching collections, and selecting a Story hero image from attached images or automatic last-attached behavior. There is no equivalent image collection picker in Route, Segment, Waypoint, Place, Tour, or Event authoring. Country and Partner forms expose raw `hero_media_id`/`logo_media_id` text fields, not an ImageCollection UI.

**Confirmed gap:** Gallery deletion is present in `imageCollectionsApi.delete`, but the visible Gallery list exposes only Edit, not Delete.

## 6. Route Map Editor

The editor is `src/pages/manage/routes/RouteMapEditorPage.jsx`, entered at `/manage/routes/:routeId/map`.

| Area | Current state |
|---|---|
| Toolbar | Real Waypoints, Segments, Add video, Route status, context indicator, and panel close controls. |
| Waypoints panel | Add blank, add by map click, add from Place, select, move Up/Down, remove, and edit. |
| Waypoint editor | Type, `label`, Linked Place, latitude, longitude, video manager, Cancel, and Save. |
| Segments panel | Add, select, move Up/Down, remove, title, summary, start/end Waypoints, regenerate geometry, and save. |
| Route status | Accepted/candidate point counts, candidate distance/time, revision, Calculate candidate, and Accept candidate. |
| Route-level video | Dedicated panel using the reusable video manager. |
| Geometry | `RouteAuthoringMap` displays accepted geometry, candidate geometry, Waypoints, and Segments. Calculate and accept are wired through `routeMapApi`. |

**Dead/duplicate/incomplete controls:** `RouteMapActions` receives `showSave={false}` in the status panel, so the status panel intentionally does not expose a duplicate whole-waypoint save button; waypoint save is in `WaypointEditor`. The editor has no visible canonical Waypoint `name` field. Segment Story relationships are carried in normalization/payload (`story_ids`) but there is no Segment Story picker in `SegmentEditor`; the field is preserved rather than authorable. Segment geometry is derived/regenerated from accepted Route geometry and boundaries, not freely drawn.

## 7. Existing Waypoint Click/Edit State

Clicking an existing Waypoint in the list or map sets `selectedWaypointId`; the selected record is passed to `WaypointEditor`.

Current capabilities:

- select Waypoint: **Yes** (`WaypointList`, `RouteAuthoringMap`);
- see coordinates: **Yes** in list/editor;
- edit coordinates: **Yes**, numeric latitude/longitude fields;
- edit order: **Yes**, Up/Down list actions;
- edit Place: **Yes**, Linked Place select; selecting a Place can also populate coordinates/label when blank;
- edit name: **No**;
- edit label: **Yes**;
- attach Video: **Yes** after the Waypoint exists;
- detach Video: **Yes**;
- delete Waypoint: **Yes**, with confirmation when a Segment references it;
- save changes: **Yes**, `saveActiveWaypoint` calls `routeMapApi.updateWaypoints`.

Exact components: `WaypointList.jsx`, `WaypointEditor.jsx`, `RouteAuthoringMap.jsx`, `RouteMapEditorPage.jsx`, `routeMapUtils.js`, and `routeMapApi.js`.

## 8. Waypoint Name Gap

There is no human-readable `name` input/control. The current UI uses `label`; `normalizeWaypoint` accepts a backend `name` only as a fallback into `label`, so a canonical name cannot be preserved distinctly.

The logical location for the future field is `src/features/routes/routeMap/components/WaypointEditor.jsx`, beside `Label` and before type/Place. The owning state path is `RouteMapEditorPage.updateWaypoint`; the canonical payload is built by `buildWaypointPayload` in `routeMapUtils.js`, called by `routeMapApi.updateWaypoints` and also used by candidate calculation.

The smallest future frontend change, once the backend exposes canonical `name`, is:

1. preserve `name` in `normalizeWaypoint` and `createEmptyWaypoint`;
2. render a controlled `name` input in `WaypointEditor`;
3. include `name` in `buildWaypointPayload` and the candidate request projection;
4. include it in the waypoint signature so edits become dirty and saveable;
5. use `name` as the display fallback where the itinerary/list currently uses `label`.

No implementation was made in this audit.

## 9. Future Waypoint Metadata UI

Later, non-blocking fields can fit in the same `WaypointEditor` form and normalization/payload boundary: street/road name near coordinates, waypoint type near the existing type control, roundabout/junction as structured classification, and viewpoint/parking/trailhead as later metadata or capability controls. These are enhancements, not prerequisites for the requested name/coordinate/Place/video/order/delete/save workflow.

## 10. Segment Editor Readiness

| Capability | Current state |
|---|---|
| Add | Yes, enabled after valid saved Waypoints and accepted geometry. |
| Edit | Yes, title, summary, boundaries, and regenerated geometry. |
| Delete | Yes, with confirmation during save when persisted Segments are removed. |
| Reorder | Yes, Up/Down and contiguous-order validation. |
| Geometry | Yes, stored and derived from accepted Route geometry between boundaries; review badge supported. |
| Boundaries | Yes, start/end Waypoint selectors and ordering validation. |
| Story relationships | **Not authorable** in the editor; `story_ids` is normalized, validated, and sent back. |
| Video/media relationships | Yes, upload/existing/attach/detach/preview through `ContentVideoManager`. |

## 11. Place Frontend Readiness

Management list/create/edit/delete is provided by `EntityListPage`, `EntityFormPage`, `entityConfig`, and `managementApis`. Place authoring includes name, country, slug, summary, body, coordinates, visited date, status, map picker, and Video manager.

Public Place detail is real but partial: it renders name, country, visited date, summary/body, and a coordinate map. It does not render Place Videos, ImageCollections/hero media, related Stories, or related Routes. Explore provides Place discovery and map selection. The public `placesApi.js` and management entity API are distinct service paths, with public list/detail normalization and generic management CRUD.

## 12. Management Readiness

All requested management sections are present in `manageRouter.jsx` and the dashboard: Countries, Places, Routes, Stories, Videos, Galleries, Tours, Events, and Partners.

| Section | List | Create | Edit | Delete exposed | Completeness |
|---|---:|---:|---:|---:|---|
| Countries | Yes | Yes | Yes | Yes via generic list | Metadata CRUD; raw hero media ID only. |
| Places | Yes | Yes | Yes | Yes | Strongest place workflow; map picker and video UI. |
| Routes | Yes | Yes | Yes | Yes | Metadata/stops/video; map editor is separate. |
| Stories | Yes | Yes | Yes | Yes | Metadata, relations, video, gallery, hero selection. |
| Videos | Yes | Yes | Yes | Yes | Direct upload on create, preview on edit, location fields; attachment context is read-only on Video form. |
| Galleries | Yes | Yes | Yes | **No visible list action** | Dedicated image upload/order/caption/membership UI. |
| Tours | Yes | Yes | Yes | Yes | Generic metadata/relationship CRUD; no public presentation. |
| Events | Yes | Yes | Yes | Yes | Generic metadata/relationship CRUD; no public presentation. |
| Partners | Yes | Yes | Yes | Yes | Management-only generic CRUD; no public page. |

## 13. Public Media Rendering Matrix

This table records only visible public UI, not management/API capability.

| Content type | Public Video | Public ImageCollection | Public hero image |
|---|---:|---:|---:|
| Story | **Yes** | **Yes** | **Yes** |
| Route | No | No | No |
| Segment | No separate public media UI | No | No |
| Waypoint | No separate public media UI | No | No |
| Place | No | No | No |
| Tour | No, placeholder detail | No, placeholder detail | No, placeholder detail |
| Event | No, placeholder detail | No, placeholder detail | No, placeholder detail |

Home renders a playable latest Video card and a Story card with its hero image, but that is not a general public Video detail/list or a media renderer for every content type.

## 14. Authoring Matrix

| Content type | Video upload | Video choose existing | Video attach/detach | Video preview | Select ImageCollection | Image attach/detach | Hero selection |
|---|---:|---:|---:|---:|---:|---:|---:|
| Story | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Route | Yes | Yes | Yes | Yes | No | No | No |
| Segment | Yes | Yes | Yes | Yes | No | No | No |
| Waypoint | Yes after save | Yes after save | Yes | Yes | No | No | No |
| Place | Yes | Yes | Yes | Yes | No | No | No |
| Tour | Yes | Yes | Yes | Yes | No | No | No |
| Event | Yes | Yes | Yes | Yes | No | No | No |

## 15. API Helper Coverage

| Area | Frontend coverage | Finding |
|---|---|---|
| Stories | `src/services/storiesApi.js` plus generic management API | Public list/detail and management CRUD are separate and both used. |
| Routes | `src/services/routesApi.js` plus `routeMapApi.js` | Public route list/detail and management route-map operations are present. |
| Waypoints | `routeMapApi.js` | No standalone helper; waypoint operations are nested under routes and share route-map normalization. |
| Segments | `routeMapApi.js` | Nested route helper with dedicated normalize/build payload functions. |
| Places | `src/services/placesApi.js` plus generic management API | Public service requires bare-array list response; management service accepts array/results. |
| Videos | `src/services/videosApi.js`, `videoUploadApi.js`, and direct `apiClient` calls in `ContentVideoManager`/`EntityFormPage` | There is duplicated direct management-video fetching/serialization rather than one shared management video helper. |
| ImageCollections | `imageCollectionsApi.js` plus `imageCollectionUtils.js` | Dedicated CRUD/upload/membership helper; membership payload serialization is centralized in `toImageMembershipPayload`. |

Obvious mismatch: public Stories resolve `media_ids` by fetching the full public Video list because there is no public Video-by-ID helper. `ContentVideoManager` separately normalizes managed video records and uses direct `apiClient` requests. These are working patterns but duplicated serialization/lookup logic.

## 16. Confirmed Dead/Legacy Frontend Code

Confirmed current legacy/stub surfaces only:

- `RoutePlaceholder` is still used by About, Contact, Video, Tour, and Event public pages, and by the Not Found page; the first five are placeholder public experiences.
- `src/services/eventsApi.js` and `src/services/toursApi.js` still import local `src/data/events.js` and `src/data/tours.js`; the public pages do not use them.
- No old management sidebar/navigation is mounted: `ManageLayout` renders only the management content outlet.
- No separate old Route inspector is confirmed by the current mounted route editor.
- No separate duplicate public gallery/video architecture is confirmed; `ContentVideoManager` and `ContentImageCollectionManager` are the active reusable authoring components.
- No stale Story inline gallery creation flow is confirmed; Story uses the dedicated Gallery manager/picker.

## 17. Frontend Gap Summary

### Blocking authoring gaps

- Canonical waypoint `name` cannot be edited or saved distinctly from `label`.
- Segment Story relationships are preserved but not authorable in `SegmentEditor`.
- Gallery deletion is implemented in the helper but not exposed in the Gallery list UI.
- ImageCollection authoring is Story-only; other content types have no image selection/attachment/hero UI.

### Public presentation gaps

- About and Contact are placeholders.
- Country detail is minimal and lacks related content/media/map presentation.
- Place detail lacks public Video, ImageCollection, hero, Story, and Route relations.
- Route detail lacks public Route-level, Segment-level, and Waypoint-level Video/ImageCollection rendering.
- Tour and Event have placeholder detail pages and no list pages.
- Video has no public list or detail implementation.
- Partners have no public route/page.
- Public Stories do not show related Events/Tours.

### Map editor gaps

- Waypoint `name` field/payload support is absent.
- Segment Story relationship editing is absent.
- Segment geometry is generated from accepted Route geometry rather than directly authored.
- There is no public media presentation tied to selected Route Segments or Waypoints.

### Later enhancements

- Street/road name, waypoint classifications, roundabout/junction, viewpoint, parking, and trailhead metadata.
- Reverse-geocoded labels.
- Dedicated public Tours, Events, Videos, and Partners discovery/detail experiences.

## 18. Specific Waypoint Recommendation

The requested current workflow is nearly present. Once the backend exposes canonical `name`, the smallest frontend change is localized to the route-map model boundary: add `name` to waypoint normalization/defaults, add a controlled `name` field in `WaypointEditor`, include it in `buildWaypointPayload` and candidate calculation, include it in dirty-state signatures, and prefer it in list/itinerary labels. Existing coordinate, Place, media, order, delete, and save controls can remain in place.

The later road/street, waypoint type expansion, roundabout/junction, and reverse-geocoded labels should remain separate follow-up work.

## Final Summary

1. **Can fully author today:** Countries, Places, Route metadata/stops, Stories with Video/ImageCollection/hero relationships, Videos with direct upload and metadata, Tours, Events, Partners, Galleries, and Route map Waypoints/Segments/geometry workflow. Segment Story relationships and canonical Waypoint name are exceptions.
2. **Fully displays publicly today:** Home hero/latest rail, Story list/detail/media/relations, Countries list, Route/Place discovery, Place detail basics/map, and Route detail map/itinerary/Segments. Public detail for Video/Tour/Event and rich Country/About/Contact/Partner presentation is not complete.
3. **Video authoring coverage:** upload, choose existing, attach, detach, and preview are available for Story, Route, Segment, saved Waypoint, Place, Tour, and Event contexts.
4. **ImageCollection coverage:** management CRUD/upload/order/captions/membership is real; Story is the only content type with collection selection, attach/detach, and hero selection.
5. **Exact Waypoint editor state:** existing Waypoints can be selected, coordinate-edited, Place-linked, label-edited, reordered, video-managed, deleted, and saved. No canonical name field exists.
6. **Can waypoint name be edited today?** No.
7. **Smallest change:** add canonical `name` through `normalizeWaypoint`/draft state, `WaypointEditor`, `buildWaypointPayload`, candidate payload, dirty signature, and display fallback.
8. **Dependency order:** expose canonical Waypoint name; wire the smallest Waypoint editor/payload change; add Segment Story relationship UI; expose Gallery delete; generalize ImageCollection/media presentation; build public Video/Tour/Event/Partner surfaces; then add later waypoint metadata.

## Requested Finish Report

- **Audit path:** `docs/.audit/OFFWARD_FRONTEND_CONTENT_READINESS_AUDIT.md`
- **Story frontend readiness:** Real and strong for public text, hero, galleries, captions, lightbox, videos, routes, places, and Home Latest Story; missing public Event/Tour relation rendering.
- **Route frontend readiness:** Real for discovery, detail map, itinerary, Segments, management metadata, route-level video, and map authoring; missing public media rendering and some relationship authoring.
- **Segment frontend readiness:** Add/edit/delete/reorder/boundaries/derived geometry/video are present; Story relationship editor is absent.
- **Waypoint frontend readiness:** Selection, coordinates, order, Place, label, video, delete, and save are present; canonical name is absent.
- **Video authoring coverage:** All seven requested contexts are covered, with saved-record prerequisite for Waypoints.
- **ImageCollection coverage:** Dedicated management and Story attachment/hero workflow only.
- **Public-site gaps:** Placeholder About/Contact/Video/Tour/Event, absent Partners, minimal Country detail, and missing public media for non-Story types.
- **Management gaps:** Gallery delete not exposed, non-Story image authoring absent, Segment Story picker absent, and Waypoint name absent.
- **Waypoint-name UI state:** No distinct name field or payload property today; `name` is only collapsed into `label` as a normalization fallback.
- **Smallest frontend change needed:** the localized waypoint model/editor/payload/signature update described above once backend support exists.
- **Next frontend tasks:** canonical name workflow, Segment Story picker, Gallery delete action, broader image/media presentation, then public Tours/Events/Videos/Partners and later waypoint metadata.
- **Application code changed:** No. Only this audit report is to be created/updated.
