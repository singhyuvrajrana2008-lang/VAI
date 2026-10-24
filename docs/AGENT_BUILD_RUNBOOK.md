# RidgeWatch Agent Build Runbook

## Target
Produce a runnable MVP in the existing repository: https://github.com/singhyuvrajrana2008-lang/VAI

## Prompts
- Figma Make: `prompts/08-figma-mvp-build.md`
- Manus: `prompts/09-manus-finish-mvp.md`
- Shared rules: `AGENTS.md`

## Parallel execution
1. Figma Make works only in `frontend/` and the Figma handoff doc, on branch `feat/ridgewatch-frontend`.
2. Manus owns `backend/`, data-feasibility documentation, source connectors, Supabase integration and model feasibility. Continue PR #4 / `feat/backend-foundation` when safe, or use a scoped follow-up branch with the existing foundation included.
3. Both read the same PRD/API contract and report branch/PR URLs. Never create a competing repository.
4. If Figma's current account lacks "Make in your local codebase" access, standard Figma Make push cannot target the user-created VAI repo. Do not allow Figma to create another repo and call it shared. Export the frontend and have Manus integrate it into `frontend/`, or enable the supported existing-codebase workflow.
5. Keep code in feature branches and PRs. Do not merge into main without review.

## Definition of finished MVP
- Frontend builds and has a coherent map-first flow.
- Backend runs and serves the contract.
- UI consumes real API responses.
- Source state and data freshness are visible.
- No fabricated LIVE values; demo is labelled.
- Official warnings are separate from the experimental assessment.
- Missing/stale data returns insufficient-data/degraded.
- Supabase is genuinely connected if claimed, with RLS considered; otherwise the UI/API says persistence is unavailable.
- At least one external data source is verified, or limitations are explicit.
- Build/tests run and exact results are documented.

## No false promises
Thirty minutes is a target work session, not a guarantee of completion. Credentials, data-access constraints and tool availability may block live integrations. A polished demo is not equivalent to an operational flood-warning service.
