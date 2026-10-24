# FIGMA MAKE MASTER BUILD PROMPT — RIDGEWATCH FRONTEND MVP

You are the product designer and frontend implementation agent for RidgeWatch. Do real implementation work, not just planning. Aim for a focused build pass of about 30 minutes if your environment allows; do not stop after generating a plan. Complete the highest-value runnable vertical slice, test it, and push the frontend work to the shared GitHub repository as a branch/PR.

## 0. Repository and GitHub: mandatory first step

The one shared repository is:
https://github.com/singhyuvrajrana2008-lang/VAI

Before creating code, read these files from the repository:
- `AGENTS.md`
- `README.md`
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_SOURCES.md`
- `docs/EVALUATION.md`
- `docs/AGENT_TASK_MATRIX.md`
- `backend/README.md` if available on the branch you connect to

Use Figma Make's **Make in your local codebase** / existing-repository workflow if it is enabled for your account. Connect the existing VAI repository; do not create a second repository or push the frontend to an unrelated repository.

Create a branch named `feat/ridgewatch-frontend` and open a PR to `main`, if the connected Figma workflow supports it. Do not directly edit `main`. Limit your code changes to `frontend/`, plus `docs/FIGMA_HANDOFF.md` if you can add handoff documentation without colliding with other work.

**If the existing-repository/local-codebase option is not available:** stop before creating a separate GitHub repository. Clearly report that limitation. Continue implementing the frontend in the current working project if possible, keep the source exportable, and provide exact steps/source export for Manus to integrate into `frontend/` in VAI. Never claim that code has been pushed to VAI unless the repository confirms it.

Before editing, report the repository and branch you are using. After editing, push/commit to the shared repository and provide the exact branch/PR URL and changed file list. Do not say you pushed if you did not.

## 1. Product objective

Build the frontend for **RidgeWatch**, a catchment-level flash-flood risk intelligence and experimental decision-support prototype for hilly regions, initially focused on a verified pilot catchment in Himachal Pradesh.

The user journey:
1. Open the app and see whether it is in LIVE or DEMO mode.
2. Select a catchment on an interactive geographic map.
3. Inspect source-backed rainfall/forecast observations, timestamps and freshness.
4. Review official warnings separately from RidgeWatch's experimental risk assessment.
5. Inspect why a result is available, degraded, unavailable or insufficient-data.
6. Open evidence/provenance and recent history.
7. Understand that experimental results are not official evacuation guidance.

Do not claim to predict every flash flood. Do not fabricate live observations, river gauges, warning records, model accuracy or probabilities. DEMO values must be visibly labelled DEMO, not buried in a tooltip.

## 2. Design direction — DO NOT generate a generic AI dashboard

Previous Figma attempts were repetitive. Treat avoiding repetition as a hard design requirement.

Create a distinctive **field-operations / hydrology intelligence** visual language:
- Warm chalk canvas: `#F4F1E8`
- White/warm paper surfaces: `#FFFEFA`
- Basalt text: `#242925`
- Forest/pine accent: `#245B45`
- Deep pine: `#17392E`
- Rainfall/cool-data accent: `#417E91`
- Caution amber: `#C77B25`
- Urgent warning red: `#B63A34`
- Muted borders: `#D8D5C9`
- Use status text and icons in addition to colour. Red must not be used as decoration.

Typography:
- **Archivo** for page titles and headings.
- **IBM Plex Sans** for body copy and UI controls.
- **IBM Plex Mono** for timestamps, source IDs, status metadata and technical figures.
- Vary sizes, line lengths, weight and contrast by information hierarchy. Do not make every heading, label and paragraph the same size/grey.
- Load fonts reliably or specify sensible fallbacks.

Explicitly avoid:
- Blue/purple gradient backgrounds.
- Generic AI sparkle iconography.
- Repeated four-card KPI grids on every page.
- Every page being the same left sidebar + three columns of rounded cards.
- Huge decorative numbers without a definition/source.
- Fake radar, fake gauges, fake river stations, invented risk scores or random trend charts.
- Placeholder text such as “Lorem ipsum” or “AI powered insight goes here”.
- Excessive rounded cards, glassmorphism or neon glow.

