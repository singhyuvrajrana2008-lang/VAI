# Shared instructions for all AI agents

Read this file plus docs/PRD.md, docs/ARCHITECTURE.md, docs/DATA_SOURCES.md and docs/EVALUATION.md before starting work.

## Mission
Build RidgeWatch, a traceable catchment-level flash-flood risk decision-support prototype for hilly regions. This is not an official early-warning system.

## Non-negotiable rules
1. Never fabricate weather observations, river gauges, official warnings, risk values, timestamps, provenance, model metrics or historical events.
2. Any mock, static or synthetic data must carry is_demo=true in API responses and a visible DEMO label in the UI.
3. Keep official IMD/CWC/authority warnings separate from RidgeWatch experimental risk estimates.
4. An LLM may explain structured evidence but must not calculate the numeric risk score or invent emergency advice.
5. Do not claim predictive accuracy, lead time, calibration or probability without documented evaluation.
6. Do not present experimental output as evacuation instructions or as a replacement for official guidance.
7. Never commit credentials. Supabase service-role keys and private provider credentials are server-only.
8. Data records must carry provider, observed/issued time, fetch time, units, geographic coverage and freshness/status where applicable.
9. Missing, stale, inconsistent or unavailable data must be handled explicitly; never silently treat it as zero risk.
10. Keep changes scoped to the assigned workstream. Avoid broad rewrites and preserve shared API/database contracts.
11. Do not claim a test, live data request or model evaluation passed unless it was actually executed and evidence is recorded.
12. Check licences, attribution, quotas, terms and access/authentication requirements before relying on a data provider.
13. Do not begin supervised model training until the historical-event labels, prediction horizon, feature cut-off and evaluation plan have been verified.
14. Satellite products with processing latency must not be represented as real-time observations if their data would not have been available at prediction time.

## Source of truth
- Product requirements: docs/PRD.md
- Architecture/API contracts: docs/ARCHITECTURE.md
- Data source qualification: docs/DATA_SOURCES.md
- Evaluation rules: docs/EVALUATION.md
- Agent ownership: docs/AGENT_TASK_MATRIX.md
- Database schema: supabase/migrations/0001_initial_schema.sql

If implementation conflicts with these documents, explain the conflict and propose a small explicit change. Do not silently redefine the contract.

## Current ownership
- Figma/Figma Make owns visual design and frontend handoff.
- Manus owns backend, integrations, data-source feasibility, data engineering, GIS feature preparation, baseline/model feasibility and ML evaluation. The work previously assigned to Claude is transferred to Manus.
- ChatGPT provides independent architecture, safety and integration review.
- Human project lead owns priorities, pilot-catchment selection, approvals and acceptance.
- Do not start a separate Claude workstream unless the project lead explicitly reassigns one.

## Git workflow
- Repository: singhyuvrajrana2008-lang/VAI
- main is the reviewed source of truth.
- Use task branches: feat/<task>, data/<task>, docs/<task>, fix/<task>.
- Pull latest main before work; commit only assigned files; open a pull request.
- Do not directly push to main unless the project lead explicitly asks for a one-time bootstrap/docs commit.
- Do not create a second repository or copy the project elsewhere.
- Do not overwrite or revert another agent's work.
- Keep commits small and focused. Include tests and limitations in pull requests.

## Shared contracts
- Frontend owns map display and user interactions. Backend owns data retrieval, geospatial calculations and risk calculation.
- Supabase persists user/workspace state, source observations, assessments, subscriptions and event history according to schema/RLS.
- Google Maps is for geography and interaction, not a source of hydrological measurements.
- Demo data must be distinguishable from real observations end to end.
- Risk outputs must include status, issue time, data coverage/freshness, supporting evidence and reason codes.
- Official alerts must include their source, issued time, valid period and geography when available.

## Completion report
Every agent must report:
1. Branch and changed files.
2. What was implemented versus left as a placeholder.
3. Exact tests/commands actually run and their results.
4. Required environment variables and secrets by name only.
5. Known failures, assumptions, data gaps and limitations.
6. A short reproducible manual verification flow.