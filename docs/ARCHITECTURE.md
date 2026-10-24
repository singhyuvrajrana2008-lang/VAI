# RidgeWatch Architecture

## 1. System boundaries

- **Frontend:** React 19 + TypeScript + Vite. Owns navigation, map/schematic display, user input, status presentation and charts. It never computes a risk band.
- **API backend:** Python 3.12 + FastAPI. Owns provider access, validation, freshness eligibility, the deterministic baseline, provenance and server-side secrets.
- **Data pipeline:** not implemented. No scheduled fetcher runs; no observation table is populated.
- **Risk engine:** deterministic rainfall-accumulation baseline v0.1. No trained model exists.
- **Supabase:** schema and RLS are in `supabase/migrations/0001_initial_schema.sql`. A server-side gateway (`app/services/supabase.py`) verifies caller tokens and reads/writes assessments; it is **implemented but unverified against a live project**.
- **Google Maps:** optional basemap/interaction only. Never a hydrology source.
- **LLM:** not integrated. No AI explanation path exists.

## 2. Request flow (implemented)

1. Frontend selects a catchment (URL query `?catchment=<id>`), so state is shareable and reload-safe.
2. React Query requests the catchment registry, observations, warnings and source status independently; one failing section does not blank the dashboard.
3. Backend resolves the catchment from its registry. Demo mode exposes two synthetic fixtures; live mode exposes none.
4. Responses carry provider, units, observation/issue/fetch timestamps, coverage, quality flags, `source_state` and `is_demo`.
5. A requested assessment runs the baseline over those records. The result is kept in a bounded in-process store and returned with coverage, inputs, reason codes and a disclaimer.
6. Frontend renders official warnings and the experimental assessment in visually and semantically separate regions.
7. No LLM narrative is generated.

## 3. Status vocabulary

- Assessment: `low`, `moderate`, `high`, `very_high`, `insufficient_data`, `degraded`, `unavailable`.
- Source: `live`, `stale`, `unavailable`, `error`, `demo`, `partial`.
- Every response includes `is_demo`. A demo response is never described as live.
- `status=low` is only returned when a complete 3-hour rainfall window exists. It is an experimental band, not a safety guarantee.

## 4. Implemented API (prefix `/api/v1`)

| Method | Path | Behaviour |
| --- | --- | --- |
| GET | `/health` | Service status plus **presence-only** configuration report (demo mode, persistence, auth, external sources). No credential values. |
| GET | `/catchments` | Registry with geometry state, provenance, validation status and `is_demo`. Empty in live mode. |
| GET | `/catchments/{id}` | Single catchment; 404 when absent from the registry. |
| GET | `/catchments/{id}/observations?from=&to=` | `observed` and `forecast` arrays are separate; `items` is the union; `units`, `source_state`, `is_demo`, explanatory `message`. Invalid range → 422. |
| GET | `/catchments/{id}/warnings` | Chronological records with provider, severity, issue/valid times, geography, optional `source_url`, `provider_configured` and a message that never implies an all-clear. |
| POST | `/catchments/{id}/assessments` | Body `{}` or `{"requested_at": "<ISO-8601 with timezone>"}`. Returns band, null score, coverage, inputs, reason codes, attached warnings, storage mode and disclaimer. Rate limited; oversized body → 413. |
| GET | `/assessments` | Assessments issued by this API process, newest first, with `scope=api_process_not_user_owned` and a warning that they are not private history. Query `limit` 1–100. |
| GET | `/assessments/{id}` | In-process retrieval; 404 with an explanation once the API restarts. |
| GET | `/sources/status` | Capability matrix: provider, configured, state, verification, timestamps, units, flags, message. Demo rows are distinct from unavailable rows. |
| GET | `/history` | Owner-scoped history. Returns 503 when persistence is unconfigured, 401 without a valid bearer token, 200 with the caller's own assessments. |

Not implemented: subscriptions, ingestion, provider connectors. No endpoint accepts a client-supplied user ID.

## 5. Assessment contract (implemented)

```json
{
  "assessment_id": "uuid",
  "catchment_id": "demo-sector-a",
  "status": "high",
  "score": null,
  "score_semantics": "categorical_only_no_calibrated_index",
  "model_version": "rainfall-accumulation-baseline-v0.1",
  "issued_at": "2026-10-24T16:35:00Z",
  "is_demo": true,
  "data_coverage": {
    "required_inputs": 1,
    "available_inputs": 1,
    "missing": [],
    "stale": [],
    "supporting_missing": ["river_stage", "soil_moisture"]
  },
  "reason_codes": [
    "RAINFALL_3H_AT_OR_ABOVE_60MM",
    "ACCUMULATION_WINDOW_3H",
    "DEMO_FIXTURE_INPUTS",
    "THRESHOLD_BASELINE_NOT_EVALUATED"
  ],
  "inputs": [
    {
      "variable": "rainfall",
      "label": "Observed rainfall",
      "value": 31.2,
      "unit": "mm",
      "provider": "RidgeWatch synthetic demo fixture",
      "included": true,
      "reason": "DEMO_FIXTURE_INPUT"
    }
  ],
  "sources": [],
  "warnings": [],
  "persisted": false,
  "persistence": "memory",
  "disclaimer": "Experimental research output..."
}
```