Use layout variety intentionally:
- Overview: map-dominant operations console, slim left rail, compact source-status strip, selected-catchment inspector.
- Catchment detail: map paired with elevation/context profile and rainfall timeline.
- Official warnings: chronological alert log with source/issued/valid times.
- Source health: dense provider matrix/table with last fetch, observation age, coverage and status.
- Assessment details: evidence-led report with reason codes, freshness and missing inputs.
- Methodology: editorial/scientific report layout with model limitations and evaluation plots.
- Settings: calm, clean form layout.
Each screen must have a distinct composition and specific explanatory text.

## 3. Technology and project structure

Build a responsive web frontend in:
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query or a simple typed API/data layer
- Lucide icons
- Google Maps JavaScript API for map display and interaction, if configured

Write it under `frontend/` because `backend/` is a sibling directory.

Use the backend API from `docs/ARCHITECTURE.md` and inspect the actual FastAPI OpenAPI schema if the backend branch is available. Proposed paths include:
- `GET /api/v1/health`
- `GET /api/v1/catchments`
- `GET /api/v1/catchments/{id}`
- `GET /api/v1/catchments/{id}/observations`
- `GET /api/v1/catchments/{id}/warnings`
- `POST /api/v1/catchments/{id}/assessments`
- `GET /api/v1/sources/status`

Do not assume a proposed route is implemented without checking. Implement one typed API client and adapt to the actual contract. Validate responses and show errors for mismatches.

Environment variables:
- `VITE_API_BASE_URL`
- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_SUPABASE_URL` (optional until Supabase Auth is configured)
- `VITE_SUPABASE_ANON_KEY` (or Supabase publishable key; browser-safe only)
- `VITE_SUPABASE_URL` (optional until Supabase Auth is configured)
- `VITE_SUPABASE_ANON_KEY` (or Supabase publishable key; browser-safe only)

Never add real credentials. Add `.env.example` only if absent or coordinate any edit. Google Maps browser keys must be restricted in Google Cloud by allowed website/referrer and enabled APIs. Do not use a backend/server key in the frontend.

If the Google Maps key is missing, do not crash: show a clear map-configuration state and a local/demo map view or a compatible open basemap if already supported. Clearly label demo geometry. Do not invent a real catchment polygon or pretend the map layer is verified.

## 4. Required screens

Implement these screens and working navigation; prioritise the first vertical slice before secondary pages.

### Authentication and account pages (required)

Build real authentication UI, not just a profile icon or a decorative login modal. Required routes:
- `/login`: email/password sign-in, validation, show/hide password, loading/error states, and a link to create an account or reset a password.
- `/signup`: account creation, password confirmation and validation, terms/privacy acknowledgement only if the project actually provides those pages/policies, and a clear email-verification-pending state when confirmation is enabled.
- `/forgot-password`: request a reset email with a safe confirmation message that does not reveal whether an email address is registered.
- `/reset-password`: accept the valid Supabase recovery session/token, validate and save the new password, and handle expired/invalid links.
- Account/profile settings: show the authenticated user's email and provide a working sign-out action; expose only preferences that actually persist.

Integration and access rules:
- Use Supabase Auth via `@supabase/supabase-js` if the dependency/service is configured. Use only the browser-safe `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or Supabase's publishable key). Never put a service-role key in frontend code or browser environment variables.
- Persist and restore the Supabase session correctly, react to auth state changes, and redirect signed-out users away from private history/subscription/profile routes. Preserve a safe return path after login.
- Do not implement your own password storage or fake successful authentication.
- If Supabase Auth is not configured, clearly mark live authentication as unavailable and offer a separate **Continue in Demo Mode** entry point. Demo mode must remain visibly DEMO, must not invent a logged-in identity, and must not imply private history/subscriptions are saved.
- Public demo dashboard access can remain available without login; prompt users to sign in only for features that need a real account.
- Include loading, invalid-input, incorrect-credentials, rate-limit/network failure, email-confirmation and expired-reset-link states. Use accessible labels, keyboard navigation and visible focus styles.
- Add the required environment variable names to `.env.example` and setup docs, with empty placeholders only.

