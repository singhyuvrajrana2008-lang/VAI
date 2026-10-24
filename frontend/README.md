# RidgeWatch frontend

React 19 + TypeScript + Vite operations interface for the RidgeWatch research prototype. No live values, warnings or geometry are bundled.

## Run

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

The dev server proxies `/api` to `http://127.0.0.1:8000` so the browser stays same-origin (also works behind a remote preview). Override with `VITE_DEV_API_TARGET`.

## Environment

Copy `.env.example` to `.env.local` (ignored by Git):

| Variable | Effect |
| --- | --- |
| `VITE_API_BASE_URL` | API root including `/api/v1`. Default `/api/v1` uses the dev proxy |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional browser key. Without it a labelled schematic fallback is shown — never an invented map |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Enable Supabase Auth. Without them auth pages explain configuration; demo browsing still works |

These are public. Never add a service-role key or any `VITE_`-prefixed secret.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Public entry: Explore Demo, Sign in, Create account, honest prototype scope |
| `/overview` | Map-first console: source strip, catchment inspector, warnings separate from assessment |
| `/catchments`, `/catchments/:id` | Registry with search, provenance and validation |
| `/rainfall` | Observed vs forecast, chart with units/UTC/gaps, provenance tables |
| `/warnings` | Chronological official-warning log; unavailable is not an all-clear |
| `/assessments` | Assessments issued by this API process, explicitly not private history |
| `/assessments/new` | Run the baseline |
| `/assessments/:id` | Full evidence report |
| `/data-health` | Dense capability matrix and configuration presence |
| `/methodology` | Baseline rules, unvalidated thresholds, evaluation status |
| `/history` | Account-scoped; sends the session bearer token; handles 401/503 honestly |
| `/settings` | Real account actions and presence-only configuration |
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback` | Supabase Auth flows; no simulated user |
| `*` | Not-found with a safe route back |

## Checks

```bash
npm run typecheck
npm test
npm run build
```

Last verified (Node 24.21.0): typecheck passed, **31 tests passed** (21 unit + 10 jsdom page-rendering tests), production build succeeded. Real-browser check: `node scripts/browser_qa.mjs` from the repo root (dev server on :3000, `npx playwright install chromium`) walks 17 routes at 1440 px and 360 px, verifies titles, headings, phone-width scrolling, keyboard focus, the assessment flow and API outage/500 error states — last run reported 0 defects. The rendering tests mock the API, mount the real pages with React Query and the router, and exercise the landing entry points, assessment click path, assessments list scope warning, warning semantics, auth configuration state and 404 routing. Bearer-token forwarding for assessments and history is unit-tested.

## Data honesty rules encoded in the UI

- Observed and forecast records are never merged into one total.
- Missing hours render as chart gaps; there is no zero-fill.
- A null score is displayed as "not a numeric index", never as zero risk.
- Assessment panels are labelled EXPERIMENTAL; warnings are a separate region with their own source hierarchy.
- Demo fixtures display DEMO at strip, catchment, warning and assessment level.
- Buttons either perform a real request or are absent; no inert save controls.
