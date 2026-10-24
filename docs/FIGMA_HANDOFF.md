# RidgeWatch frontend handoff

## Visual system

RidgeWatch uses a field-operations language: warm paper surfaces, instrument-like readouts, restrained square borders and dense provenance metadata. Official warnings and experimental assessments never share status semantics.

### Tokens

- Colour: chalk `#F4F1E8`, paper `#FFFEFA`, basalt `#242925`, pine `#245B45`, deep pine `#17392E`, rainfall `#417E91`, amber `#C77B25`, urgent red `#B63A34`, border `#D8D5C9`.
- Type: Archivo for headings; IBM Plex Sans for body/controls; IBM Plex Mono for timestamps, IDs and technical state.
- Status colour is always paired with a text label and dot/icon. Red is reserved for unavailable/error or source-backed urgent warning states.
- Operational surfaces use square or minimally rounded edges; no glass or decorative gradients.

## Page notes

1. Overview is map-dominant with one compact status strip and selected-catchment inspector.
2. Catchment and rainfall routes remain honest capability states until verified geometry/observations exist.
3. Official warnings use a chronological log and explicitly distinguish no provider response from no warning.
4. Assessments preserve null score, score semantics, version, input coverage and reason codes.
5. Data health uses a dense provider matrix rather than KPI cards.
6. Methodology uses an editorial report layout and displays not evaluated when metrics do not exist.
7. History and settings do not expose fake persistence or inert preferences.

## Responsive behavior

- Desktop: 224px fixed rail; map and 330px inspector.
- Tablet: 190px rail; map stacks above inspector; secondary matrix columns collapse.
- Mobile below 760px: horizontal navigation and single-column reading order with visible focus states.

## Map contract

Google Maps is loaded only when `VITE_GOOGLE_MAPS_API_KEY` is present. Catchment geometry comes exclusively from backend GeoJSON. The data layer fits to returned geometry and reports malformed/no geometry. When key or geometry is absent, the configuration state remains visible; no plausible substitute polygon is drawn. Use a browser key restricted by allowed web referrer and enable only the Maps JavaScript API.

## Implemented frontend (24 October 2026)

All routes below exist and render real states: public landing, overview, catchments, catchment detail, rainfall, warnings, assessments list, assessment request, assessment evidence, data health, methodology, history, settings, login, signup, forgot password, reset password, auth callback and a not-found page.

- Auth is wired to Supabase only when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist. Without them the auth pages show a configuration state and the demo dashboard stays available. There is no simulated login.
- Without `VITE_GOOGLE_MAPS_API_KEY`, the map region renders a clearly labelled **schematic** projection of the API geometry ("not a basemap"), never a fabricated basemap or boundary.
- The demo state appears in a persistent top strip, on catchment rows, on warning records and on assessment panels.
- Verified locally: typecheck, 31 tests (including jsdom page-rendering tests) and a production build, plus headless-Chromium QA (`scripts/browser_qa.mjs`) over 17 routes at 1440 px and 360 px with 0 defects: document titles, `<h1>`s, no horizontal page scrolling at phone width, a visible keyboard focus ring, the assessment flow through to the evidence report, and recoverable error panels under simulated API outage and API 500. Supabase sign-in and provider-backed states remain unverified (no credentials).

## Data-state contract

Loading, disconnected, empty, stale, partial, error, DEMO and LIVE states use explicit text. Refresh invalidates real TanStack Query requests. Zod validates runtime responses against the backend branch contract. No demo observation value, warning, score, metric, timestamp or geometry is bundled in the frontend.