Acceptance checks for authentication:
1. Login, signup, forgot-password and reset-password pages/routes exist and are navigable.
2. With valid Supabase configuration, sign-in/sign-out and password recovery use Supabase Auth rather than local fake state.
3. Signed-out users cannot access private account/history/subscription UI.
4. Without auth configuration, the app still opens in explicitly labelled demo mode without claiming login succeeded.

### Authentication and account pages (required)

Build real authentication UI, not just a profile icon or a decorative login modal. Required routes:
- `/login`: email/password sign-in, validation, show/hide password, loading/error states, and links to create an account or reset a password.
- `/signup`: account creation, password confirmation/validation, and a clear email-verification-pending state when confirmation is enabled.
- `/forgot-password`: request a reset email with a safe confirmation message that does not reveal whether an email address is registered.
- `/reset-password`: accept a valid Supabase recovery session/token, validate and save the new password, and handle expired/invalid links.
- Account/profile settings: show the authenticated user's email and provide a working sign-out action; expose only preferences that really persist.

Integration and access rules:
- Use Supabase Auth via `@supabase/supabase-js` if configured. Use only browser-safe `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or Supabase's publishable key). Never put a service-role key in frontend code or browser environment variables.
- Restore the Supabase session, react to auth-state changes, and protect private history/subscription/profile routes. Preserve a safe return path after login.
- Do not implement custom password storage or fake successful authentication.
- If Supabase Auth is not configured, clearly mark live authentication unavailable and offer **Continue in Demo Mode**. Demo mode must be labelled DEMO, must not invent a logged-in identity, and must not imply private history/subscriptions are saved.
- Public demo dashboard access can remain available without login; require sign-in only for features that need a real account.
- Include invalid-input, incorrect-credentials, network/rate-limit failure, email-confirmation and expired-reset-link states. Use accessible labels, keyboard navigation and visible focus styles.
- Add the required environment variable names to `.env.example` and setup docs, with empty placeholders only.

Authentication acceptance checks:
1. Login, signup, forgot-password and reset-password routes exist and are navigable.
2. With valid Supabase configuration, sign-in/sign-out and password recovery use Supabase Auth rather than local fake state.
3. Signed-out users cannot access private account/history/subscription UI.
4. Without auth configuration, the app remains usable in explicitly labelled demo mode without claiming login succeeded.

### A. Overview dashboard — `/` or `/dashboard`
- Map occupies the main canvas.
- Left navigation: Overview, Catchments, Rainfall, Official Warnings, Assessments, Data Health, Methodology, History, Settings.
- Top strip with LIVE/DEMO state, last refresh, source-health summary and selected catchment.
- Catchment search/select.
- Selected-catchment inspector with source coverage and current observation state.
- Rainfall chart with labelled units, dates and source.
- Separate Official Warnings section.
- Experimental assessment section with visible EXPERIMENTAL label.
- No fake KPIs or values. If no real data is available, show a well-designed honest empty/DEMO state.

### B. Interactive catchment map
- Google map when key configured.
- Catchment polygon display and selection from backend GeoJSON.
- Zoom, pan, reset, fit-to-catchment.
- Map legend.
- Layer toggles for catchment boundary, available rainfall/precipitation layer and any verified hazard/context layer.
- Show selected geometry's source and validation state.
- Handle no geometry and invalid geometry.
- Do not render unsupported “live river level” or “flood probability” overlays.
- Include clear map attribution.

### C. Catchment detail
- Catchment name, region and validation status.
- Rainfall time series with units and timestamps.
- Available forecast/nowcast only if backend supplies it.
- Input coverage and freshness.
- Terrain context only when a source exists.
- Link to assessment history and evidence.

### D. Official warnings
- Chronological list/table.
- Provider/source, severity, issued time, valid from/to, geographic coverage and source link when available.
- Explicit “source unavailable / no response received” state that cannot be mistaken for “no warning”.
- Official warnings visually distinct from experimental RidgeWatch assessments.

### E. Experimental risk assessment
- Status: low/moderate/high/very_high only if backend returns these, otherwise insufficient_data/degraded/unavailable.
- Score only if backend provides one; preserve its stated semantics.
- Prominent EXPERIMENTAL label.
- Show required versus available inputs, missing/stale inputs, reason codes, model/baseline version and issue time.
- Do not interpret a null score as zero risk.
- If no data are available, render insufficient-data clearly and let user inspect which sources are missing.

### F. Data health
- Table/matrix of source, capability, state, last fetch, observation/issue time, freshness, units and coverage.
- Distinguish live, partial, stale, unavailable, error and demo.
- Source timestamps should be in IBM Plex Mono.
- Allow refresh if the endpoint supports it; don't create a fake refresh animation that doesn't refetch.

### G. Assessment detail/evidence
- Source observations feeding the assessment.
- Input freshness and coverage.
- Calculation version and reason codes.
- Link to the corresponding map/catchment.
- Clear distinction between measured/source data and model interpretation.

### H. Methodology and evaluation
- Explain baseline and feature families without claiming a model is trained if it is not.
- Show only actual evaluation metrics from backend/docs.
- Display “not evaluated yet” when no results exist.
- Explain known data latency and label limitations.

### I. History and settings
- List prior persisted assessments only if backend/database supports them.
- Empty state when no history exists.
- Settings for units/time display and account preferences only when functional.
- Don't build fake controls that have no effect.

## 5. Interactions and states

Every button must work or be disabled with a clear explanation.

Implement:
- Map selection and catchment detail navigation.
- Refresh data tied to real API calls.
- Query/loading indicators.
- Retry on failure.
- Empty states.
- Loading skeletons.
- Partial data warnings.
- Stale data labels.
- Error boundaries.
- API disconnected state.
- DEMO/LIVE indicator at app level and result level.
- Responsive laptop/tablet/mobile layouts.
- Keyboard accessible navigation and visible focus styles.
- No-data and unavailable provider states.
- A clear last-updated timestamp from response metadata.

Do not use random client-side values to simulate “live” data. If deterministic demo fixtures are used, label every relevant screen DEMO and keep demo state separate from live API mode.

## 6. API integration

Create typed schemas for the API responses, following the backend contract. Do not use `any` everywhere. Handle:
- Network errors.
- 404 unknown catchment.
- 422 invalid requests.
- Empty observations.
- Unavailable warnings provider.
- Insufficient-data assessment with null score.
- DEMO responses.
- Stale data.
- Supabase persistence absent.
Use the backend error message safely and avoid rendering untrusted HTML.

## 7. Acceptance criteria

A frontend implementation is ready for PR when:
1. It installs and builds.
2. Navigation works.
3. Dashboard calls the API rather than hardcoding live results.
4. Google Maps loads when the public browser key is configured.
5. Missing map key produces a useful fallback state rather than a crash.
6. It can select a catchment from actual API data.
7. It distinguishes official warnings from model estimates.
8. Null score, missing data and stale data are displayed honestly.
9. No fake live values, fake accuracy metrics, fake warnings or fake geometries appear.
10. The UI has distinct page compositions and meaningful font/colour hierarchy.
11. It has `.env.example`, setup instructions and no committed secrets.
12. A clean build/typecheck is executed and results are reported.
13. Work is committed/pushed to `feat/ridgewatch-frontend` on VAI and a PR link is given if Figma's connected workflow supports it.
14. Login, signup, password recovery and sign-out flows are implemented; auth is real when configured, and missing config leads to an honest demo-only path.
14. Login, signup, password recovery and sign-out flows are implemented; auth is real when configured, and missing config leads to an honest demo-only path.

## 8. Work plan — do not get stuck planning

First 5 minutes: inspect repo/contracts and scaffold frontend.
Next 15 minutes: implement dashboard, map component, selected catchment panel, source states and API client.
Next 5 minutes: implement secondary pages or meaningful shells for warning log, data health and assessment detail.
Final 5 minutes: build/typecheck, fix visible issues, write handoff, push branch/PR or report the exact integration limitation.

If time is limited, complete and test the map-first dashboard and typed API integration first. Do not sacrifice correctness for more placeholder pages.

## 9. Final response must include
- Repository connected and branch used.
- PR URL or exact reason Figma could not push to existing VAI.
- Changed files.
- Actual build/typecheck commands and results.
- Environment variable names required.
- What works end-to-end vs what remains blocked by missing API keys/backend connectors.
- Screenshot or preview link where available.

Do not claim completion merely because a design preview rendered.