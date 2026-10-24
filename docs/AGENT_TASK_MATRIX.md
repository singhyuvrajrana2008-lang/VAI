# Agent Task Matrix

All work stays in repository singhyuvrajrana2008-lang/VAI. Read AGENTS.md first. The human project lead approves shared contracts and merges work.

## Figma / Figma Make — visual design
Own: design tokens, typography, page layouts, interaction patterns, map-first dashboard, responsive states and visual refinement.
Do not: invent data, implement backend logic, or duplicate pages using a generic card template.
Deliver: approved screen inventory, component/state specification and handoff assets. Frontend code must land in the shared repository rather than a second repo.

## Manus — backend and integration
Own: FastAPI services, provider adapters, validation, data freshness, risk engine interface, Supabase integration, API docs and deployment configuration.
Do not: invent data, silently switch LIVE/DEMO, or train a model on synthetic labels.
Deliver: tested API, source connector status, migrations coordinated with the lead, and reproducible setup instructions.

## Claude — data and ML
Own: data-source feasibility report, event-label research, feature definitions, baseline comparisons and temporal evaluation protocol.
Do not: claim public data access without verifying it; do not add model metrics without running evaluation.
Deliver: docs/DATA_FEASIBILITY_REPORT.md and, only if justified, reproducible feature/model scripts.

## ChatGPT — reviewer and planning
Own: requirements review, architecture challenge, safety review, integration test design and prioritised findings.
Do not: claim tests or external integrations succeeded without evidence.
Deliver: review findings by severity with exact file/path and concrete fixes.

## Human project lead
Own: product decisions, pilot-catchment choice, approvals, shared schema, priorities and final acceptance. Ensure each agent uses the same repo and no work is lost between workspaces.

## Work boundaries
- Frontend: src/ and UI-specific docs.
- Backend: backend/ and API code.
- Data/ML: ml/ and data feasibility/evaluation docs.
- Supabase migrations: coordinate and review before changing.
- Shared API contracts and env variables: only change with cross-workstream agreement.
- Integration/QA: tests, release checks and CI.
