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
- **Backend:** Python + FastAPI, implemented by Manus.
- **Database/auth:** Supabase PostgreSQL, Supabase Auth, optional Storage; PostGIS for catchment geometry.
- **Maps:** Google Maps JavaScript API with restricted browser key; backend supplies catchment GeoJSON and overlays.
- **Risk engine:** transparent baseline first, then evaluated gradient boosting if reliable historical event labels are available.
- **Optional AI:** Gemini may explain structured, source-backed results; it must not calculate the numerical score or invent official warnings.

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

See `docs/DATA_SOURCES.md` and `docs/EVALUATION.md`.

## Repository map

- `AGENTS.md` — shared rules for all AI agents.
- `docs/PRD.md` — product requirements and acceptance criteria.
- `docs/ARCHITECTURE.md` — architecture and API contracts.
- `docs/DATA_SOURCES.md` — data-source feasibility.
- `docs/EVALUATION.md` — model evaluation and safety requirements.
- `docs/AGENT_TASK_MATRIX.md` — workstream ownership.
- `prompts/` — prompts for Figma, Manus, Claude and reviewers.
- `supabase/migrations/` — versioned database schema.
- `.env.example` — environment variable names; never put secrets here.

## Setup status

This repository currently contains the project plan and schema bootstrap. The application runtime is not yet implemented. Follow `docs/REPO_SETUP.md` when available and update README setup commands only after they have been tested.

## Collaboration

- `main` is the reviewed source of truth.
- Every agent must read `AGENTS.md` and relevant docs before coding.
- Use task-specific branches and pull requests; do not directly overwrite another agent's work.
- Never commit credentials, protected data, raw datasets or undocumented model weights.
- Report exact commands/tests and distinguish verified integrations from placeholders.

## Safety and limitations

Operational warnings require regional validation, representative historical event labels, calibration, false-alarm and lead-time testing, reliable data-provider arrangements, and review by relevant authorities. A prototype cannot claim operational reliability based on a plausible dashboard alone.