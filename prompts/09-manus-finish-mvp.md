# MANUS MASTER BUILD PROMPT — FINISH RIDGEWATCH MVP IN SHARED GITHUB REPO

You are the lead full-stack engineer, data integration engineer, geospatial engineer, and model-feasibility owner for RidgeWatch. Do real implementation work, not just an architecture plan. Aim for a focused build pass of about 30 minutes if your environment allows, and continue until the highest-value end-to-end vertical slice is implemented, tested, documented and pushed. Do not stop at a summary.

## 0. Shared repository is mandatory

Repository:
https://github.com/singhyuvrajrana2008-lang/VAI

Read these files before work:
- `AGENTS.md`
- `README.md`
- `project-manifest.json`
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_SOURCES.md`
- `docs/EVALUATION.md`
- `docs/AGENT_TASK_MATRIX.md`
- `supabase/migrations/0001_initial_schema.sql`
- `backend/README.md`
- Open PR #4: https://github.com/singhyuvrajrana2008-lang/VAI/pull/4

Figma owns frontend code under `frontend/`. You own `backend/`, source/data/ML feasibility docs and integrations. Coordinate shared API changes; don't edit or overwrite Figma-owned files except the agreed API client contract documentation.

## 1. GitHub execution rules

- Connect the existing VAI repository through the Manus GitHub connector; do not create another repository.
- Inspect the state of PR #4 before editing. It contains a backend foundation branch `feat/backend-foundation` and reports tests passing. Preserve its work; do not recreate the backend scaffold.
- If you can update PR #4 safely, continue on its existing branch and keep the PR focused. If you need to create a follow-up branch, use `feat/ridgewatch-backend-data`, base it on the latest main plus the existing backend foundation as appropriate, and explain the merge order.
- Pull/merge the latest `main` safely before changes; never force-push or discard work.
- Commit and push actual code to VAI and open/update a PR. A task report without a pushed branch is not complete.
- Do not merge into main or claim that PR approval is done unless that action actually occurs.
- If GitHub connection is not configured, tell the project lead exactly which Manus connector/permission to enable and produce a patch; never claim a push succeeded.

## 2. Objective and definition of “finished”

Deliver a runnable, integrated MVP—not a production-certified flood-warning service.

A completed MVP should:
1. Start the FastAPI backend.
2. Serve typed API contracts the frontend can consume.
3. Show verified catchment/source state.
4. Integrate at least one real, tested source if access is available and permitted; otherwise clearly state the blocked connector and preserve an honest DEMO path.
5. Make no invented live measurements or warnings.
6. Return an experimental assessment only when inputs are sufficient; otherwise return insufficient_data/degraded.
7. Persist supported data through Supabase when credentials/configuration are available; operate without pretending persistence works when they are absent.
8. Include a tested frontend integration contract and setup instructions.
9. Include data feasibility and ML evaluation documentation.
10. Build and test what can be tested in the current environment.

Do not promise a 90+ prediction score or operational reliability without evaluation.

## 3. Phase A — complete data feasibility first

Create `docs/DATA_FEASIBILITY_REPORT.md` with an evidence-backed source matrix.

Investigate:
- IMD API: https://api.imd.gov.in/public/api_reference.html
- NASA GPM IMERG: https://gpm.nasa.gov/data/imerg
- Copernicus DEM GLO-30: https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- CWC / India-WRIS / state/local river-stage or gauge sources if their access is verified.
- Soil moisture source with realistic spatial resolution and cadence.
- Reliable historical flash-flood event labels with source/date/region and label definition.

For each source, report:
- Exact product/endpoint and intended variable.
- Documentation evidence vs actual tested request/data download.
- Authentication/access restrictions.
- Unit, CRS, pixel/station resolution, geographic footprint.
- Observation timestamp, issue time, fetch time, update cadence and latency.
- History available for the pilot period.
- License/attribution/caching constraints.
- Missingness, reliability and known failure modes.
- Connector state: VERIFIED LIVE / PARTIAL / DEMO / UNAVAILABLE / NOT TESTED.

Do not claim an endpoint works just because its documentation exists. Do not put credentials in the repository.

### Pilot catchment
Recommend a feasible pilot catchment in Himachal Pradesh only on the evidence of actual source coverage, terrain data, catchment boundary quality and historical event-label availability. State what is known and uncertain. If no feasible catchment is demonstrated, make no invented “best catchment” claim and use an explicit DEMO sample only for UI testing.

### Important latency rule
Rainfall products with hours of latency, or reprocessed/final products, must not be represented as minute-level real-time observations. Separate near-real-time, delayed/reprocessed and static data.

## 4. Phase B — finish the backend scaffold without rewriting it

Inspect the existing `backend/` files and tests on the PR #4 branch before modification.

Keep the current FastAPI/Pydantic structure, API route contracts and provider registry if they remain valid. Extend carefully.

Implement or verify:
- `GET /api/v1/health`
- `GET /api/v1/catchments`
- `GET /api/v1/catchments/{id}`
- `GET /api/v1/catchments/{id}/observations`
- `GET /api/v1/catchments/{id}/warnings`
- `POST /api/v1/catchments/{id}/assessments`
- `GET /api/v1/sources/status`

Make sure OpenAPI schema and examples accurately reflect actual behaviour. Unknown catchments return a controlled 404. Invalid time ranges return 422. All provider failures are handled without returning fake records.

Implement a shared normalized observation model with:
- provider/source ID,
- variable/value/unit,
- observed_at or issued_at,
- fetched_at,
- valid_from/valid_to when relevant,
- geographic coverage,
- freshness/source state,
- quality flags,
- is_demo.

If a provider doesn't supply a field, keep it null/unknown rather than inventing one.

## 5. Phase C — integrate data sources conservatively

Prioritise an integration you can genuinely test in the current environment. Start with the highest-value available official weather/rainfall source after verifying credentials, terms and responses. Build static terrain processing only if a valid DEM is available.

Requirements:
- Implement timeouts, bounded retries and sane caching.
- Normalise units and timestamps in tested code.
- Store provenance with each response.
- Add a health/status result for each provider.
- Preserve source-native timestamps and metadata.
- Expose stale/partial/unavailable/error state to frontend.
- Do not block the entire dashboard because one optional provider failed.
- Do not convert missing rainfall to 0 mm.
- Do not show no warning merely because the warnings endpoint failed.
- Keep live records separate from labelled demo fixtures.

If no credentials exist, finish a provider adapter and tests with mocked HTTP responses, describe how to configure it, and mark it NOT TESTED or UNAVAILABLE. Do not say it is live.

## 6. Phase D — Supabase integration and authentication

Use the migration in `supabase/migrations/0001_initial_schema.sql` as the starting point. Review its tables and RLS before modifying it.

### Auth/account support
- Support the frontend's Supabase Auth flows: email/password sign-up and sign-in, email verification state, password reset/recovery, session persistence and sign-out.
- Keep Supabase Auth as the identity provider; do not create a separate password table or store raw passwords.
- Document `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or the current publishable key) for the browser client. These are the only Supabase credentials that may be exposed in the frontend.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. Never expose it through a `VITE_` variable, logs, commits or client responses.
- If backend endpoints use a service-role client, validate the caller's Supabase access token and enforce ownership/authorization server-side before reading or writing user-specific rows. Never trust a client-supplied user ID.
- Protect user-specific assessment history, subscriptions and profiles. Keep public catchment/source reads separate from private account data.
- Keep/extend the `profiles.id` foreign key to `auth.users(id)` and ensure profile/subscription/history RLS policies enforce `auth.uid()` ownership. Add migrations incrementally; don't weaken RLS to make the UI easier.
- If Auth credentials/configuration are absent, the app must remain usable in clearly labelled demo mode without creating a fake authenticated identity. Explain which sign-in features are unavailable.

