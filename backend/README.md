# RidgeWatch backend

FastAPI service for the RidgeWatch research prototype. Decision support only — not an official warning service and not evacuation guidance.

## Run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
RIDGEWATCH_MODE=demo uvicorn app.main:app --reload --port 8000
```

Windows PowerShell:

```powershell
$env:RIDGEWATCH_MODE="demo"
python -m uvicorn app.main:app --reload --port 8000
```

API docs: `http://127.0.0.1:8000/docs`, schema: `/openapi.json`, health: `/api/v1/health`.

## Configuration

Copy `.env.example` to `.env` (ignored by Git). Server-only values:

| Variable | Default | Effect |
| --- | --- | --- |
| `RIDGEWATCH_MODE` | `demo` | `demo` serves labelled synthetic fixtures; `live` serves no catchments and reports every source unavailable |
| `RIDGEWATCH_DEMO_FIXTURES_ENABLED` | `true` | Set `false` to keep demo mode but serve an empty registry |
| `RIDGEWATCH_ENVIRONMENT` | `development` | Reported in `/health` |
| `CORS_ORIGINS` | localhost:3000/5173 | Exact origin allowlist, comma separated |
| `RIDGEWATCH_PROVIDER_TIMEOUT_SECONDS` | `5` | Timeout used by provider adapters |
| `RIDGEWATCH_ASSESSMENT_RATE_LIMIT_PER_MINUTE` | `30` | Per-client assessment requests per minute |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` | empty | Enable token verification and persistence when set; the gateway is implemented but unverified live |

Never expose the service-role key to a browser. `/health` returns presence strings only.

## Endpoints

- `GET /api/v1/health`
- `GET /api/v1/catchments`
- `GET /api/v1/catchments/{id}`
- `GET /api/v1/catchments/{id}/observations?from=&to=`
- `GET /api/v1/catchments/{id}/warnings`
- `POST /api/v1/catchments/{id}/assessments`
- `GET /api/v1/assessments` — process-memory records, explicitly not user-owned history
- `GET /api/v1/assessments/{id}`
- `GET /api/v1/sources/status`
- `GET /api/v1/history` — owner-scoped; 503 when persistence is unconfigured, 401 without a valid bearer token

Unknown catchment → 404. Invalid timestamp or reversed range → 422. Oversized body → 413. Burst → 429. All carry a `request_id` where applicable.

## Baseline v0.1

Observed rainfall only. Latest contiguous 3-hour window is summed in millimetres. Thresholds: ≥100 `very_high`, ≥60 `high`, ≥25 `moderate`, else `low`. Missing → `insufficient_data`; stale → `insufficient_data`; gap → `degraded`. `score` is always `null`; `score_semantics` is `categorical_only_no_calibrated_index`. See `docs/EVALUATION.md`.

## Tests

```bash
python -m pytest -q
python -m compileall -q app tests
```

Last verified: **54 passed** (Python 3.12.3) and compile check passed. The suite includes `tests/test_rls_script.py`, which runs `scripts/rls_isolation_check.py` against an in-memory fake Supabase to prove its pass path, its failure path when owner scoping is broken, and its honest skip path without credentials. The script itself still needs a real configured project before RLS can be called verified.

## Limitations

No connector is configured or verified. No DEM, gauge, soil-moisture or forecast source exists. Subscriptions, ingestion and LLM explanation do not exist.

Supabase persistence and caller-token verification are implemented in `app/services/supabase.py` and covered by mocked HTTP tests, but **no live Supabase project was available**, so they are not verified. Without configuration, assessments stay in process memory and `/history` returns 503. A failed write returns the assessment with `persisted: false` instead of a false success. Do not describe this path as working until a live two-user check is recorded.
