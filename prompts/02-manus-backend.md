# Manus Prompt — RidgeWatch Backend, Data Feasibility and ML Lead

Repository: https://github.com/singhyuvrajrana2008-lang/VAI

You now own BOTH the backend foundation and the data/ML feasibility work previously assigned to Claude. Do not create a second repository or parallel task plan. Read `AGENTS.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATA_SOURCES.md`, `docs/EVALUATION.md`, `docs/AGENT_TASK_MATRIX.md`, and review PR #4 (`feat(backend): add RidgeWatch API foundation`) before coding.

## Working method
1. Confirm repository access, current branch and PR status.
2. Do not overwrite PR #4 or other work. Coordinate follow-up changes and use a separate branch named `feat/manus-data-ml` after the backend foundation is integrated, or base your branch on its head only if the project lead agrees.
3. Keep a small task plan in your response and use incremental commits.
4. Work in the shared VAI repository. If GitHub access is unavailable, state that clearly and return patch-ready files rather than claiming a push.

## Phase 1 — data feasibility report (first)
Create `docs/DATA_FEASIBILITY_REPORT.md` before training a model.

Investigate authoritative sources and verify practical access:
- IMD API reference: https://api.imd.gov.in/public/api_reference.html
- NASA GPM IMERG: https://gpm.nasa.gov/data/imerg
- Copernicus DEM GLO-30: https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- CWC / India-WRIS / state/local river and gauge feeds where accessible.
- Suitable soil-moisture observations with realistic resolution/cadence.
- Historical flash-flood event labels with source, event date, location, label definition and usable provenance.

For every source, document exact product/endpoint, access/authentication, actual test result versus documentation-only claim, spatial/temporal resolution, latency, update cadence, units, historical availability, licence/attribution, cache rules, missingness, failure modes and how the product would be used.

Recommend a pilot catchment in Himachal Pradesh only on evidence: geometry coverage, rainfall source coverage, terrain availability, event-label availability and a defensible evaluation period.

Explicitly account for latency: a satellite product that arrives hours later cannot be used as if it were available for a minute-scale real-time prediction. Separate near-real-time, delayed/reprocessed and static data.

Conclude with GO / CONDITIONAL GO / NO-GO for supervised ML and recommend the first real connector. Do not invent access, readings or event labels.

## Phase 2 — backend foundation follow-up
Review existing FastAPI backend under `backend/` and PR #4. Preserve the typed API contracts, explicit unavailable states, demo labelling and insufficient-data baseline. Do not rewrite the whole backend.

After Phase 1 report:
- Integrate one verified real source connector where access and terms permit.
- Preserve source IDs, provider, value/unit, observation/issue time, fetch time, coverage, freshness and quality flags.
- Add integration/contract tests and source health.
- Wire Supabase only after checking migration/RLS and keep service-role keys server-side.
- Update README with what is verified versus still unavailable.

## Phase 3 — risk baseline and ML decision
Start with a transparent, versioned baseline. Define the target label, forecast horizon, prediction cut-off and observation cadence.

Only train a model if verified historic event labels and adequate independent event count exist.
- Compare simple rainfall threshold and persistence baseline before a more complex model.
- Consider logistic regression or gradient boosting if data permits.
- Do not default to LSTM.
- Use chronological and event-level holdout; spatial holdout where feasible.
- Prevent leakage from future data, revised satellite products, post-event observations or warning text that reveals the label.
- Report event-level precision/recall, PR-AUC if appropriate, false alarms per catchment-day, lead time, data coverage, calibration only if performed, and limitations.
- If labels are insufficient, stop model training and recommend a transparent experimental baseline.

## Safety and data rules
- Never fabricate live rainfall, river levels, official warnings, catchments or model metrics.
- Every fixture is visibly DEMO and carries `is_demo=true`.
- Missing/stale inputs produce `insufficient_data` or `degraded`, never a fabricated LOW state.
- Official warnings remain distinct from RidgeWatch estimates.
- An LLM may explain structured evidence, but it cannot calculate or alter the numerical risk score.
- Never describe this as an operational evacuation or warning service.

## Acceptance and handoff
PR(s) must include:
- Data feasibility report and evidence.
- Source connector status: verified LIVE / DEMO / unavailable / not tested.
- Tests actually executed and their outputs.
- Branch/PR URLs and changed files.
- Model or baseline methodology, validation results if any, and caveats.
- Required environment variable names only (never secrets).
- Local reproduction steps.
- Remaining blockers and concrete next steps.

Work in small increments and ask for approval before changing shared API/schema contracts.