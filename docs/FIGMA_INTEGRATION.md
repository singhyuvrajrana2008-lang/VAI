# Figma integration status

## Current state

The separately hosted Figma / Figma Make project was **not accessible** from this workspace. It is not present in the repository, the worktree, or any file provided to the agent. No Figma export was read, imported or merged, and no claim is made that its design was integrated.

`docs/FIGMA_HANDOFF.md` remains the design contract that the implemented VAI frontend follows (palette, typography, page compositions, responsive rules, data-state language). The working application in `frontend/` was completed against that contract and the product requirements, not against unseen Figma code.

## If the owner later wants the Figma source merged

1. Export from Figma Make as a code bundle (or provide the generated React project archive) and place it outside tracked source, e.g. `_import/figma-export/` (add that path to `.gitignore` until reviewed).
2. Share the export path with the agent. It must be readable inside the workspace; a hosted URL alone is not enough unless it returns source files.
3. Compare, do not replace: keep the existing routes, typed API client, auth boundary and demo-data honesty rules. Map Figma components onto them rather than copying a second router or duplicate API layer.
4. Preserve the current contract:
   - `/` public landing, `/overview` console, `/assessments` list, `/assessments/new` request.
   - `is_demo` labels, unavailable-vs-empty warning semantics, null score handling.
   - No service-role key or `VITE_` secret; no invented geometry, values or metrics.
5. Run the full check set after integration: backend pytest, frontend typecheck/tests/build, plus the HTTP smoke checks in the README.

## What should not happen

- Do not import a second design system that duplicates the existing tokens.
- Do not delete working provenance, evidence or accessibility behaviour just to match a visual comp.
- Do not present a Figma mock as evidence that a provider, model or database works.
