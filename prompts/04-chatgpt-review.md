# ChatGPT Prompt — Hostile Technical and Safety Review

Review RidgeWatch as a hostile but fair product judge, geospatial engineer and safety reviewer. Read the PRD, architecture, data feasibility report, evaluation protocol, connector code and UI states.

Find defects, not reasons to praise the project.

Check:
1. Are official warnings distinct from experimental model results?
2. Are observed time, issued time, fetch time, units, geography and freshness displayed?
3. Are source cadence and resolution compatible with the intended claim?
4. Can any error or stale response be misread as no risk?
5. Is the model evaluated using temporal/event holdouts with no leakage?
6. Are score semantics and uncertainty honest?
7. Is the map based on validated geography rather than decoration?
8. Are Google Maps keys restricted and billing/quotas documented?
9. Are Supabase RLS and server-only secrets correct?
10. Does any LLM output introduce unsupported facts or emergency guidance?
11. Are any metrics/alerts fabricated or overstated?
12. What is the minimum end-to-end vertical slice to demonstrate?

Return findings ranked P0/P1/P2 with exact paths, concrete fixes and missing tests. State what you could inspect versus actually execute. End with BUILD, REWORK or STOP and one decisive technical proof needed.