Minimum persistence requirements:
- Catchment reference records.
- Source observation snapshots.
- Official warnings.
- Assessment results/reason codes.
- Optional user subscriptions/history.

Requirements:
- Use Supabase PostgreSQL/PostGIS only where configured.
- Server-side service-role credential only.
- Never expose service-role keys in frontend env variables or logs.
- Add/adjust migrations incrementally; do not drop existing data.
- Enforce row-level security for user-specific rows.
- Add tests or a documented manual test to show one user cannot read another user's private history.
- If Supabase credentials aren't configured, the API must still run in local/demo mode and clearly report persistence as unavailable.



Use the migration in `supabase/migrations/0001_initial_schema.sql` as the starting point. Review its tables and RLS before modifying it.

Implement the minimum persistence needed:
- Catchment reference records.
- Source observation snapshots.
- Official warnings.
- Assessment results/reason codes.
- Optional user subscriptions/history.

Requirements:
- Use Supabase PostgreSQL/PostGIS only where configured.
- Server-side service-role credential only.
- Never expose service-role keys in frontend env variables or logs.
- Add/adjust migrations incrementally; do not drop existing data.
- Enforce row-level security for user-specific rows.
- Add tests or a documented manual test to show one user cannot read another user's private history.
- If Supabase credentials aren't configured, the API must still run in local/demo mode and clearly report persistence as unavailable.

## 7. Phase E — baseline and ML feasibility (former Claude work; you own it)

