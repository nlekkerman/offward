# Responsive Management Lists - Implementation

Date: 2026-11-15

## Scope and implementation

Frontend-only changes based on executable source. No existing Markdown documentation
or previous audits were read.

At viewport widths of 760px and below, management table rows become vertically
stacked cards. Every existing field has a visible label above its unchanged value.
Above 760px, the existing desktop table styling and layout remain unchanged.

The implementation reuses the existing tables rather than rendering a second
mobile record tree. Shared CSS supplies the existing dark surfaces, gold labels,
borders and rounded corners. Food retains its existing red create-button accent.

### Coverage

| Management list | Existing record information retained |
| --- | --- |
| Routes | Title, country/flag, activity type, status |
| Places | Name, country/flag, status, visited date |
| Stories | Title, country/flag, publication date, status |
| Food | Title, country/flag, food type, status, publication date |
| Videos | Title, provider, duration, publication date, status |
| Countries | Name/flag, code, status |
| Tours | Title, country/flag, enquiry availability, status |
| Events | Title, country/flag, lifecycle status, start date, status |
| Partners | Name, website, status |
| Messages | Sender name, sender email, subject, category, status, created date |
| Galleries | Existing preview, title, image count, created date and Edit link |

Galleries already used cards; on mobile their grid now has one column, wrapping
copy and touch-sized actions. Message filters also collapse to one column.
The Statistics daily-activity table is analytics, not a record-management list,
and is intentionally unchanged. Embedded form/relationship editors are unchanged.

## Files changed

- `../../src/features/management/EntityListPage.jsx`: shared list scope, mobile
  field/action labels and explicit table accessibility roles/column scopes.
- `../../src/pages/manage/contactMessages/ContactMessagesListPage.jsx`: equivalent
  labels and table semantics for Messages.
- `../../src/pages/manage/galleries/GalleryListPage.jsx`: shared mobile list scope.
- `../../src/index.css`: shared, scoped responsive card rules.

137 added source lines (including modified replacement lines), below the 450-line
limit. No new components, dependencies, API calls or record fields.

## Behavior and accessibility

- Existing values, formatting, country flags and publication statuses are reused.
- Titles, email addresses and URLs wrap without truncation.
- Edit/Delete actions wrap within the card; Open and gallery Edit remain accessible.
- Mobile list buttons have a minimum width and height of 44px.
- Table headers remain available to assistive technology through visual clipping;
  explicit table roles preserve semantics when CSS changes the display layout.
  Mobile labels are hidden from assistive technology to avoid duplicate headers.
- API integration, permission guards, links, event handlers, message filters,
  catalog pagination/retry, loading/error/empty states and deletion confirmation
  logic are unchanged.
- The backend Route deletion error was not investigated or changed.

## Verification

- Targeted ESLint on all three modified JSX files: passed.
- Editor diagnostics for all four modified source files: no errors.
- `git diff --check`: passed.
- Source/diff review confirmed configured list fields and existing action handlers
  remain intact; responsive layout rules are limited to the mobile media query.
- No tests or builds were run, as requested. Browser rendering, touch interaction
  and screen-reader behavior have not been runtime-verified.