Values above are illustrative of the demo fixture, not live data. The score is `null` by design: only a documented, calibrated model may return a numeric index.

**Baseline rules:** required input is observed rainfall (freshness 3 h). Latest contiguous 3-hour window is summed; a gap breaks the window. Thresholds: ≥100 very_high, ≥60 high, ≥25 moderate, else low. Missing → `insufficient_data`; incomplete window → `degraded`. Supporting inputs (forecast, river stage, soil moisture) are recorded but do not alter the band.

## 6. Normalised record contract

Observation: `source_id`, `provider`, `variable`, `value`, `unit`, `observed_at`/`issued_at`, `fetched_at`, `valid_from`/`valid_to`, `geographic_coverage`, `freshness`, `source_state`, `quality_flags`, `is_demo`.

Timestamps are UTC ISO-8601 internally; the UI labels its display timezone (UTC) explicitly. Source-native values are preserved alongside normalised ones; no unit conversion is performed in this build.

## 7. Frontend architecture

Routes: `/` public entry page; `/overview` map console; `/catchments`, `/catchments/:id`, `/rainfall`, `/warnings`, `/assessments`, `/assessments/new`, `/assessments/:id`, `/data-health`, `/methodology`, `/history`, `/settings`; auth routes `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`; `*` not-found. The console uses a pathless layout route so its paths stay top-level.

- `lib/api.ts` — single typed client: base URL, 12 s timeout via `AbortController`, safe error normalisation (status, code, request id), zod validation of every response.
- `lib/schemas.ts` — runtime contract mirroring the Pydantic schemas.
- `lib/auth.tsx` — Supabase client created only when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist; session restore, auth-state subscription with cleanup, sign-in/up/out, recovery, password update. No fake session.
- `lib/hooks.ts` — catchment selection from the URL; queries keyed by catchment id so switching cannot show another catchment's cached data.
- `components/` — status pills, state panels, map/schematic, chart, assessment panel, auth guard.
- `pages/` — one composition per task (map console, dense registry, chronological log, editorial report, dense health matrix, branded auth).
- `main.tsx` — React Query client with one retry; error boundary at the router.

## 8. Authentication and data access boundary

- Supabase Auth is the only identity provider. Browser configuration is limited to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- The service-role key is server-only. It is used only after the caller's access token has been verified through Supabase Auth (`GET /auth/v1/user`). The resulting user id — never a request body or query value — scopes every read and write.
- Persistence writes the full assessment contract into typed columns plus `metadata.assessment`, so history reconstructs exactly what was issued. `catchment_id` is null for slug-based demo catchments; the slug remains in metadata.
- Public demo browsing requires no account. Account pages (`/history`) require a verified session via `RequireAuth`; a signed-out visitor is redirected to `/login` with a validated internal `from` path, never an external URL.
- A missing token on `/history` is 401; an unconfigured persistence layer is 503; neither falls back to a shared or anonymous view.
- Without Supabase configuration, account routes render a configuration state instead of redirecting, preventing loops.
- RLS policies in the migration scope `profiles`, `assessments` and `catchment_subscriptions` to `auth.uid()`. There are no public write policies on regional data tables.
- **Not implemented:** subscriptions and ingestion. Persistence/token verification are implemented but not verified against a live Supabase project.

## 9. Failure handling (implemented)

| Condition | Behaviour |
| --- | --- |
| Provider timeout / exception | `ProviderResult` returns `error`, sanitised message and `PROVIDER_TIMEOUT` / `PROVIDER_ERROR`; no internal exception text leaves the process |
| Missing rainfall | `insufficient_data`, `score=null`, `INSUFFICIENT_REQUIRED_INPUTS` |
| Stale rainfall | `insufficient_data`, `STALE_REQUIRED_INPUTS` (never low) |
| Gap in series | `degraded`, `INCOMPLETE_ACCUMULATION_WINDOW` |
| Warning provider absent | `source_state=unavailable` + explicit message; never "no warnings" |
| Assessment store restart | `GET /assessments/{id}` returns 404 with a persistence explanation |
| API unreachable | Frontend shows a retryable disconnected panel; no fake success |
| Unexpected exception | Sanitised 500 `{detail, code, request_id}`; internal error logged without secrets |
| Oversized body | 413 `payload_too_large` |
| Request burst | 429 with retry guidance |

## 10. Security posture

- CORS is an explicit origin allowlist from `CORS_ORIGINS`; no wildcard, `allow_credentials=False`.
- Request IDs are returned for tracing; responses set `X-Content-Type-Options: nosniff`.
- No secrets in responses, logs or the bundle. No `VITE_` variable carries a privileged key.
- The frontend validates every payload before rendering; it does not trust the backend blindly.
- External links use `rel="noreferrer noopener"`.

## 11. Known architectural gaps

1. No connector, cache, retry/backoff implementation for external data (only the provider abstraction and timeout envelope).
2. Supabase persistence and token verification are implemented but unverified; the migration is unapplied in any live project and no two-user RLS test has run.
3. No validated geometry, terrain features or ingestion pipeline.
4. No evaluation harness, because there are no labels.
5. No deployment configuration has been executed.