First define the target, geographic unit, lead time/prediction horizon and prediction cutoff. A catchment risk product must have a clear definition of what event it aims to anticipate.

Start with a transparent, versioned heuristic only when necessary inputs and thresholds can be justified. Do not invent thresholds that look scientific; document any provisional/illustrative rule and label it experimental.

Only train supervised ML if the data feasibility report proves:
- adequate independent historical events and non-event samples,
- consistent event labels and locations,
- features available at the prediction time,
- time coverage and geographical representativeness.

If viable:
- compare persistence/rainfall-threshold baseline before logistic regression or gradient boosting;
- do not default to LSTM;
- use chronological and event-level holdout, spatial holdout where practical;
- avoid leakage from future observations, post-event products or warning text that reveals the outcome;
- report event-level precision/recall, PR-AUC where appropriate, false alarms per catchment-day, lead time, input coverage and calibration only if done;
- include counts and limitations.

If labels are inadequate, do not pretend a trained model exists. Produce the feasibility report and a transparent insufficient-data baseline.

## 8. Phase F — Google Maps + frontend API integration

Figma owns frontend implementation in `frontend/`. Coordinate by reading the existing or incoming frontend files before editing shared contract docs.

Provide a clear integration contract:
- `VITE_API_BASE_URL` for the frontend.
- `VITE_GOOGLE_MAPS_API_KEY` for the browser (restricted by referrer and APIs).
- Backend-only environment variables documented in `.env.example`, with no real secret values.
- GeoJSON uses WGS84 coordinates and [longitude, latitude] order at the API boundary.
- Catchment geometry must include its source/validation state.
- UI receives DEMO/LIVE/stale/unavailable flags.
- Official warnings and model assessments are separate response sections.

Google Maps is only for display/navigation/interaction, not the source of rainfall or flood measurements. If the Google Maps key isn't provided, document the required key and allow the frontend to render a clear map-unavailable fallback or existing open map alternative. Don't log the key or add private provider credentials.

## 9. AI integration (optional and constrained)

If using Gemini:
- only provide a validated structured assessment and source-backed evidence;
- generate a short explanation of reason codes and missing inputs;
- do not allow the model to change the numerical risk score, classify missing data as safe, invent official warnings or generate unsupported evacuation orders;
- show a deterministic backend result even if Gemini fails;
- log provider and model/version metadata without sensitive data.

Skip AI integration if it delays the core runnable vertical slice.

## 10. Testing, security and operational hygiene

Run:
- `pytest -q` for backend tests,
- `python -m compileall -q app tests`,
- frontend build/typecheck if accessible,
- OpenAPI smoke test,
- API edge-case tests for missing data, stale data, invalid time range and source errors,
- Supabase/RLS test if the configured project is available.

Do not report tests as passed if you did not run them. Add tests for:
- stale source cannot yield falsely low risk,
- missing source does not become zero,
- unavailable warning feed is not interpreted as an all-clear,
- demo flag propagates correctly,
- provider timeout/failure,
- timestamp and unit handling,
- source health and schema validation.

Security:
- never commit secrets,
- restrict CORS rather than wildcarding credentials,
- validate inputs,
- use bounded external requests,
- keep logs free of tokens,
- review dependency versions and known limitations.

## 11. GitHub push and final deliverables

You must finish with actual commits/pushes to the existing VAI repository, not merely paste code into chat.

Deliver:
1. Backend implementation with actual tests.
2. `docs/DATA_FEASIBILITY_REPORT.md`.
3. Verified source adapter(s), or explicit test/not-tested/unavailable status where blocked.
4. Supabase persistence/RLS if credentials allow; otherwise precise setup and honest unavailable status.
5. Baseline/evaluation code only if data supports it.
6. API/README environment setup matching implementation.
7. Commit(s) on the existing backend PR branch or a scoped follow-up branch.
8. Update/open a PR and give the exact URL.
9. State what is genuinely LIVE, DEMO, unverified or incomplete.
10. Provide a one-command local start path and demo walkthrough.

Do not claim the entire system is “finished” if Figma's frontend hasn't landed. Instead report the backend is ready for frontend integration and list the exact remaining cross-component steps.

## 12. Work plan — keep moving

First 5 minutes: inspect repo/PR #4 and test current backend.
Next 8 minutes: implement the feasibility report and choose the first connector.
Next 10 minutes: extend backend, source-health/observations and persistence where credentials allow.
Next 5 minutes: tests, frontend contract, README setup.
Final 2 minutes: commit/push/update PR and report actual status.

If an external credential or dataset blocks a feature, complete the safe, tested fallback and document the blocker rather than wasting the entire session. Prioritise a coherent end-to-end product over many untested features.