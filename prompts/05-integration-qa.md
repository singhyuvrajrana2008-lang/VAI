# Integration and Release QA Prompt

Read AGENTS.md, the PRD, architecture, source docs, current branches and open PRs. Work in the shared VAI repository. Do not refactor everything; start with the highest-risk end-to-end path.

## Acceptance path
1. App clearly shows DEMO/LIVE status.
2. Map displays validated or clearly marked demo catchment geometry.
3. Selecting a catchment queries the backend.
4. API response includes source timestamps, freshness and quality status.
5. Observations and official warnings are presented separately.
6. Missing/stale inputs cause visible degraded/insufficient-data status.
7. Risk result traces to versioned calculation and source evidence.
8. Supabase persistence works if configured and RLS is tested.
9. Optional AI narrative only explains structured evidence.
10. Every demo fixture is labelled.

## Test
Run tests/typecheck/lint where implemented and record exact commands and output. Add tests for empty/malformed provider responses, timeouts, stale records, duplicate timestamps, unit conversions, timezone handling, demo mode, authentication, and RLS where possible. Scan for committed secrets and inspect UI/README claims.

Report release blockers, passing/failing tests, verified connectors versus placeholders, setup steps, known gaps and a short demo script. Do not claim the product is operationally safe.
