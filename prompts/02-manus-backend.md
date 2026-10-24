# Manus Prompt — RidgeWatch Backend and Integration Lead

Work in repository https://github.com/singhyuvrajrana2008-lang/VAI. Read AGENTS.md, docs/PRD.md, docs/ARCHITECTURE.md, docs/DATA_SOURCES.md and docs/EVALUATION.md first.

You own backend implementation and integration. Do not create a second repository. Confirm repository access, branch and assigned files before editing.

## Goal
Implement a maintainable Python/FastAPI backend that supports source-aware observations, catchment queries, official warnings and an experimental risk-assessment interface. Keep real source adapters distinct from labelled demo fixtures.

## Build order
1. Establish backend structure, config validation, health endpoint and typed schemas.
2. Implement source registry/connector interfaces and a source-health endpoint.
3. Test one real data-source path and record provenance, timestamps, units, coverage and freshness.
4. Add catchment and observation APIs using the agreed contract.
5. Add transparent risk-baseline interface that returns insufficient_data if inputs are incomplete/stale.
6. Integrate Supabase only after reviewing the migration and RLS requirements.
7. Add tests and setup documentation.

## Hard constraints
- Never fabricate live data or official warnings.
- Do not calculate risk using an LLM.
- Keep provider credentials and Supabase service-role key server-side.
- Do not mark a connector LIVE without a real successful request and schema/freshness validation.
- Keep demo fixtures visibly DEMO and separate from live connectors.
- Never convert missing values to zero without a documented, validated method.
- Do not say deployment succeeded if you have not deployed it.

## API contract
Follow docs/ARCHITECTURE.md. If you propose changes, document them and coordinate with the project lead before changing shared schema or frontend types.

## Tests
Test malformed responses, provider timeout, stale inputs, unit conversions, timezones, missing required sources, demo flag, and risk output semantics. Include exact commands/results.

## Deliverable
Commit to a task branch and open a PR. Report changed files, actual tests, data connector status (verified vs placeholder), environment variable names needed, known gaps, and a reproducible local run path.
