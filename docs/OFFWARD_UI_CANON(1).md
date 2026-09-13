# OFFWARD_UI_CANON

## Status
Locked.

## Purpose
This document defines the canonical visual and interaction direction for Offward without freezing the project into one exact visual design.

## Core Visual Direction
Offward should be:
- minimal
- cinematic
- map-first
- dark / earthy / premium
- image-led when real media exists
- restrained rather than crowded

Offward should not look like:
- an ecommerce store
- a generic travel agency
- a mass-tourism catalogue
- a dashboard overloaded with cards
- a fake content platform padded with placeholders

## Homepage Canon

### Hero
The Hero should include:
- OFFWARD brand
- short tagline
- minimal supporting copy
- one or two primary actions

The Hero should not contain excessive text.

### What's Happening
Current primary states:

- Bosnia — Bookings Open
- Ireland — Active Now
- Spain — Upcoming

These items may use country/event cards or another minimal presentation.

Country cards do not need identical actions.

Examples:

Bosnia:
`Check Tours`

Ireland:
`Explore Ireland`

Spain:
`Follow Expedition`

### Explore Map
The map is a primary visual and exploration element.

It should:
- show canonical Places and Routes
- support marker and route interaction
- lead into detail pages
- remain visually uncluttered
- avoid oversized overlays that hide the map
- begin with lightweight country/content summaries at Europe scale
- reveal country Places and Routes progressively as the user selects or zooms into a country
- avoid loading or visually emphasizing every detailed Route at once

### Latest
The homepage may surface recent real content such as:
- latest Story
- latest Video
- latest Route
- latest Place

Only content that actually exists should be shown.

### Short About
A short section should explain Offward in approximately 2–3 lines.

### Footer
Initial footer may include:
- Explore
- Stories
- About
- Contact
- active social links

## Status System
Statuses should use consistent labels.

Canonical initial labels:

```text
ACTIVE NOW
BOOKINGS OPEN
UPCOMING
COMPLETED
```

Additional statuses may be introduced later only when needed.

## Map Interaction
Canonical interaction:

```text
Marker click
→ Place preview
→ View Place

Route click
→ Route preview
→ View Route

Route selector
→ emphasize selected Route
→ subdue or hide alternatives according to context

Segment-related media selection/playback
→ highlight the associated Route section
```

Previews may surface:
- title
- short summary
- image
- video preview
- contextual metadata

The map must not be overloaded with large persistent panels.

## Contextual Map Presentation

Offward uses one reusable map system with different context-specific presentations:
- Explore may use a large Europe/country discovery map.
- Country pages show that country's available Places and Routes.
- Route pages focus on one Route and its Stops/Waypoints, Segments, and related Places.
- Story and Video pages show only their related geography.
- Place pages focus on one marker and deliberately selected nearby/related content.

A contextual map may first appear as a compact card and expand into a larger view. Expansion must preserve the active Route, marker, Segment, and relevant viewport.

## Multiple Routes in One Area

When many Routes overlap geographically:
- provide compact route selectors or another touch-friendly selection control
- strongly emphasize only the selected Route
- visually subdue, summarize, cluster, or hide other Routes based on zoom and context
- do not force all Route labels and full geometry onto the map simultaneously
- preserve clear access to each Route's canonical detail page

## Route Video Presentation

On a Route page, a selected Video may appear above or beside the map depending on viewport size.

When that Video relates to a Route Segment:
- highlight the complete associated section of the Route
- keep the rest of the Route visible but visually secondary
- remove or change the highlight when another Segment is selected
- do not imply frame-accurate vehicle position

A synchronized moving cursor is not part of v1.

## Content Cards
Content cards should normally contain:
- real image or video thumbnail when available
- title
- concise metadata
- short supporting text where useful
- one clear action

Avoid:
- multiple competing buttons
- decorative controls with no function
- excessive metadata
- fake engagement metrics

## Empty Content Rule
**If there is no real content, do not invent UI to fill the space.**

Examples:
- If there are three Stories, show three.
- If Ireland has four mapped Places, show four.
- Do not create empty sections such as `Top Destinations`, `Popular Tours`, or `Featured Experiences` unless real content exists.

## Responsive Behavior
Offward must be fully usable on mobile.

Canonical responsive rules:
- mobile-first implementation
- cards stack cleanly
- map interactions remain usable on touch devices
- no essential interaction depends on hover
- tap targets remain practical
- desktop may use wider map/detail layouts
- typography scales without overwhelming small screens
- imagery preserves useful focal areas across breakpoints

## Interaction Principle
Each UI section should have a clear purpose and primary action.

Avoid interaction for interaction's sake.

Animations, transitions, and visual effects should support orientation and atmosphere rather than distract from content.

## Content Density
Prefer fewer, stronger elements over dense interfaces.

Whitespace is intentional.

Do not fill screens purely to make the platform appear larger than it is.

## Media Principle
Use real Offward media when available.

Until sufficient material exists:
- keep layouts minimal
- avoid excessive stock imagery
- avoid pretending content already exists
- allow the site to grow naturally as Offward collects real Places, Routes, Stories, and Videos

## Commercial UI
Offward does not use ecommerce patterns in v1.

Do not introduce:
- price cards
- cart
- checkout
- payment buttons
- artificial urgency counters

Tour actions should use enquiry-oriented language such as:
- Check Tours
- Ask About Joining
- Enquire
- Contact

## Locked Principle
**Real content first. Minimal UI around it.**

The interface should make Offward feel active and credible without pretending the platform is larger or more commercial than it currently is.
