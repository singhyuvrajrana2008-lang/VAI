# RidgeWatch Architecture

## 1. System boundaries
- Frontend: React + TypeScript. Owns navigation, map display, filters, user input, status presentation and visualization.
- API backend: Python + FastAPI. Owns provider connectors, validation, feature aggregation, risk calculation, provenance and server-side secrets.
- Data pipeline: scheduled or on-demand fetchers normalise observations and store source metadata.
- Risk engine: transparent baseline first; trained model is optional and gated on data feasibility.
- Supabase: PostgreSQL/Auth/Storage; enable PostGIS for catchment geometry and RLS for private rows.
- Google Maps: basemap, place navigation and user interaction only. It is not a rainfall or river data source.
- Optional Gemini: grounded narrative from a validated structured result only.

## 2. Request flow
1. User selects catchment and requests current conditions.
2. Frontend calls the FastAPI endpoint with catchment ID and requested time horizon.
3. Backend retrieves cached/verified observations or performs a bounded provider request.
4. Connectors normalise units and timestamps while preserving source metadata.
5. Backend checks freshness, geographic coverage, missing inputs and source health.
6. If eligible, baseline/model calculates an experimental status and reason codes; otherwise status is insufficient_data or degraded.
7. Backend writes a snapshot and assessment when persistence is enabled.
8. Frontend renders observations, official warnings and experimental risk separately.
9. Optional narrative generation receives only the structured result and may not change numeric fields.

## 3. Shared status vocabulary
Assessment status: low, moderate, high, very_high, insufficient_data, degraded, unavailable. Use only statuses supported by the chosen baseline/model, and do not assume low means safe.

Source state: live, stale, unavailable, error, demo, partial.

Every response includes is_demo boolean. A demo response must never be described as a live observation.

## 4. API contract (initial proposal)
- GET /api/v1/health — backend and connector health; not a proxy for source accuracy.
- GET /api/v1/catchments — catchment IDs, names, geometry reference and validation state.
- GET /api/v1/catchments/{id} — metadata and selected geometry.
- GET /api/v1/catchments/{id}/observations?from=&to= — source-aware observations.
- GET /api/v1/catchments/{id}/warnings — official warnings from configured providers.
- POST /api/v1/catchments/{id}/assessments — request an experimental assessment.
- GET /api/v1/assessments/{id} — retrieve a saved assessment.
- GET /api/v1/sources/status — source health and data freshness.
- GET /api/v1/history — authenticated user's assessment history.
- POST /api/v1/subscriptions — create/update a catchment subscription when enabled.

These paths are proposed contracts. If implementation changes them, update this document, typed frontend clients and tests together.

## 5. Example assessment response
{
  "assessment_id": "uuid",
  "catchment_id": "pilot-catchment",
  "status": "insufficient_data",
  "score": null,
  "score_semantics": "not_calibrated",
  "model_version": "baseline-v1",
  "issued_at": "ISO-8601 timestamp",
  "is_demo": true,
  "data_coverage": {
    "required_inputs": 4,
    "available_inputs": 2,
    "missing": ["river_stage", "soil_moisture"],
    "stale": []
  },
  "reason_codes": ["INSUFFICIENT_REQUIRED_INPUTS"],
  "sources": [],
  "warnings": []
}

Example only; values above must never be hardcoded as live data. Use null if an input is unavailable. Do not infer a low-risk state from missing values.

## 6. Normalised observation contract
An observation should include:
- source_id and provider
- variable and value
- unit
- observed_at or issued_at
- fetched_at
- valid_from and valid_to where relevant
- geometry/catchment coverage
- source_state and is_demo
- quality flags and raw-source reference where permissible

Use UTC ISO-8601 timestamps internally. Convert to display timezone only in the UI. Preserve source-native timestamp and units in provenance.

## 7. Database responsibilities
Supabase is the persistence layer, not the main compute engine. Use PostGIS for geometry storage and spatial queries where enabled. Server-side ingestion can write to source-observations tables. Authenticated frontend users may read/write only rows allowed by RLS. Provider credentials and service-role keys must remain server-only.

## 8. Caching and freshness
- Cache data according to source update cadence and terms.
- Every cached response preserves observation time and fetch time.
- Expose cache age and source freshness in the API.
- Never make an old observation look current by updating fetched_at without a new fetch.
- Keep the official warning's issue/validity timestamps distinct from RidgeWatch assessment time.

## 9. Failure handling
- Provider timeout: show source unavailable; do not substitute invented zero rainfall.
- Partial response: return available values plus explicit missing fields and status.
- Stale source: mark stale and apply input eligibility policy.
- Invalid geometry or units: reject and log a sanitised error.
- Supabase outage: show persistence unavailable; do not pretend history was saved.
- LLM failure: preserve the actual assessment; hide the generated explanation or use a fixed factual template.
- All demo responses carry is_demo=true at the API boundary.

## 10. Security
- Never expose Supabase service-role key or provider secrets to frontend.
- Restrict browser Google Maps keys by website and API.
- Use RLS and test with two users.
- Validate inputs and payload size.
- Use rate limits on externally triggered source requests.
- Do not log sensitive tokens.
- Keep data licensing/retention decisions documented.
