# OFFWARD_INFORMATION_ARCHITECTURE

## Status
Locked.

## Purpose
This document defines the canonical information architecture of Offward: the core entities that exist in the platform and how they relate.

## Core Entities

### Country
Top-level exploration hub.

Examples:
- Bosnia
- Ireland
- Spain

A Country is not a product.

A Country can contain or relate to Places, Routes, Stories, Videos, Tours, Events/Expeditions, and Partners.

### Place
A real location users can discover.

A Place may:
- appear on a map
- belong to one or more Routes
- have photos or videos
- be referenced by Stories
- be part of a Tour or Event

Examples:
- Muckross Abbey
- Torc Waterfall
- Bihać
- Šator Lake

### Route
An ordered journey or path connecting Places.

A Route may:
- belong to a Country
- contain ordered Waypoints
- contain saved geographic path data
- contain ordered Route Segments
- reference canonical Places independently from its routing points
- have attached media
- be used by Tours
- be used by Events/Expeditions

A Place may belong to multiple Routes.

### Route Waypoint
An ordered geographical point used to create and shape a Route.

A Route Waypoint:
- belongs to exactly one Route
- contains coordinates and an explicit order
- may optionally reference a canonical Place
- may represent a start, via point, stop, or finish

A routing point is not automatically a Place. This prevents route construction from polluting the Place catalogue with technical points.

### Route Segment
An ordered, selectable section of a Route.

A Route Segment:
- belongs to exactly one Route
- contains the geometry for its approximate section of road or path
- may connect two Route Waypoints
- may surface related Videos, Stories, notes, or other media
- may be highlighted independently while its related content is active

Route Segments are not independent public destinations in v1. Their parent Route remains the canonical detail page.

### Story
Editorial or narrative content.

A Story may reference:
- Countries
- Places
- Routes
- Tours
- Events/Expeditions
- Videos

Stories remain independent content entities.

### Video
Reusable media content.

A Video may:
- stand alone
- attach to a Place
- attach to a Route
- attach to a Story
- attach to a Tour
- attach to an Event/Expedition

Media must not be owned exclusively by one content type.

### Tour
A joinable experience.

A Tour:
- belongs to a Country
- may use one or more Routes
- may include one or more Places
- may have Stories and Videos
- may accept direct enquiries

Tours are optional and do not define a Country.

### Event / Expedition
A time-based activity that may be upcoming, active, or completed.

An Event/Expedition:
- belongs to a Country
- has a status
- may contain Routes
- may contain Places
- may generate Stories
- may generate Videos
- may involve Partners

Examples:
- Spain Expedition 2027
- Bosnia Biker Season

### Partner
A sponsor, collaborator, local business, tourism organization, media partner, or other external participant.

A Partner may attach to:
- Country
- Tour
- Event/Expedition

Partner relationships should remain flexible and not be hard-coded into one product type.

## Canonical Relationships

- Country has many Places.
- Country has many Routes.
- Country has many Stories.
- Country has many Videos.
- Country has many Tours.
- Country has many Events/Expeditions.
- Country may have many Partners.
- Route contains ordered Waypoints and ordered Route Segments.
- Route may reference many canonical Places.
- Place may belong to many Routes.
- Route Waypoint belongs to one Route and may optionally reference one Place.
- Route Segment belongs to one Route and may reference related media.
- Story may reference Places, Routes, Tours, Events/Expeditions, and Videos.
- Video may attach to Places, Routes, Stories, Tours, and Events/Expeditions.
- Tour belongs to a Country and may use Routes and Places.
- Event/Expedition belongs to a Country and may contain Routes, Places, Stories, Videos, and Partners.
- Partner may attach to a Country, Tour, or Event/Expedition.

## Map Principle
The map is a presentation layer over Places and Routes.

The map is not a separate content silo and does not own canonical content.

Places provide canonical location data.
Routes provide saved GeoJSON path data.
Route Waypoints provide ordered route-building points.
Route Segments provide selectable, media-linked sections of a Route.
The map renders and connects those entities.

## Country Hub Principle
**Country is the main exploration hub. Content and experiences live under or relate to countries, but they remain independent entities.**

Examples:

### Ireland
Ireland
- Killarney
- Muckross Abbey
- Killarney Loop
- Story
- Video

### Bosnia
Bosnia
- Biker Tour
- Route
- Places on route
- Route videos
- Stories

### Spain
Spain
- Spain Expedition 2027
- Expedition route
- Visited Places
- Stories
- Videos

## Media Principle
**Media is reusable and attachable; it must not be owned by only one content type.**

A single video may be related to several entities without duplication.

## Independence Principle
Entities should remain independently addressable and reusable.

A Place is not embedded permanently inside one Route.
A Route is not owned by one Tour.
A Video is not owned by one Story.
A Country is not a product.

This independence is required for future API-backed content, maps, filtering, search, reuse, and expansion.
