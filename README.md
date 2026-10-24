# RidgeWatch — Flash-Flood Risk Intelligence for Hilly Regions

> Catchment-level monitoring and experimental risk assessment using rainfall, terrain, soil-wetness proxies, hydrology observations and official weather warnings.

**Status:** early prototype / decision-support research project. **Not an operational warning service.** Never use this software to decide whether to evacuate or to replace official IMD, district administration, CWC or disaster-management instructions.

## Mission
RidgeWatch aims to combine multi-source environmental data into a transparent, catchment-level flash-flood risk assessment, explain which inputs drove the assessment, and help authorised users inspect current conditions. Start with one data-verified Himalayan catchment in Himachal Pradesh. Do not label a catchment as live until its geometry, input coverage, freshness and validation status have been checked.

## Product principles
1. Every observation includes provider, observation time, fetch time, units, spatial coverage and freshness.
2. Official warnings are displayed separately from experimental model outputs.
3. Missing, stale or unavailable data is visible; it is never silently replaced with invented values.
4. A model score is not a probability unless it has been calibrated and evaluated.
5. Mock or synthetic data must be marked `DEMO` in the interface and API.
6. Google Maps shows geography; hydrological calculations belong in the backend.
7. No automated evacuation instructions or authoritative emergency declarations in the MVP.

## Planned stack
- **Frontend/design:** Figma/Figma Make → React + TypeScript.
- **Backend, data feasibility and ML evaluation:** Manus → Python + FastAPI, verified data connectors, GIS feature preparation and baseline/model evaluation.
- **Database/auth:** Supabase PostgreSQL, Supabase Auth, optional Storage; PostGIS for catchment geometry.
- **Maps:** Google Maps JavaScript API with restricted browser key; backend supplies catchment GeoJSON and overlays.
- **Risk engine:** transparent baseline first, then evaluated gradient boosting only if reliable historical event labels are available.
- **Optional AI:** Gemini may explain structured, source-backed results; it must not calculate the numerical score or invent official warnings.
- **Independent review:** ChatGPT reviews architecture, safety and tests.

## MVP scope
1. Map-first dashboard for one validated pilot catchment.
2. Catchment selection and status panel.
3. Rainfall time series and available forecast summaries.
4. Terrain/context information only when backed by actual data.
5. Experimental catchment risk assessment with reason codes and freshness indicators.
6. Separate official warning panel when an official source response is available.
7. Alert/event history and source health.
8. Supabase persistence and row-level security.
9. Clearly labelled demo mode when providers are unavailable.
10. Evaluation report covering baselines, temporal holdout, missed events, false alarms and limitations.

## Candidate data sources
These are candidates requiring verification in the deployment environment, not confirmed integrations:
- IMD API reference: https://api.imd.gov.in/public/api_reference.html
- NASA GPM IMERG: https://gpm.nasa.gov/data/imerg
- Copernicus DEM GLO-30: https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- CWC / India-WRIS / local gauge feeds: investigate availability, rights and latency before depending on them.

See `docs/DATA_SOURCES.md`, `docs/EVALUATION.md`, `docs/AGENT_BUILD_RUNBOOK.md` and Manus's forthcoming `docs/DATA_FEASIBILITY_REPORT.md`.

## Repository map
- `AGENTS.md` — shared rules for all agents.
- `docs/PRD.md` — requirements and acceptance criteria.
- `docs/ARCHITECTURE.md` — architecture and API contracts.
- `docs/DATA_SOURCES.md` — candidate data sources and verification gates.
- `docs/EVALUATION.md` — model evaluation and safety requirements.
- `docs/AGENT_TASK_MATRIX.md` — workstream ownership.
- `prompts/01-figma-design.md` — Figma design.
- `prompts/02-manus-backend.md` — initial backend foundation.
- `prompts/03-manus-data-ml.md` — active data/ML feasibility and modelling task.
- `prompts/04-chatgpt-review.md` — independent reviewer.
- `prompts/05-integration-qa.md` — integration tests and release QA.
- `prompts/06-visual-refinement.md` — visual differentiation.
- `prompts/07-github-shared-repo-workflow.md` — collaboration.
- `prompts/08-figma-mvp-build.md` — complete Figma Make frontend build prompt.
- `prompts/09-manus-finish-mvp.md` — backend, data feasibility, integration and evaluation build prompt.
- `docs/AGENT_BUILD_RUNBOOK.md` — coordinated parallel execution plan.
- `supabase/migrations/` — versioned database schema.
- `.env.example` — variable names only; never put secrets here.

## Setup status
The backend foundation exists in PR #4 and remains separate from `main` until reviewed/merged. See `docs/AGENT_BUILD_RUNBOOK.md` for how Figma and Manus should work on separate paths in the same repository. The full application, live provider connectors and validated flood-prediction model are not yet complete. Update setup instructions only after commands have actually been tested.

## Collaboration
- `main` is the reviewed source of truth.
- Every agent reads `AGENTS.md` and relevant docs before coding.
- Figma owns visual design/handoff; Manus owns backend plus former Claude data/ML work; ChatGPT provides independent review.
- Use task branches and pull requests; do not overwrite another agent's work.
- Never commit credentials, protected data, raw datasets or undocumented model weights.
- Report exact tests and separate verified integrations from placeholders.

## Safety and limitations
Operational warnings require regional validation, representative historical event labels, calibration, false-alarm and lead-time testing, reliable data-provider arrangements and review by relevant authorities. A prototype cannot claim operational reliability based on a plausible dashboard alone.