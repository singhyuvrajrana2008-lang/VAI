# RidgeWatch — Flash-Flood Risk Intelligence for Hilly Regions

> Catchment-level monitoring and experimental risk assessment for hilly regions, starting with Himachal Pradesh.

**Status:** working local prototype with a visibly labelled demo dataset. **Not an operational warning service.** Never use this software to decide whether to evacuate or as a replacement for official IMD, district administration, CWC or disaster-management instructions.

- **Live external data sources wired:** 0
- **Verified catchment geometry:** none (demo rectangles only, labelled `DEMO SYNTHETIC`)
- **Trained / evaluated model:** none. No precision, recall, lead time or calibration is claimed.
- **Durable persistence / authenticated history:** not wired (migration is prepared)

Read `docs/DATA_FEASIBILITY_REPORT.md` before treating any provider as usable.

## Branch and integration status

This work lives on `feat/ridgewatch-full-mvp`, branched from `main`. It **integrates the content of the two open foundation PRs** — #4 (`feat/backend-foundation`) and #5 (`feat/ridgewatch-frontend`) — rather than duplicating them. Review and merge this branch first; merging #4 or #5 afterwards would conflict on the same paths. No PR exists for this branch yet (created and pushed from a cloud workspace without PR permissions).

## What actually works

| Area | State |
| --- | --- |
| FastAPI backend + OpenAPI schema | Working |
| Map-first overview, catchment inspector | Working with demo fixtures |
| Catchments list, search, detail with provenance | Working |
| Rainfall page: observed vs forecast separation, chart, provenance table | Working (demo records) |
| Official warnings page: chronological log, expired validity, unavailable ≠ all-clear | Working (demo fixtures; no authority feed) |
| Experimental assessment + evidence report with reason codes | Working (transparent baseline) |
| Data health matrix + configuration presence | Working |
| Methodology / evaluation status | Working, explicitly "not evaluated" |
| Login, signup, forgot/reset password, callback, sign-out | Implemented against Supabase Auth, **unverified without a Supabase project** |
| History / subscriptions | Honest unavailable state; no fake saves |
| Google Maps basemap | Optional; labelled schematic fallback without a key |
| Supabase persistence | **Not wired.** Migration + RLS exist; API reports memory-only storage |

## Repository layout

```
backend/                 FastAPI app, schemas, baseline, provider abstraction, pytest
frontend/                React + TypeScript + Vite, zod-validated API client, Vitest
supabase/migrations/     Initial schema, RLS policies (no duplicate migration added)
scripts/                 check_env.py (configuration doctor), dev.sh, dev.ps1
docs/                    PRD, architecture, data sources, feasibility, evaluation
.github/workflows/ci.yml Backend tests + frontend typecheck/tests/build
```

## Prerequisites

- Python 3.11+ (verified on 3.12.3)
- Node.js 20+ (verified on 24.21.0 with npm 11)
- No accounts or API keys required for the demo

## Quick start

### Windows PowerShell

```powershell
git clone https://github.com/singhyuvrajrana2008-lang/VAI.git
cd VAI
git checkout feat/ridgewatch-full-mvp
powershell -ExecutionPolicy Bypass -File scripts/dev.ps1
```

Or manually in two terminals:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:RIDGEWATCH_MODE="demo"
python -m uvicorn app.main:app --reload --port 8000
```

```powershell
cd frontend
npm install
npm run dev
```

### macOS / Linux

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
RIDGEWATCH_MODE=demo uvicorn app.main:app --reload --port 8000
```

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**. API docs: **http://127.0.0.1:8000/docs**.

The Vite dev server proxies `/api` to `127.0.0.1:8000`, so browser requests stay same-origin. Override the proxy target with `VITE_DEV_API_TARGET` if you run the API elsewhere.

### Configuration doctor

```bash
python scripts/check_env.py                 # presence report, no values printed
python scripts/check_env.py --check-api     # also probe a running API
```

## Environment variables

Copy the examples, never edit source to add credentials:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

