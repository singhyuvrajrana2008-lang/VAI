# Agent Task Matrix

All work stays in repository singhyuvrajrana2008-lang/VAI. Read AGENTS.md first. The human project lead approves shared contracts and merges work.

## Figma / Figma Make — visual design
Own: design tokens, typography, page layouts, interaction patterns, map-first dashboard, responsive states and visual refinement.
Do not: invent data, implement backend logic, or duplicate pages using a generic card template.
Deliver: approved screen inventory, component/state specification and handoff assets. Frontend code must land in the shared repository rather than a second repo.

## Manus — backend, data feasibility and ML evaluation
Manus now owns both the original backend work and the data/ML work previously assigned to Claude.

Own:
- FastAPI services, typed API contracts and provider adapters.
- Data-source feasibility research and source-access verification.
- Selecting a pilot catchment based on verified data coverage.
- Historical flood-event label research and feasibility decision for supervised ML.
- Data ingestion/normalisation, provenance, freshness and GIS feature engineering.
- Transparent baseline first; evaluate gradient boosting only if labels and event counts justify it.
- Temporal/event holdout evaluation, leakage prevention, false-alarm analysis and lead-time reporting.
- Supabase integration, API docs, tests and deployment configuration.

Do not:
- Invent data, historical labels, access credentials or metrics.
- Mark a connector LIVE without a real successful request and schema/freshness validation.
- Train on synthetic labels or use future information in model features.
- Treat missing or stale inputs as low risk.
- Silently switch LIVE/DEMO or edit shared contracts without review.

Deliver:
- Tested backend foundation.
- `docs/DATA_FEASIBILITY_REPORT.md`.
- Evidence-backed recommended pilot catchment and data connector.
- Reproducible feature/ML evaluation only if data feasibility supports it.
- Updated `docs/EVALUATION.md` when protocol changes are justified.
- Clear report of verified integrations, placeholders, tests and gaps.

## ChatGPT — reviewer and planning
Own: requirements review, architecture challenge, safety review, integration test design and prioritised findings.
Do not: claim tests or external integrations succeeded without evidence.
Deliver: review findings by severity with exact file/path and concrete fixes.

## Human project lead
Own: product decisions, pilot-catchment choice, approvals, shared schema, priorities and final acceptance. Ensure every agent uses the same repo and no work is lost between workspaces.

## Work boundaries
- Frontend design/handoff: Figma; implementation can be owned by a designated frontend coder.
- Backend and data/ML: Manus.
- Supabase migrations: coordinate and review before changing.
- Shared API contracts and env variables: only change with cross-workstream agreement.
- Integration/QA: tests, release checks and CI.
- The former Claude-only data/ML task is consolidated into Manus's assignment; do not create duplicate workstreams.