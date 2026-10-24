# RidgeWatch Gap Audit

Audit date: 24 October 2026. Branch: `feat/ridgewatch-gap-closure` (from `feat/ridgewatch-full-mvp`).
Baseline before changes: backend **33 passed**, frontend typecheck/build passed, **26 tests passed**. After this pass: backend **54 passed**, frontend **31 passed**, typecheck and production build pass, headless-browser QA **0 defects**.

Legend: **working** (verified locally), **partial** (implemented but a dependency is unverified), **blocked** (external access/credentials), **missing** (not built).

| Area | Status before | Evidence | Fix made | Remaining issue |
| --- | --- | --- | --- | --- |
| Repository / run mode | working | Both servers ran; `/api/v1/health` reported demo | Verified again after changes | None |
| Public welcome / entry page | missing | `/` rendered the operations overview directly | Added `/` landing with Explore Demo, Sign in, Create account, live config status and explicit prototype limits; console moved to `/overview` | None |
| Console navigation | partial | Nav pointed at `/`; no page titles | Rail points to `/overview`, added Public home; document titles per route | None |
| Overview dashboard | working | jsdom test clicks through assessment | Kept; verified after route change | None |
| Catchments list/detail | working | Rendered from demo registry | Kept | Demo geometry only |
| Rainfall page | working | Verified chart/provenance render | Kept | Demo records only |
| Official warnings | working | Unavailable ≠ all-clear tested | Kept | No authority provider |
| Assessments list | missing | Only a request form and evidence page existed | Added `GET /api/v1/assessments` and `/assessments` list with explicit process-memory scope; request form moved to `/assessments/new`; listing is disabled (403) in live mode | Records are not durable or private |
| Assessment evidence | working | jsdom test traces inputs/reasons | Kept | None |
| Data health | working | Matrix renders demo/unavailable | Updated persistence wording for implemented-but-unverified | No live connectors |
| Methodology | working | "Not evaluated" is explicit | Kept | No evaluation possible without labels |
| History | blocked (503) | Endpoint deliberately refused | Implemented owner-scoped history via verified Supabase token + PostgREST, with 401/503 handling; UI sends bearer token and handles expiry | **Not verified against a live Supabase project** |
| Persistence | missing | No database code | Added isolated `SupabaseGateway` (token verification, write, owner-scoped read), typed rows, metadata round-trip, sanitised failures, mocked HTTP tests | Unverified live; two-user RLS check is scripted (`scripts/rls_isolation_check.py`) but has not run against a real project |
| Subscriptions | missing | Not implemented | **Not added** — would require unverified writes and a working persistence path | Blocked on verified persistence |
| Auth pages | partial | Login/signup/recovery/callback/demo fallback existed | Added page titles, `/overview` post-auth fallback, 401 session-expired state on history | Live Supabase flow not executed |
| Safe redirects | working | Internal-only validation + tests | Default fallback changed to `/overview`; tests updated | None |
| Page titles | missing | Single static title | Per-route titles in shell, landing and auth | None |
| Figma Make export | blocked | No export in workspace, repo or provided files | Documented in `docs/FIGMA_INTEGRATION.md`; completed the VAI frontend instead | Owner must supply the export to merge it |
| Data connectors | blocked | 0 connectors; docs unreachable without credentials | Updated feasibility evidence; no invented endpoints | Provider access/keys required |
| Evaluation / ML | blocked | No event labels | No model added; methodology states "not evaluated" | Historical labels required |
| CI | working | Workflow runs backend + frontend checks | Still passes; test counts updated | Not executed on GitHub from this environment |
| Browser QA | blocked | Chromium system libraries unavailable; no root | **Unblocked:** Playwright Chromium installed; missing `.deb` libraries and fontconfig extracted into the home directory; `scripts/browser_qa.mjs` walks 17 routes, both widths, keyboard focus, the assessment flow and simulated API outage/500 | **0 defects** after fixes; live Supabase sign-in still not browser-tested (no credentials) |
| Secret hygiene | working | Environment scan clean; build contains only env-var names in UI copy | Re-scanned after changes | None |

## Defects found and fixed during this pass

1. `safeRedirect` fell back to `/`, which after the landing-page change would send signed-in users to the public entry instead of the console — fallback is now `/overview` and tests cover it.
2. The navigation shell had no public entry point once `/` became standalone; added a "Public home" link.
3. Assessment links assumed `/` was the overview; verified all console routes return 200 under the new pathless shell.
4. Persistence failures could have been silent; the API now returns `persisted=false` with `supabase_write_failed` / `supabase_verify_failed` and never claims a write succeeded.
5. History previously could be fetched without a token; the implemented endpoint now returns 401 without a verified bearer token and never accepts a user id from the client.
6. Signed-in users were not sending their token when requesting an assessment, so persistence could never trigger. The console now forwards the session token, and a missing/expired token still yields an honest 401 rather than an anonymous success.
7. The process-memory assessment list would have exposed live-mode records to every caller; it now returns 403 outside demo mode.

### Found by headless-browser QA in the continuation pass

8. `/methodology` overflowed at 360 px: the threshold table's 480 px `min-width` widened the single-column grid track, clipping page content. Fixed with `minmax(0, 1fr)` plus `min-width: 0` on the grid children; the table still scrolls inside `.table-scroll`.
9. The 404 route had no document title and no `<h1>` (it renders outside the shell that sets titles). Fixed with `useDocumentTitle` and a screen-reader heading.
10. Assessment-detail and catchment-detail routes fell back to the generic `RidgeWatch` document title. The shell now maps id-bearing paths to their own titles.

## Explicit non-claims

- No third-party data connector is live.
- No model is trained, calibrated or evaluated.
- No Supabase persistence or auth flow has been executed against a real project.
- No subscription feature is implemented.
- No deployment or PR was created from this environment.