| Variable | Runtime / file | Required | Effect when set | Effect when empty |
| --- | --- | --- | --- | --- |
| `VITE_API_BASE_URL` | frontend `.env.local` | no (default `/api/v1`) | Absolute API root for split hosting | Uses the dev proxy |
| `VITE_GOOGLE_MAPS_API_KEY` | frontend `.env.local` | no | Google Maps basemap | Labelled schematic fallback, no invented map |
| `VITE_SUPABASE_URL` | frontend `.env.local` | for auth | Supabase Auth client initialises | Auth pages explain configuration; demo access only |
| `VITE_SUPABASE_ANON_KEY` | frontend `.env.local` | for auth | Same | Same |
| `RIDGEWATCH_MODE` | backend `.env` | no (default `demo`) | `demo` serves labelled fixtures; `live` serves none | Defaults to `demo` |
| `RIDGEWATCH_ENVIRONMENT` | backend `.env` | no | Label shown in `/health` | `development` |
| `CORS_ORIGINS` | backend `.env` | no | Comma-separated allowed browser origins | localhost / 127.0.0.1 on 3000 and 5173 |
| `SUPABASE_URL` | backend `.env` | no | Health reports auth/persistence as configured | Reports unavailable |
| `SUPABASE_ANON_KEY` | backend `.env` | no | Auth presence indicator | — |
| `SUPABASE_SERVICE_ROLE_KEY` | backend `.env` | no | Persistence presence indicator only | — |

`SUPABASE_SERVICE_ROLE_KEY` is a **secret** and is never sent to the browser, never logged and never returned by an endpoint. There is no `VITE_` variant of it; the doctor script warns if one appears.

A configured key does not prove a working provider. API enablement, key restrictions, billing, quotas and redirect allowlists are separate console steps.

## Demo walkthrough (no keys)

1. **Overview** — two demo catchments. Sector A ends with a heavy 3-hour rainfall window, sector B with light rainfall. Both display `DEMO` strips, synthetic-geometry labels and "not a validated watershed boundary".
2. **Run experimental assessment** — Sector A returns `high`, Sector B `low`/`moderate`; the score stays `null` (no numeric index exists), reason codes name the threshold and freshness rules, and coverage shows supporting inputs that are absent.
3. **Open evidence report** — every input, provider, timestamp, reason code, attached warning record and disclaimer is listed.
4. **Rainfall** — observed bars and forecast bars are separated, axes are labelled `mm/h` and UTC, missing hours are drawn as gaps rather than zeros, and the underlying records are in a table.
5. **Official warnings** — the log states plainly that no provider is configured and that the records are synthetic, with validity windows marked expired or current.
6. **Data health** — rainfall/forecast/warnings are `DEMO`; river stage, soil moisture, terrain and persistence are `UNAVAILABLE`; no row claims verification.
7. **Methodology** — the 3-hour thresholds are shown with "developer-set, unevaluated"; evaluation metrics are explicitly absent.
8. **Login / history** — without Supabase the auth page explains what is missing and offers the demo dashboard; no fake user is created.

Switch the API to `RIDGEWATCH_MODE=live` and reload: the registry becomes empty and every source row reads `unavailable`. That is intentional — live mode never serves fixtures.

## Assessment logic (baseline v0.1)

Transparent rainfall accumulation only:

1. Read observed rainfall for the catchment.
2. Find the latest **contiguous** 3-hour window (a gap breaks the window; gaps are not zero-filled).
3. Sum the window in mm.
4. Map the sum to a documented band: `≥100` very_high, `≥60` high, `≥25` moderate, else low.
5. Missing rainfall → `insufficient_data`. Stale rainfall → `insufficient_data`. Incomplete window → `degraded`.
6. `score` is always `null`; `score_semantics = categorical_only_no_calibrated_index`.

Forecast, river stage and soil moisture are tracked as supporting inputs and are never silently treated as present. Warnings are evidence attached to the record, never model inputs.

## Tests and checks actually run

Backend (from `backend/`, Python 3.12.3):

```bash
python -m pytest -q
python -m compileall -q app tests
```

Result: **33 passed**, compile check passed. Covers demo labelling, live-mode emptiness, 404/422/413/429 handling, request IDs, CORS allow/deny, warning-unavailable semantics, missing/stale/gap rainfall, provider timeout and exception sanitisation, bounded stores.

Frontend (from `frontend/`, Node 24.21.0):

```bash
npm run typecheck
npm test
npm run build
```

Result: typecheck passed, **26 tests passed** (formatting, redirect safety, GeoJSON projection, API error/schema handling, plus 8 jsdom rendering tests that mount the overview, warnings, data-health, evidence, auth and not-found pages against mocked API responses and click through an assessment), production build succeeded.

Manual HTTP verification against the running dev servers: health, catchments, observations/proxy, assessment bands, warnings, sources, CORS preflight, unknown-host rejection (403), SPA deep routes (200). A real browser run was **not possible** — Chromium requires system libraries that cannot be installed without root in this environment — so pixel layout, keyboard traversal and live Supabase sign-in remain unverified (see `docs/DATA_FEASIBILITY_REPORT.md`).

## Supabase setup (when you are ready)

The browser only needs the project URL and anon/publishable key. The API needs the URL and service-role key for any future privileged work.

1. Create a Supabase project.
2. Apply `supabase/migrations/0001_initial_schema.sql` in the SQL editor (or `supabase db push`). It enables PostGIS, creates tables, enables RLS and adds owner-scoped policies. It does not create demo rows and does not grant broad client writes.
3. Authentication → URL Configuration:
   - Site URL: `http://localhost:3000` for local work (use your deployed origin in production)
   - Redirect URLs: `http://localhost:3000/auth/callback`, `http://localhost:3000/reset-password`
4. Authentication → Providers → Email: enable it. If "Confirm email" is on, sign-up shows the pending-verification state until the link is used. Configure your own SMTP for reliable delivery.
5. Fill the frontend and backend env files, restart both processes, then verify with `python scripts/check_env.py --check-api`.
6. Two-user isolation check (manual, required before trusting private data): create users A and B, confirm each can read only their own `profiles`, `assessments` and `catchment_subscriptions` rows and that anon access returns nothing.

**Not yet done:** the API does not write assessments to Supabase and `/api/v1/history` returns `503 persistence_unavailable`. The frontend shows that limitation instead of pretending history was saved.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| "API could not be reached" | Backend not running, wrong `VITE_API_BASE_URL` (default expects the dev proxy), or port mismatch |
| Catchment list empty | `RIDGEWATCH_MODE=live` with no verified catchment. Use demo mode for fixtures |
| Map shows a schematic, not a basemap | `VITE_GOOGLE_MAPS_API_KEY` missing, invalid, or the key is not enabled for Maps JavaScript API / this origin |
| Auth pages say "not configured" | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` missing at build time; restart Vite after editing `.env.local` |
| History returns 503 | Expected: persistence is not wired |
| Google Maps 403 | Restrict the browser key to your origin; enable Maps JavaScript API and billing |

## Deployment notes

- Build the frontend with `npm run build` (static `dist/`), host on a static host or CDN.
- Run the API with a production ASGI server (for example `uvicorn app.main:app --host 0.0.0.0 --port 8000` behind a reverse proxy).
- Set `CORS_ORIGINS` to the exact frontend origin; never use a wildcard with credentials.
- Set `VITE_API_BASE_URL` to the deployed API root including `/api/v1` at build time.
- Health check: `GET /api/v1/health` returns 200 plus configuration presence. It does not imply provider availability.
- Keep provider credentials and the service-role key in the platform's secret store.
- No deployment was performed from this environment.

## Safety and limitations

Operational warnings require regional validation, representative historical event labels, calibration, false-alarm and lead-time testing, provider agreements and review by the relevant authorities. A plausible dashboard is not evidence of reliability. RidgeWatch never issues evacuation instructions, never invents observations or warnings, and never converts missing data into zero rainfall or low risk.

See `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATA_SOURCES.md`, `docs/DATA_FEASIBILITY_REPORT.md`, `docs/EVALUATION.md`, `docs/AGENT_TASK_MATRIX.md` and `AGENTS.md`.
